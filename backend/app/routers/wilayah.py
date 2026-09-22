import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, status
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
    parent_id: Optional[int] = Query(None, description="Filter berdasarkan ID wilayah induk (contoh: ID kota/kabupaten)"),
    search: Optional[str] = Query(None, description="Filter pencarian nama wilayah atau nama induk"),
    kode_wilayah: Optional[str] = Query(None, description="Filter kode wilayah atau awalan kode wilayah"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Menyajikan poligon wilayah dan data agregasi kerugian dalam format GeoJSON FeatureCollection.
    Mendukung filter level wilayah, parent_id, kata kunci pencarian, serta filter bencana/tahun.
    """
    join_filters = []
    params: Dict[str, Any] = {"level": level}
    
    if jenis_bencana and jenis_bencana != "semua":
        join_filters.append("k.jenis_bencana = :jenis_bencana")
        params["jenis_bencana"] = jenis_bencana
        
    if tahun:
        join_filters.append("EXTRACT(YEAR FROM k.tanggal_kejadian) = :tahun")
        params["tahun"] = tahun

    k_join_extra = f" AND {' AND '.join(join_filters)}" if join_filters else ""
    
    where_conditions = ["w.level = :level", "w.geom IS NOT NULL"]
    if parent_id is not None:
        where_conditions.append("w.parent_id = :parent_id")
        params["parent_id"] = parent_id
    if kode_wilayah:
        where_conditions.append("(w.kode_wilayah LIKE :kode_prefix OR w.kode_wilayah = :kode_wilayah)")
        params["kode_prefix"] = f"{kode_wilayah}%"
        params["kode_wilayah"] = kode_wilayah
    if search:
        where_conditions.append("(w.nama ILIKE :search OR p.nama ILIKE :search)")
        params["search"] = f"%{search}%"
        
    where_sql = " AND ".join(where_conditions)
    
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
            ST_X(ST_Centroid(w.geom)) AS center_lon,
            ST_Y(ST_Centroid(w.geom)) AS center_lat,
            ST_AsGeoJSON(w.geom) AS geojson_geom
        FROM wilayah_administratif w
        LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
        LEFT JOIN wilayah_administratif child ON (child.parent_id = w.id OR child.id = w.id)
        LEFT JOIN kejadian_bencana k ON k.wilayah_id = child.id{k_join_extra}
        LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
        WHERE {where_sql}
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

        c_lat = float(r.center_lat) if r.center_lat is not None else None
        c_lon = float(r.center_lon) if r.center_lon is not None else None

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
                    "tingkat_risiko": tingkat,
                    "lat": c_lat,
                    "lon": c_lon,
                    "center_lat": c_lat,
                    "center_lon": c_lon
                }
            )
        )

    return GeoJSONFeatureCollection(type="FeatureCollection", features=features)


@router.get("/{wilayah_id}/dampak", response_model=WilayahDampakResponse)
async def get_dampak_wilayah_detail(
    wilayah_id: str = Path(..., description="ID wilayah administratif atau kode Kemendagri"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Menyajikan data terpadu dampak bencana untuk suatu wilayah administratif.
    Mendukung resolusi via ID serial, kode Kemendagri (misal '137105'), maupun relational mapping.
    """
    clean_str = str(wilayah_id).strip()
    is_num = clean_str.isdigit()
    num_val = int(clean_str) if is_num else -1

    # 1. Cek informasi dasar wilayah
    sql_wilayah = text("""
        SELECT 
            w.id,
            w.nama,
            w.level,
            w.parent_id,
            p.nama AS parent_nama,
            ST_X(ST_Centroid(w.geom)) AS center_lon,
            ST_Y(ST_Centroid(w.geom)) AS center_lat
        FROM wilayah_administratif w
        LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
        WHERE w.id = :num_val
           OR w.kode_wilayah = :clean_str
           OR w.kode_wilayah = :prefix_str
           OR (w.id = (SELECT wilayah_administratif_id FROM kecamatan WHERE id = :clean_str LIMIT 1))
        ORDER BY (w.geom IS NOT NULL) DESC, w.id ASC
        LIMIT 1;
    """)
    res_w = await db.execute(sql_wilayah, {
        "num_val": num_val,
        "clean_str": clean_str,
        "prefix_str": clean_str + "0"
    })
    w_row = res_w.first()

    if not w_row:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": {
                    "code": "WILAYAH_NOT_FOUND",
                    "message": f"Wilayah administratif dengan ID atau kode '{wilayah_id}' tidak ditemukan."
                }
            }
        )

    actual_id = w_row.id
    level = w_row.level

    # 2. Query Agregasi Bersih & Detail Berdasarkan Level Administrasi (Mencegah Double-Counting)
    if level == "provinsi":
        # Rollup menyeluruh untuk Provinsi Sumatera Barat (Direct dari data_dampak_bencana)
        sql_matview = text("""
            SELECT 
                COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
                COALESCE(SUM(d.korban_meninggal), 0) AS total_meninggal,
                COALESCE(SUM(d.korban_luka), 0) AS total_luka,
                COALESCE(SUM(d.penduduk_terdampak), 0) AS total_terdampak,
                COUNT(DISTINCT k.id) AS jumlah_kejadian,
                NOW() AS terakhir_refresh
            FROM data_dampak_bencana d
            JOIN kejadian_bencana k ON d.kejadian_id = k.id;
        """)
        mv_res = await db.execute(sql_matview)
        mv_data = mv_res.first()

        sql_detail = text("""
            SELECT 
                COALESCE(SUM(d.jumlah_pengungsi), 0) AS pengungsi,
                COALESCE(SUM(d.rumah_rusak_berat), 0) AS r_berat,
                COALESCE(SUM(d.rumah_rusak_sedang), 0) AS r_sedang,
                COALESCE(SUM(d.rumah_rusak_ringan), 0) AS r_ringan,
                COALESCE(SUM(d.fasilitas_umum_rusak), 0) AS fasum,
                COALESCE(SUM(d.fasilitas_kesehatan_rusak), 0) AS faskes,
                COALESCE(SUM(d.sekolah_rusak), 0) AS sekolah
            FROM data_dampak_bencana d;
        """)
        det_res = await db.execute(sql_detail)
        det = det_res.first()

        sql_kejadian = text("""
            SELECT id, jenis_bencana, tanggal_kejadian, deskripsi, status_verifikasi
            FROM kejadian_bencana
            ORDER BY tanggal_kejadian DESC
            LIMIT 5;
        """)
        k_res = await db.execute(sql_kejadian)
        center_coords = {"lat": -0.85, "lng": 100.4172}

    elif level == "kabupaten":
        # Rollup untuk tingkat Kabupaten/Kota (gabungan kabupaten dan seluruh kecamatan anak tanpa duplikasi)
        sql_matview = text("""
            SELECT 
                COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
                COALESCE(SUM(d.korban_meninggal), 0) AS total_meninggal,
                COALESCE(SUM(d.korban_luka), 0) AS total_luka,
                COALESCE(SUM(d.penduduk_terdampak), 0) AS total_terdampak,
                COUNT(DISTINCT k.id) AS jumlah_kejadian,
                NOW() AS terakhir_refresh
            FROM data_dampak_bencana d
            JOIN kejadian_bencana k ON d.kejadian_id = k.id
            JOIN wilayah_administratif w ON d.wilayah_id = w.id
            WHERE w.id = :wilayah_id OR w.parent_id = :wilayah_id;
        """)
        mv_res = await db.execute(sql_matview, {"wilayah_id": actual_id})
        mv_data = mv_res.first()

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
            JOIN wilayah_administratif w ON d.wilayah_id = w.id
            WHERE w.id = :wilayah_id OR w.parent_id = :wilayah_id;
        """)
        det_res = await db.execute(sql_detail, {"wilayah_id": actual_id})
        det = det_res.first()

        sql_kejadian = text("""
            SELECT id, jenis_bencana, tanggal_kejadian, deskripsi, status_verifikasi
            FROM kejadian_bencana
            WHERE wilayah_id = :wilayah_id
               OR wilayah_id IN (SELECT id FROM wilayah_administratif WHERE parent_id = :wilayah_id)
            ORDER BY tanggal_kejadian DESC
            LIMIT 5;
        """)
        k_res = await db.execute(sql_kejadian, {"wilayah_id": actual_id})
        c_lat = float(w_row.center_lat) if w_row.center_lat is not None else -0.85
        c_lon = float(w_row.center_lon) if w_row.center_lon is not None else 100.4172
        center_coords = {"lat": c_lat, "lng": c_lon}

    else:
        # Tingkat Kecamatan / granular langsung
        sql_matview = text("""
            SELECT 
                COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
                COALESCE(SUM(d.korban_meninggal), 0) AS total_meninggal,
                COALESCE(SUM(d.korban_luka), 0) AS total_luka,
                COALESCE(SUM(d.penduduk_terdampak), 0) AS total_terdampak,
                COUNT(DISTINCT k.id) AS jumlah_kejadian,
                NOW() AS terakhir_refresh
            FROM data_dampak_bencana d
            JOIN kejadian_bencana k ON d.kejadian_id = k.id
            WHERE d.wilayah_id = :wilayah_id;
        """)
        mv_res = await db.execute(sql_matview, {"wilayah_id": actual_id})
        mv_data = mv_res.first()

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
        det_res = await db.execute(sql_detail, {"wilayah_id": actual_id})
        det = det_res.first()

        sql_kejadian = text("""
            SELECT id, jenis_bencana, tanggal_kejadian, deskripsi, status_verifikasi
            FROM kejadian_bencana
            WHERE wilayah_id = :wilayah_id
            ORDER BY tanggal_kejadian DESC
            LIMIT 5;
        """)
        k_res = await db.execute(sql_kejadian, {"wilayah_id": actual_id})
        c_lat = float(w_row.center_lat) if w_row.center_lat is not None else -0.85
        c_lon = float(w_row.center_lon) if w_row.center_lon is not None else 100.4172
        center_coords = {"lat": c_lat, "lng": c_lon}

        # Cek data dampak terpusat pada kabupaten induk jika kecamatan tidak memiliki pencatatan granular langsung
        parent_dampak_info = None
        if w_row.parent_id:
            sql_parent = text("""
                SELECT 
                    COALESCE(SUM(d.korban_meninggal), 0) AS meninggal,
                    COALESCE(SUM(d.jumlah_pengungsi), 0) AS pengungsi,
                    COALESCE(SUM(d.kerugian_rp), 0) AS kerugian_rp
                FROM data_dampak_bencana d
                WHERE d.wilayah_id = :parent_id;
            """)
            p_res = await db.execute(sql_parent, {"parent_id": w_row.parent_id})
            p_row = p_res.first()
            if p_row and (p_row.meninggal > 0 or p_row.pengungsi > 0 or p_row.kerugian_rp > 0):
                parent_dampak_info = {
                    "nama_wilayah": w_row.parent_nama or "Kabupaten Induk",
                    "parent_nama": w_row.parent_nama or "Kabupaten Induk",
                    "tingkat": "Kabupaten/Kota",
                    "total_meninggal": int(p_row.meninggal),
                    "total_pengungsi": int(p_row.pengungsi),
                    "total_kerugian": float(p_row.kerugian_rp),
                    "jumlah_kejadian": 1,
                    "catatan": f"Data bencana terpusat pada laporan {w_row.parent_nama}"
                }

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

    total_kerugian = float(mv_data.total_kerugian) if mv_data else 0.0
    total_meninggal = int(mv_data.total_meninggal) if mv_data else 0

    if total_kerugian >= 1_500_000_000 or total_meninggal > 0:
        tingkat = "tinggi"
    elif total_kerugian >= 400_000_000:
        tingkat = "sedang"
    else:
        tingkat = "rendah"

    return WilayahDampakResponse(
        wilayah_id=w_row.id,
        nama=w_row.nama,
        parent_nama=w_row.parent_nama or "Provinsi Sumatera Barat",
        total_kerugian=total_kerugian,
        total_meninggal=total_meninggal,
        total_luka=int(mv_data.total_luka) if mv_data else 0,
        total_terdampak=int(mv_data.total_terdampak) if mv_data else 0,
        jumlah_pengungsi=int(det.pengungsi) if det else 0,
        jumlah_kejadian=int(mv_data.jumlah_kejadian) if mv_data else 0,
        rumah_rusak_berat=int(det.r_berat) if det else 0,
        rumah_rusak_sedang=int(det.r_sedang) if det else 0,
        rumah_rusak_ringan=int(det.r_ringan) if det else 0,
        fasilitas_umum_rusak=int(det.fasum) if det else 0,
        fasilitas_kesehatan_rusak=int(det.faskes) if det else 0,
        sekolah_rusak=int(det.sekolah) if det else 0,
        terakhir_refresh=mv_data.terakhir_refresh if mv_data else None,
        tingkat_risiko=tingkat,
        center=center_coords,
        kejadian_terbaru=kejadian_list,
        parent_dampak=parent_dampak_info if level != "provinsi" and level != "kabupaten" else None
    )


@router.get("/zonasi-tsunami")
async def list_zonasi_tsunami(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Mengembalikan data poligon zonasi tsunami (Merah, Kuning, Hijau)
    dalam format GeoJSON FeatureCollection standar untuk visualisasi layer peta.
    """
    sql = text("""
        SELECT 
            id, wilayah_id, nama_zona, zona, tingkat_bahaya, kedalaman_rendaman, deskripsi, rekomendasi,
            ST_AsGeoJSON(geom) AS geojson_geom
        FROM zonasi_tsunami
        ORDER BY CASE WHEN zona = 'merah' THEN 1 WHEN zona = 'kuning' THEN 2 ELSE 3 END ASC;
    """)
    result = await db.execute(sql)
    rows = result.fetchall()

    features = []
    for r in rows:
        geom = json.loads(r.geojson_geom) if r.geojson_geom else None
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": r.id,
                "wilayah_id": r.wilayah_id,
                "nama_zona": r.nama_zona,
                "zona": r.zona,
                "tingkat_bahaya": r.tingkat_bahaya,
                "kedalaman_rendaman": r.kedalaman_rendaman,
                "deskripsi": r.deskripsi,
                "rekomendasi": r.rekomendasi
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }


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
