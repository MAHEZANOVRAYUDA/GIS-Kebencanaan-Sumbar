import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, case
from app.core.database import get_async_db
from app.models.wilayah import WilayahAdministratif
from app.models.bencana import KejadianBencana, DataDampakBencana
from app.schemas.wilayah import (
    WilayahSummary,
    WilayahLookupResponse,
    WilayahDampakResponse,
    KejadianRingkas,
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    ErrorResponse
)

router = APIRouter(prefix="/wilayah", tags=["Wilayah Administratif"])

@router.get("", response_model=List[WilayahSummary])
async def list_wilayah(
    level: Optional[str] = Query(None, description="Filter tingkat wilayah: provinsi, kabupaten, kecamatan, nagari"),
    parent_id: Optional[int] = Query(None, description="Filter berdasarkan ID wilayah induk"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Daftar wilayah administratif Sumatera Barat dengan filter fleksibel.
    Mengembalikan metadata atribut non-geometri untuk performa cepat.
    """
    query = select(WilayahAdministratif)
    
    if level:
        query = query.where(WilayahAdministratif.level == level)
    if parent_id is not None:
        query = query.where(WilayahAdministratif.parent_id == parent_id)
        
    query = query.order_by(WilayahAdministratif.kode_wilayah)
    result = await db.execute(query)
    wilayah_list = result.scalars().all()
    
    return [
        WilayahSummary(
            id=w.id,
            kode_wilayah=w.kode_wilayah,
            nama=w.nama,
            level=w.level,
            parent_id=w.parent_id,
            populasi=w.populasi
        )
        for w in wilayah_list
    ]


@router.get("/lookup", response_model=WilayahLookupResponse, responses={404: {"model": ErrorResponse}})
async def lookup_wilayah(
    lat: float = Query(..., ge=-5.0, le=5.0, description="Koordinat lintang (latitude) titik klik"),
    lon: float = Query(..., ge=95.0, le=105.0, description="Koordinat bujur (longitude) titik klik"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Drill-down wilayah: Menemukan wilayah administratif dari koordinat klik menggunakan PostGIS ST_Contains.
    Memprioritaskan level 'kecamatan', kemudian 'kabupaten'.
    Mengembalikan metadata wilayah, nama kabupaten induk, dan titik pusat (centroid) poligon.
    """
    sql = text("""
        SELECT 
            w.id, 
            w.kode_wilayah, 
            w.nama, 
            w.level, 
            w.parent_id, 
            p.nama AS parent_nama,
            w.populasi,
            ST_X(ST_Centroid(w.geom)) AS center_lon,
            ST_Y(ST_Centroid(w.geom)) AS center_lat
        FROM wilayah_administratif w
        LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
        WHERE ST_Contains(w.geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
        ORDER BY 
            CASE 
                WHEN w.level = 'kecamatan' THEN 1
                WHEN w.level = 'kabupaten' THEN 2
                ELSE 3
            END ASC
        LIMIT 1;
    """)
    
    result = await db.execute(sql, {"lon": lon, "lat": lat})
    row = result.first()
    
    if not row:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": {
                    "code": "WILAYAH_NOT_FOUND",
                    "message": f"Tidak ditemukan wilayah administratif pada koordinat ({lat}, {lon}). Pastikan titik berada dalam cakupan Sumatera Barat."
                }
            }
        )
        
    return WilayahLookupResponse(
        id=row.id,
        kode_wilayah=row.kode_wilayah,
        nama=row.nama,
        level=row.level,
        parent_id=row.parent_id,
        parent_nama=row.parent_nama,
        populasi=row.populasi,
        center={"lat": float(row.center_lat), "lng": float(row.center_lon)}
    )


@router.get("/choropleth", response_model=GeoJSONFeatureCollection)
@router.get("/geojson", response_model=GeoJSONFeatureCollection)
async def get_choropleth(
    level: str = Query("kecamatan", description="Level wilayah administratif untuk choropleth"),
    jenis_bencana: Optional[str] = Query(None, description="Filter jenis bencana spesifik"),
    tahun: Optional[int] = Query(None, description="Filter tahun kejadian"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    ========================================================================================
    TODO: [11-optimasi-performa.md] VERSI PROTOTIPE CEPAT (GeoJSON Langsung).
    Endpoint ini menyajikan poligon wilayah dan total kerugian dalam format GeoJSON FeatureCollection
    langsung untuk kebutuhan visualisasi data cepat dan demo awal LPPM / BPBD Sumbar.
    
    Sebelum rilis produksi final, endpoint ini WAJIB digantikan/dialihkan ke rute Vector Tile MVT:
    GET /api/tiles/choropleth/{z}/{x}/{y}.mvt yang memanfaatkan fungsi native ST_AsMVT & ST_AsMVTGeom
    hasil pre-build untuk meminimalkan beban transfer jaringan per klien.
    ========================================================================================
    """
    # Jika tanpa filter dinamis, baca agregat langsung dari materialized view mv_dampak_per_kecamatan
    if not jenis_bencana and not tahun:
        sql = text("""
            SELECT 
                w.id,
                w.kode_wilayah,
                w.nama,
                w.level,
                p.nama AS parent_nama,
                COALESCE(mv.total_kerugian, 0) AS total_kerugian,
                COALESCE(mv.total_meninggal, 0) AS total_meninggal,
                COALESCE(mv.total_luka, 0) AS total_luka,
                COALESCE(mv.total_terdampak, 0) AS total_terdampak,
                COALESCE(mv.jumlah_kejadian, 0) AS jumlah_kejadian,
                ST_AsGeoJSON(w.geom) AS geojson_geom
            FROM wilayah_administratif w
            LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
            LEFT JOIN mv_dampak_per_kecamatan mv ON mv.wilayah_id = w.id
            WHERE w.level = :level
            ORDER BY w.nama ASC;
        """)
        params: Dict[str, Any] = {"level": level}
    else:
        # Jika filter aktif, letakkan filter pada klausul ON LEFT JOIN agar seluruh poligon kecamatan
        # tetap tampil di peta (dengan total_kerugian = 0 untuk wilayah yang tidak terdampak)
        join_filters = []
        params = {"level": level}
        
        if jenis_bencana and jenis_bencana != "semua":
            join_filters.append("k.jenis_bencana = :jenis_bencana")
            params["jenis_bencana"] = jenis_bencana
            
        if tahun:
            join_filters.append("EXTRACT(YEAR FROM k.tanggal_kejadian) = :tahun")
            params["tahun"] = tahun

        k_join_extra = f" AND {' AND '.join(join_filters)}" if join_filters else ""
        
        sql = text(f"""
            SELECT 
                w.id,
                w.kode_wilayah,
                w.nama,
                w.level,
                p.nama AS parent_nama,
                COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
                COALESCE(SUM(d.korban_meninggal), 0) AS total_meninggal,
                COALESCE(SUM(d.korban_luka), 0) AS total_luka,
                COALESCE(SUM(d.penduduk_terdampak), 0) AS total_terdampak,
                COUNT(DISTINCT k.id) AS jumlah_kejadian,
                ST_AsGeoJSON(w.geom) AS geojson_geom
            FROM wilayah_administratif w
            LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
            LEFT JOIN kejadian_bencana k ON k.wilayah_id = w.id{k_join_extra}
            LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
            WHERE w.level = :level
            GROUP BY w.id, w.kode_wilayah, w.nama, w.level, p.nama, w.geom
            ORDER BY w.nama ASC;
        """)

    result = await db.execute(sql, params)
    rows = result.fetchall()

    features = []
    for r in rows:
        geom = json.loads(r.geojson_geom) if r.geojson_geom else None
        kerugian = float(r.total_kerugian)
        meninggal = int(r.total_meninggal)
        
        # Penentuan klasifikasi risiko
        if kerugian >= 1_500_000_000 or meninggal > 0:
            tingkat = "tinggi"
        elif kerugian >= 400_000_000:
            tingkat = "sedang"
        else:
            tingkat = "rendah"

        features.append(
            GeoJSONFeature(
                type="Feature",
                geometry=geom,
                properties={
                    "id": r.id,
                    "kode_wilayah": r.kode_wilayah,
                    "nama": r.nama,
                    "level": r.level,
                    "parent_nama": r.parent_nama or "Sumatera Barat",
                    "total_kerugian": kerugian,
                    "total_meninggal": meninggal,
                    "total_luka": int(r.total_luka),
                    "total_terdampak": int(r.total_terdampak),
                    "jumlah_kejadian": int(r.jumlah_kejadian),
                    "tingkat_risiko": tingkat
                }
            )
        )

    return GeoJSONFeatureCollection(type="FeatureCollection", features=features)


@router.get("/{wilayah_id}/dampak", response_model=WilayahDampakResponse, responses={404: {"model": ErrorResponse}})
async def get_wilayah_dampak(
    wilayah_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Agregasi data dampak bencana wilayah administratif.
    Membaca langsung dari Materialized View mv_dampak_per_kecamatan (sesuai 02-database.md)
    untuk menjamin latensi respon sangat rendah tanpa JOIN berat per request.
    Dilengkapi rincian kerusakan fisik dan daftar kejadian terbaru.
    """
    # 1. Cek wilayah dan ambil data agregat dari matview
    sql_matview = text("""
        SELECT 
            w.id AS wilayah_id,
            w.nama,
            p.nama AS parent_nama,
            COALESCE(mv.total_kerugian, 0) AS total_kerugian,
            COALESCE(mv.total_meninggal, 0) AS total_meninggal,
            COALESCE(mv.total_luka, 0) AS total_luka,
            COALESCE(mv.total_terdampak, 0) AS total_terdampak,
            COALESCE(mv.jumlah_kejadian, 0) AS jumlah_kejadian,
            mv.terakhir_refresh
        FROM wilayah_administratif w
        LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
        LEFT JOIN mv_dampak_per_kecamatan mv ON mv.wilayah_id = w.id
        WHERE w.id = :wilayah_id;
    """)
    
    result = await db.execute(sql_matview, {"wilayah_id": wilayah_id})
    row = result.first()
    
    if not row:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": {
                    "code": "WILAYAH_NOT_FOUND",
                    "message": f"Wilayah administratif dengan ID {wilayah_id} tidak ditemukan."
                }
            }
        )

    # 2. Ambil rincian kerusakan fisik dari data_dampak_bencana
    sql_detail = text("""
        SELECT 
            COALESCE(SUM(d.jumlah_pengungsi), 0) AS pengungsi,
            COALESCE(SUM(d.rumah_rusak_berat), 0) AS r_berat,
            COALESCE(SUM(d.rumah_rusak_sedang), 0) AS r_sedang,
            COALESCE(SUM(d.rumah_rusak_ringan), 0) AS r_ringan,
            COALESCE(SUM(d.fasilitas_umum_rusak), 0) AS fasum,
            COALESCE(SUM(d.fasilitas_kesehatan_rusak), 0) AS faskes,
            COALESCE(SUM(d.sekolah_rusak), 0) AS sekolah
        FROM data_dampak_bencana d
        WHERE d.wilayah_id = :wilayah_id;
    """)
    det_res = await db.execute(sql_detail, {"wilayah_id": wilayah_id})
    det = det_res.first()

    # 3. Ambil daftar kejadian bencana terbaru untuk wilayah ini
    sql_kejadian = text("""
        SELECT id, jenis_bencana, tanggal_kejadian, deskripsi, status_verifikasi
        FROM kejadian_bencana
        WHERE wilayah_id = :wilayah_id
        ORDER BY tanggal_kejadian DESC
        LIMIT 5;
    """)
    k_res = await db.execute(sql_kejadian, {"wilayah_id": wilayah_id})
    kejadian_list = [
        KejadianRingkas(
            id=k.id,
            jenis_bencana=k.jenis_bencana,
            tanggal_kejadian=k.tanggal_kejadian,
            deskripsi=k.deskripsi,
            status_verifikasi=k.status_verifikasi
        )
        for k in k_res.fetchall()
    ]

    total_kerugian = float(row.total_kerugian)
    total_meninggal = int(row.total_meninggal)

    if total_kerugian >= 1_500_000_000 or total_meninggal > 0:
        tingkat = "tinggi"
    elif total_kerugian >= 400_000_000:
        tingkat = "sedang"
    else:
        tingkat = "rendah"

    return WilayahDampakResponse(
        wilayah_id=row.wilayah_id,
        nama=row.nama,
        parent_nama=row.parent_nama,
        total_kerugian=total_kerugian,
        total_meninggal=total_meninggal,
        total_luka=int(row.total_luka),
        total_terdampak=int(row.total_terdampak),
        jumlah_pengungsi=int(det.pengungsi) if det else 0,
        jumlah_kejadian=int(row.jumlah_kejadian),
        rumah_rusak_berat=int(det.r_berat) if det else 0,
        rumah_rusak_sedang=int(det.r_sedang) if det else 0,
        rumah_rusak_ringan=int(det.r_ringan) if det else 0,
        fasilitas_umum_rusak=int(det.fasum) if det else 0,
        fasilitas_kesehatan_rusak=int(det.faskes) if det else 0,
        sekolah_rusak=int(det.sekolah) if det else 0,
        terakhir_refresh=row.terakhir_refresh,
        tingkat_risiko=tingkat,
        kejadian_terbaru=kejadian_list
    )


@router.get("/{wilayah_id}", responses={404: {"model": ErrorResponse}})
async def get_wilayah_detail(
    wilayah_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Detail satu wilayah administratif lengkap dengan geometri GeoJSON standar.
    Sesuai kontrak API pada 03-backend-api.md.
    """
    query = select(
        WilayahAdministratif.id,
        WilayahAdministratif.kode_wilayah,
        WilayahAdministratif.nama,
        WilayahAdministratif.level,
        WilayahAdministratif.parent_id,
        WilayahAdministratif.populasi,
        func.ST_AsGeoJSON(WilayahAdministratif.geom).label("geojson_geom")
    ).where(WilayahAdministratif.id == wilayah_id)
    
    result = await db.execute(query)
    row = result.first()
    
    if not row:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": {
                    "code": "WILAYAH_NOT_FOUND",
                    "message": f"Wilayah administratif dengan ID {wilayah_id} tidak ditemukan dalam basis data."
                }
            }
        )
    
    geom_data = json.loads(row.geojson_geom) if row.geojson_geom else None

    return {
        "type": "Feature",
        "geometry": geom_data,
        "properties": {
            "id": row.id,
            "kode_wilayah": row.kode_wilayah,
            "nama": row.nama,
            "level": row.level,
            "parent_id": row.parent_id,
            "populasi": row.populasi
        }
    }
