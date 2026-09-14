from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional

from app.core.database import get_async_db
from app.services.bmkg_service import sync_gempa_bmkg

router = APIRouter(prefix="/eksternal", tags=["Data Eksternal (BMKG & BNPB)"])

@router.get("/gempa-terkini")
async def get_gempa_terkini(db: AsyncSession = Depends(get_async_db)):
    """
    Endpoint Publik: Mengembalikan gempa bumi terbaru dari cache lokal (hasil sync BMKG).
    Jika belum ada di database lokal, memicu sinkronisasi pertama kali secara instan.
    """
    query = text("""
        SELECT 
            id, external_id, magnitude, kedalaman_km,
            ST_X(lokasi) AS lon, ST_Y(lokasi) AS lat,
            wilayah_teks, waktu_kejadian, potensi_tsunami, dirasakan, synced_at
        FROM gempa_bmkg
        ORDER BY waktu_kejadian DESC NULLS LAST, id DESC
        LIMIT 1;
    """)
    result = await db.execute(query)
    row = result.fetchone()

    if not row:
        # Panggil sinkronisasi pertama kali
        await sync_gempa_bmkg()
        result = await db.execute(query)
        row = result.fetchone()

    if not row:
        return {"data": None, "message": "Belum ada data gempa tersinkronisasi."}

    return {
        "data": {
            "id": row.id,
            "external_id": row.external_id,
            "magnitude": float(row.magnitude) if row.magnitude else 0.0,
            "kedalaman_km": float(row.kedalaman_km) if row.kedalaman_km else 0.0,
            "lon": float(row.lon) if row.lon else 0.0,
            "lat": float(row.lat) if row.lat else 0.0,
            "wilayah_teks": row.wilayah_teks,
            "waktu_kejadian": row.waktu_kejadian.isoformat() if row.waktu_kejadian else None,
            "potensi_tsunami": bool(row.potensi_tsunami),
            "dirasakan": bool(row.dirasakan),
            "synced_at": row.synced_at.isoformat() if row.synced_at else None,
            "shakemap_url": f"https://data.bmkg.go.id/DataMKG/TEWS/{row.external_id.replace(' ', '').replace(':', '')}.mmi.jpg" if row.external_id else None,
            "atribusi": "Sumber Data: BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
        }
    }

@router.post("/sync-gempa")
async def trigger_sync_gempa():
    """
    Memicu sinkronisasi gempa BMKG secara manual.
    """
    await sync_gempa_bmkg()
    return {"message": "Proses sinkronisasi gempa BMKG berhasil dijalankan."}

@router.get("/cuaca-peringatan")
async def get_peringatan_cuaca(db: AsyncSession = Depends(get_async_db)):
    """
    Endpoint Publik: Mengembalikan peringatan dini cuaca ekstrem BMKG aktif untuk wilayah Sumbar.
    """
    from app.services.bmkg_weather_service import sync_bmkg_weather_alerts

    query = text("""
        SELECT 
            id, identifier, event, headline, description, severity,
            urgency, certainty, effective, expires, area_desc, created_at
        FROM peringatan_cuaca_bmkg
        ORDER BY id DESC
        LIMIT 5;
    """)
    result = await db.execute(query)
    rows = result.fetchall()

    if not rows:
        await sync_bmkg_weather_alerts()
        result = await db.execute(query)
        rows = result.fetchall()

    alerts = []
    for r in rows:
        alerts.append({
            "id": r.id,
            "identifier": r.identifier,
            "event": r.event,
            "headline": r.headline,
            "description": r.description,
            "severity": r.severity,
            "urgency": r.urgency,
            "certainty": r.certainty,
            "effective": r.effective.isoformat() if r.effective else None,
            "expires": r.expires.isoformat() if r.expires else None,
            "area_desc": r.area_desc,
            "atribusi": "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)"
        })

    return {
        "status": "ok",
        "data": alerts,
        "count": len(alerts)
    }

@router.post("/sync-ckan")
async def trigger_sync_ckan():
    """
    Admin/Operator: Memicu sinkronisasi ulang data terbuka BPBD Sumbar dari portal CKAN.
    """
    import asyncio
    from scripts.etl_ckan_sumbar import run_ckan_pipeline
    
    # Jalankan sebagai background task agar response API instan
    asyncio.get_event_loop().run_in_executor(None, run_ckan_pipeline)
    return {"message": "Proses sinkronisasi Satu Data BPBD Sumbar (CKAN) telah dimulai di latar belakang."}

