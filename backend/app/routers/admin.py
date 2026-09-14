from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any

from app.core.database import get_async_db
from app.core.dependencies import require_role
from app.models.pengguna import Pengguna

router = APIRouter(prefix="/admin", tags=["Administrasi & Eksekutif Pimpinan"])

@router.get("/pengguna")
async def list_pengguna(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Admin: Mengembalikan daftar seluruh akun pengguna sistem dan hak aksesnya.
    """
    query = text("""
        SELECT 
            p.id, p.nama, p.email, p.role, p.aktif, p.created_at,
            w.nama AS wilayah_tugas_nama
        FROM pengguna p
        LEFT JOIN wilayah_administratif w ON w.id = p.wilayah_tugas_id
        ORDER BY p.id ASC;
    """)
    res = await db.execute(query)
    rows = res.fetchall()

    users = []
    for r in rows:
        users.append({
            "id": r.id,
            "nama": r.nama,
            "email": r.email,
            "role": r.role,
            "wilayah_tugas": r.wilayah_tugas_nama or "Provinsi Sumatera Barat",
            "aktif": r.aktif,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return {"data": users}

@router.get("/statistik")
async def get_ringkasan_eksekutif(db: AsyncSession = Depends(get_async_db)):
    """
    Pimpinan & Admin: Mengembalikan agregasi statistik makro untuk Ringkasan Eksekutif BPBD.
    """
    # 1. Total Dampak & Kerugian
    dampak_q = text("""
        SELECT 
            COUNT(DISTINCT k.id) AS total_kejadian,
            COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
            COALESCE(SUM(d.korban_meninggal), 0) AS total_meninggal,
            COALESCE(SUM(d.korban_luka), 0) AS total_luka,
            COALESCE(SUM(d.jumlah_pengungsi), 0) AS total_pengungsi,
            COALESCE(SUM(d.rumah_rusak_berat + d.rumah_rusak_sedang + d.rumah_rusak_ringan), 0) AS total_rumah_rusak
        FROM kejadian_bencana k
        LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id;
    """)
    dampak_row = (await db.execute(dampak_q)).fetchone()

    # 2. Posko Evakuasi
    posko_q = text("""
        SELECT 
            COUNT(*) FILTER (WHERE status = 'aktif') AS posko_aktif,
            COUNT(*) FILTER (WHERE status = 'penuh') AS posko_penuh,
            COALESCE(SUM(kapasitas), 0) AS total_kapasitas
        FROM posko_evakuasi;
    """)
    posko_row = (await db.execute(posko_q)).fetchone()

    # 3. Jalan Terputus Aktif
    jalan_q = text("SELECT COUNT(*) FROM jalan_terputus WHERE status = 'aktif';")
    jalan_count = (await db.execute(jalan_q)).scalar() or 0

    # 4. 3 Wilayah Terdampak Tertinggi
    top_wilayah_q = text("""
        SELECT nama, total_kerugian, total_meninggal, jumlah_kejadian
        FROM mv_dampak_per_kecamatan
        ORDER BY total_kerugian DESC
        LIMIT 3;
    """)
    top_rows = (await db.execute(top_wilayah_q)).fetchall()
    top_wilayah = [
        {
            "nama": r.nama,
            "total_kerugian": float(r.total_kerugian or 0),
            "total_meninggal": int(r.total_meninggal or 0),
            "jumlah_kejadian": int(r.jumlah_kejadian or 0)
        }
        for r in top_rows
    ]

    return {
        "status_siaga": "SIAGA 1 (TANGGAP DARURAT)",
        "ringkasan": {
            "total_kejadian": int(dampak_row.total_kejadian or 0),
            "total_kerugian": float(dampak_row.total_kerugian or 0),
            "total_meninggal": int(dampak_row.total_meninggal or 0),
            "total_luka": int(dampak_row.total_luka or 0),
            "total_pengungsi": int(dampak_row.total_pengungsi or 0),
            "total_rumah_rusak": int(dampak_row.total_rumah_rusak or 0),
            "posko_aktif": int(posko_row.posko_aktif or 0),
            "posko_penuh": int(posko_row.posko_penuh or 0),
            "total_kapasitas_posko": int(posko_row.total_kapasitas or 0),
            "jalan_terputus_aktif": jalan_count
        },
        "prioritas_wilayah": top_wilayah
    }
