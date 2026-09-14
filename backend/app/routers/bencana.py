from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

from app.core.database import get_async_db
from app.models.bencana import KejadianBencana, DataDampakBencana
from app.models.wilayah import WilayahAdministratif

router = APIRouter(prefix="/bencana", tags=["Data Kejadian Bencana"])

class BencanaCreateRequest(BaseModel):
    jenis_bencana: str = Field(..., description="gempa | tsunami | banjir | longsor | erupsi | angin_puting_beliung | kebakaran | lainnya")
    tanggal_kejadian: datetime = Field(default_factory=datetime.utcnow)
    wilayah_id: Optional[int] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    deskripsi: Optional[str] = None
    sumber_data: Optional[str] = "operator_bpbd"
    status_verifikasi: Optional[str] = "terverifikasi"

@router.get("")
async def list_bencana(
    jenis: Optional[str] = Query(None, description="Filter jenis bencana"),
    tahun: Optional[int] = Query(None, description="Filter tahun"),
    wilayah_id: Optional[int] = Query(None, description="Filter ID wilayah"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Daftar kejadian bencana dengan filter jenis, tahun, dan wilayah.
    """
    filters = ["1=1"]
    params: Dict[str, Any] = {"limit": limit, "offset": offset}

    if jenis and jenis.lower() != "semua":
        filters.append("LOWER(k.jenis_bencana) = LOWER(:jenis)")
        params["jenis"] = jenis

    if tahun:
        filters.append("EXTRACT(YEAR FROM k.tanggal_kejadian) = :tahun")
        params["tahun"] = tahun

    if wilayah_id:
        filters.append("k.wilayah_id = :wilayah_id")
        params["wilayah_id"] = wilayah_id

    where_clause = " AND ".join(filters)

    sql = text(f"""
        SELECT 
            k.id,
            k.jenis_bencana,
            k.tanggal_kejadian,
            k.deskripsi,
            k.sumber_data,
            k.status_verifikasi,
            w.nama AS nama_wilayah,
            COALESCE(ST_X(k.lokasi), 0) AS lon,
            COALESCE(ST_Y(k.lokasi), 0) AS lat,
            COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
            COALESCE(SUM(d.korban_meninggal), 0) AS korban_meninggal,
            COALESCE(SUM(d.korban_luka), 0) AS korban_luka
        FROM kejadian_bencana k
        LEFT JOIN wilayah_administratif w ON w.id = k.wilayah_id
        LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
        WHERE {where_clause}
        GROUP BY k.id, k.jenis_bencana, k.tanggal_kejadian, k.deskripsi, k.sumber_data, k.status_verifikasi, w.nama, k.lokasi
        ORDER BY k.tanggal_kejadian DESC
        LIMIT :limit OFFSET :offset;
    """)

    result = await db.execute(sql, params)
    rows = result.fetchall()

    data = [
        {
            "id": r.id,
            "jenis_bencana": r.jenis_bencana,
            "tanggal_kejadian": r.tanggal_kejadian.isoformat() if r.tanggal_kejadian else None,
            "deskripsi": r.deskripsi,
            "wilayah": r.nama_wilayah or "Sumatera Barat",
            "lokasi": {"lat": float(r.lat), "lon": float(r.lon)} if r.lat != 0 else None,
            "sumber_data": r.sumber_data,
            "status_verifikasi": r.status_verifikasi,
            "dampak": {
                "kerugian_rp": float(r.total_kerugian),
                "korban_meninggal": int(r.korban_meninggal),
                "korban_luka": int(r.korban_luka)
            }
        }
        for r in rows
    ]

    return {"status": "success", "count": len(data), "data": data}

@router.get("/riwayat")
async def riwayat_bencana(
    jenis: Optional[str] = Query(None),
    tahun: Optional[int] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Alias timeline riwayat bencana terbaru untuk feed informasi.
    """
    return await list_bencana(jenis=jenis, tahun=tahun, wilayah_id=None, limit=limit, offset=0, db=db)

@router.get("/statistik")
async def statistik_bencana(
    tahun: Optional[int] = Query(None, description="Filter tahun statistik"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Ringkasan metrik statistik bencana tingkat provinsi Sumatera Barat.
    """
    year_filter = "WHERE EXTRACT(YEAR FROM k.tanggal_kejadian) = :tahun" if tahun else ""
    params = {"tahun": tahun} if tahun else {}

    sql_ringkasan = text(f"""
        SELECT 
            COUNT(DISTINCT k.id) AS total_kejadian,
            COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
            COALESCE(SUM(d.korban_meninggal), 0) AS total_meninggal,
            COALESCE(SUM(d.korban_luka), 0) AS total_luka,
            COALESCE(SUM(d.jumlah_pengungsi), 0) AS total_pengungsi,
            COALESCE(SUM(d.penduduk_terdampak), 0) AS total_terdampak
        FROM kejadian_bencana k
        LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
        {year_filter};
    """)
    res_ringkasan = await db.execute(sql_ringkasan, params)
    ringkasan = res_ringkasan.first()

    # Breakdown per jenis
    sql_per_jenis = text(f"""
        SELECT 
            k.jenis_bencana,
            COUNT(k.id) AS jumlah,
            COALESCE(SUM(d.kerugian_rp), 0) AS kerugian
        FROM kejadian_bencana k
        LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
        {year_filter}
        GROUP BY k.jenis_bencana
        ORDER BY jumlah DESC;
    """)
    res_jenis = await db.execute(sql_per_jenis, params)
    distribusi = [
        {"jenis": r.jenis_bencana, "jumlah": int(r.jumlah), "kerugian_rp": float(r.kerugian)}
        for r in res_jenis.fetchall()
    ]

    total_kerugian = float(ringkasan.total_kerugian) if ringkasan else 0.0
    return {
        "status": "success",
        "tahun": tahun or "Semua Tahun",
        "ringkasan": {
            "total_kejadian": int(ringkasan.total_kejadian) if ringkasan else 0,
            "total_kerugian_rp": total_kerugian,
            "total_kerugian_miliar": round(total_kerugian / 1_000_000_000, 2),
            "total_korban_meninggal": int(ringkasan.total_meninggal) if ringkasan else 0,
            "total_korban_luka": int(ringkasan.total_luka) if ringkasan else 0,
            "total_pengungsi": int(ringkasan.total_pengungsi) if ringkasan else 0,
            "total_terdampak": int(ringkasan.total_terdampak) if ringkasan else 0
        },
        "distribusi_bencana": distribusi
    }

@router.get("/heatmap")
async def heatmap_bencana(
    jenis: Optional[str] = Query(None),
    tahun: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Titik-titik spasial bencana dalam format GeoJSON FeatureCollection ringan untuk heatmap layer.
    """
    filters = ["k.lokasi IS NOT NULL"]
    params: Dict[str, Any] = {}

    if jenis and jenis.lower() != "semua":
        filters.append("LOWER(k.jenis_bencana) = LOWER(:jenis)")
        params["jenis"] = jenis

    if tahun:
        filters.append("EXTRACT(YEAR FROM k.tanggal_kejadian) = :tahun")
        params["tahun"] = tahun

    where_clause = " AND ".join(filters)

    sql = text(f"""
        SELECT 
            k.id,
            k.jenis_bencana,
            ST_X(k.lokasi) AS lon,
            ST_Y(k.lokasi) AS lat,
            COALESCE(SUM(d.kerugian_rp), 10000000) AS intensitas_kerugian
        FROM kejadian_bencana k
        LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
        WHERE {where_clause}
        GROUP BY k.id, k.jenis_bencana, k.lokasi;
    """)
    result = await db.execute(sql, params)
    rows = result.fetchall()

    features = []
    for r in rows:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(r.lon), float(r.lat)]
            },
            "properties": {
                "id": r.id,
                "jenis": r.jenis_bencana,
                "bobot": min(1.0, float(r.intensitas_kerugian) / 5_000_000_000)
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/{bencana_id}")
async def detail_bencana(
    bencana_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Detail satu kejadian bencana beserta rincian dampak fisik dan korbannya.
    """
    sql = text("""
        SELECT 
            k.id,
            k.jenis_bencana,
            k.tanggal_kejadian,
            k.deskripsi,
            k.sumber_data,
            k.status_verifikasi,
            w.nama AS nama_wilayah,
            COALESCE(ST_X(k.lokasi), 0) AS lon,
            COALESCE(ST_Y(k.lokasi), 0) AS lat,
            d.korban_meninggal,
            d.korban_hilang,
            d.korban_luka,
            d.jumlah_pengungsi,
            d.kerugian_rp,
            d.rumah_rusak_berat,
            d.rumah_rusak_sedang,
            d.rumah_rusak_ringan,
            d.fasilitas_umum_rusak,
            d.fasilitas_kesehatan_rusak,
            d.sekolah_rusak,
            d.penduduk_terdampak,
            d.catatan
        FROM kejadian_bencana k
        LEFT JOIN wilayah_administratif w ON w.id = k.wilayah_id
        LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
        WHERE k.id = :bencana_id;
    """)
    res = await db.execute(sql, {"bencana_id": bencana_id})
    row = res.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "BENCANA_NOT_FOUND", "message": f"Kejadian bencana ID {bencana_id} tidak ditemukan."}}
        )

    return {
        "id": row.id,
        "jenis_bencana": row.jenis_bencana,
        "tanggal_kejadian": row.tanggal_kejadian.isoformat() if row.tanggal_kejadian else None,
        "deskripsi": row.deskripsi,
        "wilayah": row.nama_wilayah or "Sumatera Barat",
        "lokasi": {"lat": float(row.lat), "lon": float(row.lon)} if row.lat != 0 else None,
        "sumber_data": row.sumber_data,
        "status_verifikasi": row.status_verifikasi,
        "dampak": {
            "korban_meninggal": int(row.korban_meninggal or 0),
            "korban_hilang": int(row.korban_hilang or 0),
            "korban_luka": int(row.korban_luka or 0),
            "jumlah_pengungsi": int(row.jumlah_pengungsi or 0),
            "kerugian_rp": float(row.kerugian_rp or 0),
            "rumah_rusak_berat": int(row.rumah_rusak_berat or 0),
            "rumah_rusak_sedang": int(row.rumah_rusak_sedang or 0),
            "rumah_rusak_ringan": int(row.rumah_rusak_ringan or 0),
            "fasilitas_umum_rusak": int(row.fasilitas_umum_rusak or 0),
            "fasilitas_kesehatan_rusak": int(row.fasilitas_kesehatan_rusak or 0),
            "sekolah_rusak": int(row.sekolah_rusak or 0),
            "penduduk_terdampak": int(row.penduduk_terdampak or 0),
            "catatan": row.catatan
        }
    }
