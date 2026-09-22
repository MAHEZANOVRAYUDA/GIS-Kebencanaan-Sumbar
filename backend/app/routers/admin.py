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

@router.get("/verifikasi-queue")
async def get_verifikasi_queue(
    current_user: Pengguna = Depends(require_role(["admin", "pimpinan", "operator"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Mengambil antrean laporan lapangan yang berstatus 'menunggu' untuk diverifikasi supervisor Pusdalops.
    """
    bencana_q = text("""
        SELECT 
            k.id, k.jenis_bencana, k.tanggal_kejadian, k.deskripsi, k.status_verifikasi,
            k.sumber_data, w.nama AS wilayah_nama, p.nama AS pelapor_nama,
            COALESCE(ST_X(k.lokasi), 0) AS lon, COALESCE(ST_Y(k.lokasi), 0) AS lat
        FROM kejadian_bencana k
        LEFT JOIN wilayah_administratif w ON w.id = k.wilayah_id
        LEFT JOIN pengguna p ON p.id = k.dibuat_oleh
        WHERE k.status_verifikasi = 'menunggu'
        ORDER BY k.tanggal_kejadian DESC;
    """)
    bencana_res = await db.execute(bencana_q)
    bencana_rows = bencana_res.fetchall()

    items = []
    for r in bencana_rows:
        items.append({
            "id": r.id,
            "jenis": r.jenis_bencana,
            "tanggal": r.tanggal_kejadian.isoformat() if r.tanggal_kejadian else None,
            "wilayah": r.wilayah_nama or "Sumatera Barat",
            "deskripsi": r.deskripsi,
            "sumber_data": r.sumber_data,
            "pelapor": r.pelapor_nama or "Petugas Lapangan",
            "status": r.status_verifikasi,
            "lat": float(r.lat) if r.lat != 0 else None,
            "lon": float(r.lon) if r.lon != 0 else None,
        })

    return {
        "total_antrean": len(items),
        "data": items
    }

@router.get("/audit-logs")
async def list_audit_logs(
    limit: int = 50,
    current_user: Pengguna = Depends(require_role(["admin", "pimpinan"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Admin & Pimpinan: Mengambil 50 aktivitas mutasi data dan jejak audit terbaru.
    """
    query = text("""
        SELECT 
            a.id, a.aksi, a.tabel_target, a.record_id, a.detail, a.ip_address, a.created_at,
            p.nama AS pengguna_nama, p.role AS pengguna_role
        FROM audit_log a
        LEFT JOIN pengguna p ON p.id = a.pengguna_id
        ORDER BY a.created_at DESC
        LIMIT :limit;
    """)
    res = await db.execute(query, {"limit": limit})
    rows = res.fetchall()

    logs = []
    for r in rows:
        logs.append({
            "id": r.id,
            "aksi": r.aksi,
            "tabel": r.tabel_target,
            "record_id": r.record_id,
            "detail": r.detail,
            "ip_address": str(r.ip_address) if r.ip_address else None,
            "operator": r.pengguna_nama or "Sistem",
            "role": r.pengguna_role or "-",
            "waktu": r.created_at.isoformat() if r.created_at else None
        })

    return {
        "count": len(logs),
        "data": logs
    }

