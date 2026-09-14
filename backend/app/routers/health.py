import time
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_async_db
from app.core.config import settings

router = APIRouter(tags=["Health"])

START_TIME = time.time()


@router.get("/health")
async def check_health(db: AsyncSession = Depends(get_async_db)):
    """
    Health check komprehensif untuk Uptime Kuma / monitoring otomatis.
    Memeriksa PostgreSQL/PostGIS, konektivitas routing engine (OSRM/Valhalla),
    dan status sistem kebencanaan.
    """
    db_status = "connected"
    postgis_version = "unknown"
    try:
        res = await db.execute(text("SELECT PostGIS_Full_Version();"))
        ver = res.scalar()
        if ver:
            postgis_version = ver.split()[0] if "POSTGIS=" in ver else ver[:30]
    except Exception as e:
        db_status = f"error: {str(e)}"

    # Cek status OSRM/Valhalla dengan timeout cepat
    routing_status = "connected (fallback online)"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            test_url = f"{settings.OSRM_URL}/route/v1/driving/100.35,-0.95;100.36,-0.94?overview=false"
            res = await client.get(test_url)
            if res.status_code == 200:
                routing_status = "connected (local osrm)"
    except Exception:
        routing_status = "fallback (router.project-osrm.org active)"

    uptime_seconds = int(time.time() - START_TIME)

    overall_ok = (db_status == "connected")

    return {
        "status": "ok" if overall_ok else "degraded",
        "service": "GIS Kebencanaan Sumatera Barat API",
        "phase": "Fase 4 (Pengerasan Produksi)",
        "database": {
            "status": db_status,
            "postgis": postgis_version,
            "host": settings.POSTGRES_SERVER,
            "port": settings.POSTGRES_PORT
        },
        "routing": {
            "engine": routing_status,
            "local_url": settings.OSRM_URL,
            "fallback_url": settings.OSRM_FALLBACK_URL
        },
        "uptime_seconds": uptime_seconds,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
