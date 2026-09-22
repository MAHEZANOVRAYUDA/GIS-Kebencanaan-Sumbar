from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.core.database import get_async_db
from app.core.dependencies import require_role
from app.models.pengguna import Pengguna
from app.services.routing_service import get_nearest_posko
from app.services.audit_service import record_audit

router = APIRouter(prefix="/posko", tags=["Posko Evakuasi & Mitigasi (CRUD)"])

# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class PoskoCreateRequest(BaseModel):
    nama: str = Field(..., max_length=150, description="Nama posko atau fasilitas evakuasi")
    jenis: str = Field(
        default="posko_utama",
        description="posko_utama | posko_pengungsi | titik_kumpul | shelter_sementara | fasilitas_kesehatan | shelter_tes_tea | sirine_tsunami"
    )
    lat: float = Field(..., ge=-10.0, le=10.0, description="Latitude titik posko (WGS84)")
    lon: float = Field(..., ge=90.0, le=145.0, description="Longitude titik posko (WGS84)")
    kapasitas: Optional[int] = Field(default=100, ge=0, description="Daya tampung maksimum pengungsi")
    fasilitas: Optional[List[str]] = Field(default_factory=list, description="Daftar fasilitas [air_bersih, mck, dapur_umum, genset, faskes, ramah_difabel]")
    kontak_pic: Optional[str] = Field(default=None, max_length=100, description="Nama penanggung jawab lapangan")
    kontak_telepon: Optional[str] = Field(default=None, max_length=30, description="Nomor telepon darurat PIC")
    status: Optional[str] = Field(default="aktif", description="aktif | penuh | nonaktif")
    wilayah_id: Optional[int] = Field(default=None, description="ID wilayah administratif")

class PoskoUpdateRequest(BaseModel):
    nama: Optional[str] = Field(None, max_length=150)
    jenis: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-10.0, le=10.0)
    lon: Optional[float] = Field(None, ge=90.0, le=145.0)
    kapasitas: Optional[int] = Field(None, ge=0)
    fasilitas: Optional[List[str]] = None
    kontak_pic: Optional[str] = None
    kontak_telepon: Optional[str] = None
    status: Optional[str] = None
    wilayah_id: Optional[int] = None

class PoskoStatusRequest(BaseModel):
    status: str = Field(..., description="Status: aktif | penuh | nonaktif")
    kapasitas: Optional[int] = None

# ============================================================================
# ENDPOINTS PUBLIK & BACA (READ)
# ============================================================================

@router.get("")
async def list_semua_posko(
    jenis: Optional[str] = None,
    include_nonaktif: bool = False,
    wilayah_id: Optional[int] = None,
    id_kecamatan: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Mengembalikan daftar posko/shelter/sirine dalam format GeoJSON FeatureCollection.
    Mendukung filter jenis, wilayah, id_kecamatan hasil filter bertingkat, dan status ketersediaan.
    """
    conditions = []
    params: Dict[str, Any] = {}

    if not include_nonaktif and jenis != "sirine_tsunami":
        conditions.append("status = 'aktif'")
    if jenis:
        conditions.append("jenis = :jenis")
        params["jenis"] = jenis
    if wilayah_id:
        conditions.append("wilayah_id = :wilayah_id")
        params["wilayah_id"] = wilayah_id
    if id_kecamatan:
        conditions.append("(id_kecamatan = :id_kecamatan OR wilayah_id IN (SELECT wilayah_administratif_id FROM kecamatan WHERE id = :id_kecamatan))")
        params["id_kecamatan"] = id_kecamatan
    if search:
        conditions.append("LOWER(nama) LIKE :search")
        params["search"] = f"%{search.lower()}%"

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = text(f"""
        SELECT 
            id, nama, jenis, kapasitas, fasilitas, kontak_pic, kontak_telepon, status, wilayah_id, id_kecamatan,
            ST_X(lokasi) AS lon, ST_Y(lokasi) AS lat, updated_at
        FROM posko_evakuasi
        {where_clause}
        ORDER BY id DESC;
    """)
    result = await db.execute(query, params)
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
                "nama": r.nama,
                "jenis": r.jenis,
                "kapasitas": r.kapasitas,
                "fasilitas": r.fasilitas or [],
                "kontak_pic": r.kontak_pic,
                "kontak_telepon": r.kontak_telepon,
                "status": r.status,
                "wilayah_id": r.wilayah_id,
                "id_kecamatan": r.id_kecamatan,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/nearest")
async def nearest_posko_endpoint(
    lat: float,
    lon: float,
    limit: int = 3,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Mencari posko evakuasi terdekat menggunakan operator spasial PostGIS KNN (<->).
    """
    poskos = await get_nearest_posko(db, lat, lon, limit=limit)
    return {"data": poskos}

@router.get("/sirine/status")
async def status_sirine_tsunami(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Mengembalikan telemetri dan status operasional seluruh 46 sirine EWS Tsunami BPBD.
    """
    query = text("""
        SELECT 
            p.id, p.nama, p.status, p.kontak_pic, p.kontak_telepon,
            ST_X(p.lokasi) AS lon, ST_Y(p.lokasi) AS lat,
            w.nama AS wilayah_nama, p.updated_at
        FROM posko_evakuasi p
        LEFT JOIN wilayah_administratif w ON w.id = p.wilayah_id
        WHERE p.jenis = 'sirine_tsunami'
        ORDER BY p.id ASC;
    """)
    result = await db.execute(query)
    rows = result.fetchall()

    items = []
    for r in rows:
        items.append({
            "id": r.id,
            "nama": r.nama,
            "status": r.status or "aktif",
            "wilayah": r.wilayah_nama or "Pesisir Barat Sumbar",
            "lat": float(r.lat),
            "lon": float(r.lon),
            "radius_akustik_km": 2.0,
            "kontak_pic": r.kontak_pic,
            "kontak_telepon": r.kontak_telepon,
            "terakhir_diperiksa": r.updated_at.isoformat() if r.updated_at else None
        })

    return {
        "total_sirine": len(items),
        "aktif_siaga": sum(1 for s in items if s["status"] == "aktif"),
        "dalam_pemeliharaan": sum(1 for s in items if s["status"] != "aktif"),
        "data": items
    }

@router.get("/{posko_id}")
async def detail_posko(
    posko_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Mengambil data detail tunggal dari suatu posko/shelter.
    """
    query = text("""
        SELECT 
            p.id, p.nama, p.jenis, p.kapasitas, p.fasilitas, p.kontak_pic, p.kontak_telepon, p.status,
            p.wilayah_id, w.nama AS wilayah_nama,
            ST_X(p.lokasi) AS lon, ST_Y(p.lokasi) AS lat, p.created_at, p.updated_at
        FROM posko_evakuasi p
        LEFT JOIN wilayah_administratif w ON w.id = p.wilayah_id
        WHERE p.id = :posko_id;
    """)
    result = await db.execute(query, {"posko_id": posko_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Posko dengan ID {posko_id} tidak ditemukan."}}
        )

    return {
        "id": row.id,
        "nama": row.nama,
        "jenis": row.jenis,
        "kapasitas": row.kapasitas,
        "fasilitas": row.fasilitas or [],
        "kontak_pic": row.kontak_pic,
        "kontak_telepon": row.kontak_telepon,
        "status": row.status,
        "wilayah_id": row.wilayah_id,
        "wilayah_nama": row.wilayah_nama,
        "lat": float(row.lat),
        "lon": float(row.lon),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None
    }

# ============================================================================
# ENDPOINTS MUTASI (CREATE, UPDATE, DELETE) - KHUSUS OPERATOR & ADMIN
# ============================================================================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_posko(
    payload: PoskoCreateRequest,
    request: Request,
    current_user: Pengguna = Depends(require_role(["operator", "admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Operator & Admin: Menambahkan titik posko evakuasi, shelter vertikal TES, atau sirine baru.
    """
    valid_jenis = ['posko_utama', 'posko_pengungsi', 'titik_kumpul', 'shelter_sementara', 'fasilitas_kesehatan', 'shelter_tes_tea', 'sirine_tsunami']
    if payload.jenis not in valid_jenis:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_JENIS", "message": f"Jenis posko harus salah satu dari: {', '.join(valid_jenis)}"}}
        )

    valid_status = ['aktif', 'penuh', 'nonaktif']
    if payload.status not in valid_status:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_STATUS", "message": f"Status posko harus salah satu dari: {', '.join(valid_status)}"}}
        )

    query = text("""
        INSERT INTO posko_evakuasi (
            nama, jenis, lokasi, kapasitas, fasilitas, kontak_pic, kontak_telepon, status, wilayah_id, created_at, updated_at
        ) VALUES (
            :nama, :jenis, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
            :kapasitas, :fasilitas, :kontak_pic, :kontak_telepon, :status, :wilayah_id, now(), now()
        ) RETURNING id, nama, jenis, status;
    """)

    result = await db.execute(query, {
        "nama": payload.nama,
        "jenis": payload.jenis,
        "lon": payload.lon,
        "lat": payload.lat,
        "kapasitas": payload.kapasitas,
        "fasilitas": payload.fasilitas or [],
        "kontak_pic": payload.kontak_pic,
        "kontak_telepon": payload.kontak_telepon,
        "status": payload.status,
        "wilayah_id": payload.wilayah_id
    })
    row = result.fetchone()

    # Catat Audit Log
    client_ip = request.client.host if request.client else None
    await record_audit(
        db=db,
        pengguna_id=current_user.id,
        aksi="CREATE_POSKO",
        tabel_target="posko_evakuasi",
        record_id=row.id,
        detail={"nama": payload.nama, "jenis": payload.jenis, "lat": payload.lat, "lon": payload.lon},
        ip_address=client_ip
    )

    await db.commit()

    return {
        "message": f"Posko/Aset '{row.nama}' berhasil ditambahkan ke basis data spasial.",
        "id": row.id,
        "nama": row.nama,
        "jenis": row.jenis,
        "status": row.status
    }

@router.put("/{posko_id}")
async def update_posko(
    posko_id: int,
    payload: PoskoUpdateRequest,
    request: Request,
    current_user: Pengguna = Depends(require_role(["operator", "admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Operator & Admin: Memperbarui data detail posko evakuasi / shelter.
    """
    # Verifikasi eksistensi posko
    check_query = text("SELECT id, nama FROM posko_evakuasi WHERE id = :id;")
    existing = (await db.execute(check_query, {"id": posko_id})).fetchone()
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Posko dengan ID {posko_id} tidak ditemukan."}}
        )

    updates = ["updated_at = now()"]
    params: Dict[str, Any] = {"id": posko_id}

    if payload.nama is not None:
        updates.append("nama = :nama")
        params["nama"] = payload.nama
    if payload.jenis is not None:
        updates.append("jenis = :jenis")
        params["jenis"] = payload.jenis
    if payload.kapasitas is not None:
        updates.append("kapasitas = :kapasitas")
        params["kapasitas"] = payload.kapasitas
    if payload.fasilitas is not None:
        updates.append("fasilitas = :fasilitas")
        params["fasilitas"] = payload.fasilitas
    if payload.kontak_pic is not None:
        updates.append("kontak_pic = :kontak_pic")
        params["kontak_pic"] = payload.kontak_pic
    if payload.kontak_telepon is not None:
        updates.append("kontak_telepon = :kontak_telepon")
        params["kontak_telepon"] = payload.kontak_telepon
    if payload.status is not None:
        updates.append("status = :status")
        params["status"] = payload.status
    if payload.wilayah_id is not None:
        updates.append("wilayah_id = :wilayah_id")
        params["wilayah_id"] = payload.wilayah_id
    if payload.lat is not None and payload.lon is not None:
        updates.append("lokasi = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)")
        params["lat"] = payload.lat
        params["lon"] = payload.lon

    update_sql = text(f"""
        UPDATE posko_evakuasi
        SET {', '.join(updates)}
        WHERE id = :id
        RETURNING id, nama, status, kapasitas;
    """)
    res = await db.execute(update_sql, params)
    row = res.fetchone()

    # Catat Audit Log
    client_ip = request.client.host if request.client else None
    await record_audit(
        db=db,
        pengguna_id=current_user.id,
        aksi="UPDATE_POSKO",
        tabel_target="posko_evakuasi",
        record_id=posko_id,
        detail=params,
        ip_address=client_ip
    )

    await db.commit()

    return {
        "message": f"Data posko '{row.nama}' berhasil diperbarui.",
        "id": row.id,
        "nama": row.nama,
        "status": row.status,
        "kapasitas": row.kapasitas
    }

@router.put("/{posko_id}/status")
async def update_posko_status(
    posko_id: int,
    payload: PoskoStatusRequest,
    request: Request,
    current_user: Pengguna = Depends(require_role(["operator", "admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Operator & Admin: Memperbarui status ketersediaan posko evakuasi (aktif, penuh, nonaktif).
    """
    valid_status = ['aktif', 'penuh', 'nonaktif']
    if payload.status not in valid_status:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_STATUS", "message": "Status harus salah satu dari: aktif, penuh, nonaktif"}}
        )

    query = text("""
        UPDATE posko_evakuasi
        SET status = :status,
            kapasitas = COALESCE(:kapasitas, kapasitas),
            updated_at = now()
        WHERE id = :posko_id
        RETURNING id, nama, status, kapasitas;
    """)
    res = await db.execute(query, {
        "status": payload.status,
        "kapasitas": payload.kapasitas,
        "posko_id": posko_id
    })
    row = res.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Posko dengan ID {posko_id} tidak ditemukan."}}
        )

    # Catat Audit Log
    client_ip = request.client.host if request.client else None
    await record_audit(
        db=db,
        pengguna_id=current_user.id,
        aksi="UPDATE_POSKO_STATUS",
        tabel_target="posko_evakuasi",
        record_id=posko_id,
        detail={"status": payload.status, "kapasitas": payload.kapasitas},
        ip_address=client_ip
    )

    await db.commit()
    return {
        "message": f"Status posko '{row.nama}' berhasil diubah menjadi '{row.status}'.",
        "id": row.id,
        "status": row.status,
        "kapasitas": row.kapasitas
    }

@router.delete("/{posko_id}")
async def delete_posko(
    posko_id: int,
    request: Request,
    current_user: Pengguna = Depends(require_role(["operator", "admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Operator & Admin: Menghapus titik posko atau fasilitas evakuasi.
    """
    query = text("DELETE FROM posko_evakuasi WHERE id = :posko_id RETURNING id, nama;")
    res = await db.execute(query, {"posko_id": posko_id})
    row = res.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": f"Posko dengan ID {posko_id} tidak ditemukan."}}
        )

    # Catat Audit Log
    client_ip = request.client.host if request.client else None
    await record_audit(
        db=db,
        pengguna_id=current_user.id,
        aksi="DELETE_POSKO",
        tabel_target="posko_evakuasi",
        record_id=posko_id,
        detail={"nama": row.nama},
        ip_address=client_ip
    )

    await db.commit()

    return {
        "message": f"Posko '{row.nama}' (ID {posko_id}) berhasil dihapus dari sistem.",
        "id": row.id
    }
