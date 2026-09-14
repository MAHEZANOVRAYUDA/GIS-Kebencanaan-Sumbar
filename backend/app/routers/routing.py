from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.core.database import get_async_db
from app.services.routing_service import kalkulasi_evakuasi_darurat, get_nearest_posko

router = APIRouter(prefix="", tags=["Routing Evakuasi & Posko"])

class EvakuasiRequest(BaseModel):
    lat: float = Field(..., ge=-10.0, le=10.0, description="Lintang titik pengguna")
    lon: float = Field(..., ge=90.0, le=145.0, description="Bujur titik pengguna")
    moda: Optional[str] = Field(default="mobil", description="Moda transportasi: mobil | motor | pejalan_kaki")

class InstruksiLangkah(BaseModel):
    teks: str
    jarak_m: int
    nama_jalan: Optional[str] = ""

class PoskoInfo(BaseModel):
    id: int
    nama: str
    jenis: Optional[str] = None
    kapasitas: Optional[int] = None
    fasilitas: Optional[List[str]] = []
    kontak_pic: Optional[str] = None
    kontak_telepon: Optional[str] = None
    lat: float
    lon: float

class EvakuasiResponse(BaseModel):
    posko: PoskoInfo
    jarak_km: float
    estimasi_menit: int
    geometry: Dict[str, Any]
    instruksi: List[InstruksiLangkah]
    menghindari_blokade: bool

@router.post("/routing/evakuasi", response_model=EvakuasiResponse)
async def evakuasi_darurat(
    payload: EvakuasiRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Endpoint Inti Evakuasi:
    1. Mencari 3 posko terdekat via KNN PostGIS
    2. Mendeteksi apakah ada jalan terputus aktif akibat bencana
    3. Menghitung rute terbaik menggunakan OSRM (normal) atau Valhalla (hindari blokade)
    4. Mengembalikan geometri LineString & panduan turn-by-turn ala Google Maps.
    """
    try:
        hasil = await kalkulasi_evakuasi_darurat(
            db=db,
            lat=payload.lat,
            lon=payload.lon,
            moda=payload.moda or "mobil"
        )
        return hasil
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "POSKO_NOT_FOUND",
                    "message": str(e)
                }
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "ROUTING_FAILED",
                    "message": f"Gagal menghitung rute evakuasi: {str(e)}"
                }
            }
        )

@router.get("/posko")
async def list_semua_posko(
    jenis: Optional[str] = None,
    include_nonaktif: bool = False,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Endpoint Publik: Mengembalikan seluruh posko/shelter/sirine dalam format GeoJSON 
    FeatureCollection untuk ditampilkan sebagai layer titik di peta.
    Dapat difilter berdasarkan jenis (misal: 'shelter_tes_tea', 'sirine_tsunami', dll.)
    """
    conditions = []
    params = {}

    if not include_nonaktif and jenis != "sirine_tsunami":
        conditions.append("status = 'aktif'")
    if jenis:
        conditions.append("jenis = :jenis")
        params["jenis"] = jenis

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = text(f"""
        SELECT 
            id, nama, jenis, kapasitas, fasilitas, kontak_pic, kontak_telepon, status,
            ST_X(lokasi) AS lon, ST_Y(lokasi) AS lat
        FROM posko_evakuasi
        {where_clause};
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
                "status": r.status
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/posko/nearest")
async def nearest_posko_endpoint(
    lat: float,
    lon: float,
    limit: int = 3,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Mencari posko terdekat dari koordinat pengguna.
    """
    poskos = await get_nearest_posko(db, lat, lon, limit=limit)
    return {"data": poskos}

class PoskoStatusRequest(BaseModel):
    status: str = Field(..., description="Status: aktif | penuh | nonaktif")
    kapasitas: Optional[int] = None

@router.put("/posko/{posko_id}/status")
async def update_posko_status(
    posko_id: int,
    payload: PoskoStatusRequest,
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
    await db.commit()
    return {
        "message": f"Status posko '{row.nama}' berhasil diubah menjadi '{row.status}'.",
        "id": row.id,
        "status": row.status,
        "kapasitas": row.kapasitas
    }

