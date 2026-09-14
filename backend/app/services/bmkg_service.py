import httpx
import re
import logging
from datetime import datetime, timezone
from sqlalchemy import text
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from app.core.database import sync_engine

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

def upsert_gempa_sync(
    external_id: str,
    magnitude: float,
    kedalaman_km: float,
    lon: float,
    lat: float,
    wilayah_teks: str,
    waktu_kejadian: datetime,
    potensi_tsunami: bool,
    dirasakan: bool,
    shakemap_url: str
):
    with sync_engine.connect() as conn:
        query = text("""
            INSERT INTO gempa_bmkg (
                external_id, magnitude, kedalaman_km, lokasi, 
                wilayah_teks, waktu_kejadian, potensi_tsunami, dirasakan, synced_at
            )
            VALUES (
                :external_id, :magnitude, :kedalaman_km, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                :wilayah_teks, :waktu_kejadian, :potensi_tsunami, :dirasakan, now()
            )
            ON CONFLICT (external_id) DO UPDATE
            SET magnitude = EXCLUDED.magnitude,
                kedalaman_km = EXCLUDED.kedalaman_km,
                lokasi = EXCLUDED.lokasi,
                wilayah_teks = EXCLUDED.wilayah_teks,
                waktu_kejadian = EXCLUDED.waktu_kejadian,
                potensi_tsunami = EXCLUDED.potensi_tsunami,
                dirasakan = EXCLUDED.dirasakan,
                synced_at = now();
        """)
        conn.execute(query, {
            "external_id": external_id,
            "magnitude": magnitude,
            "kedalaman_km": kedalaman_km,
            "lon": lon,
            "lat": lat,
            "wilayah_teks": wilayah_teks,
            "waktu_kejadian": waktu_kejadian,
            "potensi_tsunami": potensi_tsunami,
            "dirasakan": dirasakan
        })
        conn.commit()

async def sync_gempa_bmkg():
    """
    Sinkronisasi Gempa BMKG Real-Time (sesuai spesifikasi 07-integrasi-data-eksternal.md Bagian 1.3)
    Mengambil data autogempa.json setiap 5 menit.
    """
    try:
        async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "gis-sumbar/1.0"}) as client:
            resp = await client.get(settings.BMKG_AUTOGEMPA_URL)
            if resp.status_code != 200:
                logger.warning(f"Gagal mengambil autogempa BMKG: status {resp.status_code}")
                return
            data = resp.json()
            g = data.get("Infogempa", {}).get("gempa", {})
            if not g:
                return

        # Parsing koordinat deterministik (Bujur Indonesia 95-141 BT, Lintang -11 s.d. 6)
        raw_coords = [float(x.strip()) for x in g["Coordinates"].split(",")]
        lat, lon = (raw_coords[0], raw_coords[1]) if abs(raw_coords[0]) <= 90 and raw_coords[1] > 90 else (raw_coords[1], raw_coords[0])

        potensi_tsunami = "tsunami" in g.get("Potensi", "").lower()
        external_id = f"{g['Tanggal']}_{g['Jam']}"
        kedalaman_num = float(re.sub(r"[^\d.]", "", g.get("Kedalaman", "10")))
        shakemap = g.get("Shakemap", "")
        shakemap_url = f"https://data.bmkg.go.id/DataMKG/TEWS/{shakemap}" if shakemap else ""

        waktu_dt = None
        if "DateTime" in g:
            try:
                waktu_dt = datetime.fromisoformat(g["DateTime"])
            except Exception:
                waktu_dt = datetime.now(timezone.utc)
        else:
            waktu_dt = datetime.now(timezone.utc)

        upsert_gempa_sync(
            external_id=external_id,
            magnitude=float(g.get("Magnitude", 0.0)),
            kedalaman_km=kedalaman_num,
            lon=lon,
            lat=lat,
            wilayah_teks=g.get("Wilayah", ""),
            waktu_kejadian=waktu_dt,
            potensi_tsunami=potensi_tsunami,
            dirasakan=bool(g.get("Dirasakan")),
            shakemap_url=shakemap_url
        )
        logger.info(f"[BMKG Sync] Sukses sinkronisasi gempa: M{g.get('Magnitude')} - {g.get('Wilayah')}")
    except Exception as e:
        logger.error(f"[BMKG Sync Error] Gagal menyinkronkan data gempa: {e}")

def start_bmkg_scheduler():
    """
    Menjalankan scheduler background APScheduler untuk sinkronisasi BMKG setiap 5 menit.
    """
    if not scheduler.running:
        scheduler.add_job(sync_gempa_bmkg, "interval", minutes=5, id="sync_bmkg_autogempa", replace_existing=True)
        scheduler.start()
        logger.info("[Scheduler] APScheduler BMKG Gempa aktif (interval 5 menit).")
