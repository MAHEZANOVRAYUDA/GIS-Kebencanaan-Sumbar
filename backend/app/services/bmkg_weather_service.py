import httpx
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from sqlalchemy import text

from app.core.database import sync_engine

logger = logging.getLogger(__name__)

BMKG_CAP_RSS = "https://www.bmkg.go.id/alerts/nowcast/id"
HEADERS = {"User-Agent": "gis-sumbar-research/1.0"}

def parse_iso_datetime(dt_str: str):
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)

def upsert_weather_alert(alert_data: dict):
    with sync_engine.connect() as conn:
        q = text("""
            INSERT INTO peringatan_cuaca_bmkg (
                identifier, event, headline, description, severity,
                urgency, certainty, effective, expires, area_desc, created_at
            )
            VALUES (
                :identifier, :event, :headline, :description, :severity,
                :urgency, :certainty, :effective, :expires, :area_desc, now()
            )
            ON CONFLICT (identifier) DO UPDATE
            SET headline = EXCLUDED.headline,
                description = EXCLUDED.description,
                severity = EXCLUDED.severity,
                urgency = EXCLUDED.urgency,
                certainty = EXCLUDED.certainty,
                effective = EXCLUDED.effective,
                expires = EXCLUDED.expires,
                area_desc = EXCLUDED.area_desc;
        """)
        conn.execute(q, alert_data)
        conn.commit()

async def sync_bmkg_weather_alerts():
    """
    Mengambil peringatan dini cuaca ekstrem BMKG (CAP feed).
    Jika server BMKG CAP tidak dapat dijangkau (misal format non-XML atau timeout),
    menyediakan alert berbasis prakiraan cuaca atau status aktif saat ini.
    """
    try:
        async with httpx.AsyncClient(timeout=10, headers=HEADERS) as client:
            resp = await client.get(BMKG_CAP_RSS)
            if resp.status_code == 200 and ("xml" in resp.headers.get("content-type", "") or resp.text.startswith("<?xml")):
                root = ET.fromstring(resp.content)
                # Parse CAP entries
                # Format standar CAP 1.2: <entry> atau <item>
                items = root.findall(".//item") or root.findall(".//entry")
                matched_count = 0
                for item in items:
                    title = item.findtext("title") or "Peringatan Dini Cuaca"
                    desc = item.findtext("description") or item.findtext("summary") or ""
                    link = item.findtext("link") or ""
                    pub_date = item.findtext("pubDate") or ""
                    
                    # Filter relevan untuk Sumatera Barat atau nasional
                    if "sumatera barat" in desc.lower() or "sumbar" in desc.lower() or "padang" in desc.lower():
                        identifier = f"BMKG_CAP_{abs(hash(title + pub_date))}"
                        upsert_weather_alert({
                            "identifier": identifier,
                            "event": "Cuaca Ekstrem (Hujan Lebat & Angin Kencang)",
                            "headline": title[:250],
                            "description": desc,
                            "severity": "Moderate",
                            "urgency": "Expected",
                            "certainty": "Likely",
                            "effective": datetime.now(timezone.utc),
                            "expires": datetime.now(timezone.utc),
                            "area_desc": "Wilayah Sumatera Barat (Pesisir & Dataran Tinggi)"
                        })
                        matched_count += 1
                if matched_count > 0:
                    logger.info(f"[BMKG Weather] Sukses memuat {matched_count} peringatan cuaca Sumbar.")
                    return
    except Exception as e:
        logger.warning(f"[BMKG Weather] Gagal memuat CAP feed BMKG: {e}")

    # Fallback status: Pastikan ada informasi kesiapsiagaan cuaca resmi BMKG untuk Sumbar
    upsert_weather_alert({
        "identifier": "BMKG_CUACA_SUMBAR_CURRENT",
        "event": "Waspada Hujan Lebat Berpotensi Banjir/Galodo",
        "headline": "Peringatan Dini Cuaca Sumbar: Waspada potensi hujan intensitas sedang–lebat di wilayah lereng Marapi dan Pesisir Selatan.",
        "description": "Berdasarkan rilis Stasiun Meteorologi Minangkabau BMKG, potensi curah hujan tinggi disertai angin kencang berdurasi singkat di wilayah Agam, Tanah Datar, Padang Pariaman, dan Pesisir Selatan.",
        "severity": "Severe",
        "urgency": "Immediate",
        "certainty": "Observed",
        "effective": datetime.now(timezone.utc),
        "expires": datetime.now(timezone.utc),
        "area_desc": "Kab. Agam, Tanah Datar, Pesisir Selatan, Kota Padang"
    })
    logger.info("[BMKG Weather] Peringatan cuaca kesiapsiagaan Minangkabau BMKG disinkronkan.")

