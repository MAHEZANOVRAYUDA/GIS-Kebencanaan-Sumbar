from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, Field
from typing import List, Optional
import json
from datetime import datetime

from app.core.database import get_async_db
from app.core.dependencies import require_role
from app.models.jalan import JalanTerputus
from app.models.pengguna import Pengguna

router = APIRouter(prefix="/jalan-terputus", tags=["Jalan Terputus (Blokade Bencana)"])

class CoordinatesList(BaseModel):
    coordinates: List[List[float]] = Field(
        ...,
        description="Daftar titik koordinat [[lon, lat], [lon, lat], ...] membentuk LineString ruas jalan"
    )

class JalanCreateRequest(BaseModel):
    geometry: CoordinatesList
    alasan: str = Field(..., description="Alasan: longsor | banjir | jembatan_putus | kerusakan_jalan | lainnya")
    deskripsi: Optional[str] = None

class JalanPulihkanResponse(BaseModel):
    id: int
    status: str
    pesan: str

@router.get("")
async def list_jalan_terputus(db: AsyncSession = Depends(get_async_db)):
    """
    Endpoint Publik: Mengembalikan daftar ruas jalan terputus berstatus aktif 
    dalam format GeoJSON FeatureCollection untuk dirender langsung di MapLibre.
    """
    query = text("""
        SELECT 
            id,
            alasan,
            deskripsi,
            status,
            tanggal_lapor,
            ST_AsGeoJSON(geom) AS geojson
        FROM jalan_terputus
        WHERE status IN ('aktif', 'sebagian')
        ORDER BY tanggal_lapor DESC;
    """)
    result = await db.execute(query)
    rows = result.fetchall()

    features = []
    for r in rows:
        geom = json.loads(r.geojson) if r.geojson else None
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": r.id,
                "alasan": r.alasan,
                "deskripsi": r.deskripsi or "",
                "status": r.status,
                "tanggal_lapor": r.tanggal_lapor.isoformat() if r.tanggal_lapor else None
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_jalan_terputus(
    payload: JalanCreateRequest,
    current_user: Pengguna = Depends(require_role(["operator", "admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Khusus Petugas (Operator/Admin): Menandai ruas jalan terputus akibat bencana.
    Geometri disimpan dalam format LINESTRING (EPSG:4326).
    """
    coords = payload.geometry.coordinates
    if len(coords) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "INVALID_GEOMETRY",
                    "message": "Ruas jalan harus memiliki minimal 2 titik koordinat [lon, lat]."
                }
            }
        )

    # Validasi alasan
    valid_alasan = ['longsor', 'banjir', 'jembatan_putus', 'kerusakan_jalan', 'lainnya']
    if payload.alasan not in valid_alasan:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "INVALID_ALASAN",
                    "message": f"Alasan harus salah satu dari: {', '.join(valid_alasan)}"
                }
            }
        )

    # Buat GeoJSON LineString
    geojson_obj = {
        "type": "LineString",
        "coordinates": coords
    }
    geojson_str = json.dumps(geojson_obj)

    query = text("""
        INSERT INTO jalan_terputus (geom, alasan, deskripsi, status, dilaporkan_oleh, tanggal_lapor)
        VALUES (ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326), :alasan, :deskripsi, 'aktif', :user_id, now())
        RETURNING id, alasan, status, tanggal_lapor;
    """)

    result = await db.execute(query, {
        "geojson": geojson_str,
        "alasan": payload.alasan,
        "deskripsi": payload.deskripsi,
        "user_id": current_user.id
    })
    row = result.fetchone()
    await db.commit()

    return {
        "message": "Ruas jalan terputus berhasil dicatat.",
        "id": row.id,
        "alasan": row.alasan,
        "status": row.status,
        "tanggal_lapor": row.tanggal_lapor.isoformat() if row.tanggal_lapor else None
    }

@router.put("/{jalan_id}/pulihkan", response_model=JalanPulihkanResponse)
async def pulihkan_jalan(
    jalan_id: int,
    current_user: Pengguna = Depends(require_role(["operator", "admin"])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Khusus Petugas: Menandai ruas jalan sudah dapat dilalui kembali (status 'pulih').
    """
    query = text("""
        UPDATE jalan_terputus
        SET status = 'pulih', tanggal_pulih = now()
        WHERE id = :jalan_id
        RETURNING id, status;
    """)
    result = await db.execute(query, {"jalan_id": jalan_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Ruas jalan dengan ID {jalan_id} tidak ditemukan."
                }
            }
        )
    await db.commit()
    return JalanPulihkanResponse(
        id=row.id,
        status=row.status,
        pesan="Status ruas jalan berhasil diubah menjadi pulih."
    )
