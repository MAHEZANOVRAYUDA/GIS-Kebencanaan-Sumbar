import httpx
import json
import logging
import math
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings

logger = logging.getLogger(__name__)

def translate_maneuver_to_indonesian(step: dict, posko_nama: str = "Tujuan") -> str:
    """
    Menerjemahkan instruksi manuver OSRM/Valhalla ke Bahasa Indonesia yang alami & jelas.
    """
    maneuver = step.get("maneuver", {})
    m_type = maneuver.get("type", "")
    modifier = maneuver.get("modifier", "")
    name = step.get("name", "").strip()
    jalan_label = f" {name}" if name else ""

    if m_type == "depart":
        return f"Mulai perjalanan menuju{jalan_label}"
    elif m_type == "arrive":
        return f"Tiba di posko evakuasi: {posko_nama}"
    elif m_type in ("turn", "end of road"):
        if "slight right" in modifier:
            return f"Sedikit serong kanan ke{jalan_label}"
        elif "slight left" in modifier:
            return f"Sedikit serong kiri ke{jalan_label}"
        elif "sharp right" in modifier:
            return f"Belok tajam ke kanan ke{jalan_label}"
        elif "sharp left" in modifier:
            return f"Belok tajam ke kiri ke{jalan_label}"
        elif "right" in modifier:
            return f"Belok kanan ke{jalan_label}"
        elif "left" in modifier:
            return f"Belok kiri ke{jalan_label}"
        elif "uturn" in modifier:
            return f"Putar balik di{jalan_label}"
        return f"Belok arah ke{jalan_label}"
    elif m_type in ("new name", "continue"):
        return f"Lurus terus mengikuti{jalan_label}" if jalan_label else "Lurus terus di jalan utama"
    elif m_type == "roundabout":
        exit_num = maneuver.get("exit", 1)
        return f"Di bundaran, ambil jalur keluar ke-{exit_num} menuju{jalan_label}"
    elif m_type == "merge":
        return f"Bergabung ke jalur{jalan_label}"
    elif m_type == "fork":
        return f"Di persimpangan jalan bercabang, ambil jalur ke {modifier} menuju{jalan_label}"
    
    return f"Lanjutkan perjalanan ke{jalan_label}" if jalan_label else "Lanjutkan perjalanan"

async def get_nearest_posko(db: AsyncSession, lat: float, lon: float, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Mencari posko evakuasi terdekat menggunakan operator KNN PostGIS (<->)
    yang memanfaatkan index spatial GIST untuk query instan (<5ms).
    """
    query = text("""
        SELECT 
            id, nama, jenis, kapasitas, fasilitas, kontak_pic, kontak_telepon,
            ST_X(lokasi) AS lon, ST_Y(lokasi) AS lat,
            ST_Distance(lokasi::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS jarak_meter
        FROM posko_evakuasi
        WHERE status = 'aktif' AND (jenis IS NULL OR jenis != 'sirine_tsunami')
        ORDER BY lokasi <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
        LIMIT :limit;
    """)
    result = await db.execute(query, {"lat": lat, "lon": lon, "limit": limit})
    rows = result.fetchall()
    
    poskos = []
    for r in rows:
        poskos.append({
            "id": r.id,
            "nama": r.nama,
            "jenis": r.jenis,
            "kapasitas": r.kapasitas,
            "fasilitas": r.fasilitas or [],
            "kontak_pic": r.kontak_pic,
            "kontak_telepon": r.kontak_telepon,
            "lat": float(r.lat),
            "lon": float(r.lon),
            "jarak_garis_lurus_m": float(r.jarak_meter)
        })
    return poskos

async def get_active_road_closures(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Mengambil ruas jalan terputus aktif beserta polygon buffer 30m di sekitarnya.
    """
    query = text("""
        SELECT 
            id, alasan, deskripsi,
            ST_AsGeoJSON(geom) AS line_geojson,
            ST_AsGeoJSON(ST_Buffer(geom::geography, 30)::geometry) AS buffer_geojson
        FROM jalan_terputus
        WHERE status = 'aktif';
    """)
    result = await db.execute(query)
    rows = result.fetchall()

    closures = []
    for r in rows:
        closures.append({
            "id": r.id,
            "alasan": r.alasan,
            "deskripsi": r.deskripsi,
            "line": json.loads(r.line_geojson),
            "buffer": json.loads(r.buffer_geojson)
        })
    return closures

async def hitung_rute_osrm(
    start_lat: float, start_lon: float,
    dest_lat: float, dest_lon: float,
    posko_info: dict,
    avoid_waypoint: Optional[tuple[float, float]] = None
) -> Optional[Dict[str, Any]]:
    """
    Menghitung rute melalui OSRM backend API.
    Mendukung server lokal (http://127.0.0.1:5000) dan fallback otomatis ke router.project-osrm.org.
    """
    # Bentuk waypoint koordinat (lon,lat;lon,lat)
    if avoid_waypoint:
        # Menambahkan waypoint detour untuk menghindari ruas jalan terputus
        coords_str = f"{start_lon:.6f},{start_lat:.6f};{avoid_waypoint[0]:.6f},{avoid_waypoint[1]:.6f};{dest_lon:.6f},{dest_lat:.6f}"
    else:
        coords_str = f"{start_lon:.6f},{start_lat:.6f};{dest_lon:.6f},{dest_lat:.6f}"

    urls_to_try = [
        f"{settings.OSRM_URL}/route/v1/driving/{coords_str}?overview=full&geometries=geojson&steps=true",
        f"{settings.OSRM_FALLBACK_URL}/route/v1/driving/{coords_str}?overview=full&geometries=geojson&steps=true"
    ]

    # Timeout responsif: jika local OSRM down, segera alihkan ke fallback
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0, connect=1.0)) as client:
        for url in urls_to_try:
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    routes = data.get("routes", [])
                    if routes:
                        r = routes[0]
                        legs = r.get("legs", [])
                        
                        instruksi = []
                        for leg in legs:
                            for step in leg.get("steps", []):
                                dist = round(step.get("distance", 0))
                                teks = translate_maneuver_to_indonesian(step, posko_info["nama"])
                                # Jangan duplikasi instruksi jarak 0 beruntun
                                if instruksi and instruksi[-1]["teks"] == teks and dist == 0:
                                    continue
                                instruksi.append({
                                    "teks": teks,
                                    "jarak_m": dist,
                                    "nama_jalan": step.get("name", "")
                                })

                        return {
                            "posko": posko_info,
                            "jarak_km": round(r.get("distance", 0) / 1000.0, 2),
                            "estimasi_menit": max(1, math.ceil(r.get("duration", 0) / 60.0)),
                            "duration_detik": r.get("duration", 0),
                            "geometry": r.get("geometry", {}),
                            "instruksi": instruksi
                        }
            except Exception as e:
                logger.debug(f"OSRM request failed on {url}: {e}")
                continue

    return None

async def hitung_rute_valhalla(
    start_lat: float, start_lon: float,
    dest_lat: float, dest_lon: float,
    posko_info: dict,
    exclude_polygons: List[List[List[float]]]
) -> Optional[Dict[str, Any]]:
    """
    Menghitung rute melalui Valhalla dengan exclude_polygons.
    """
    payload = {
        "locations": [
            {"lat": start_lat, "lon": start_lon},
            {"lat": dest_lat, "lon": dest_lon}
        ],
        "costing": "auto",
        "costing_options": {
            "auto": {
                "exclude_polygons": exclude_polygons
            }
        },
        "directions_options": {
            "units": "kilometers",
            "language": "id-ID"
        }
    }

    try:
        # Timeout cepat untuk pengecekan Valhalla service lokal
        async with httpx.AsyncClient(timeout=httpx.Timeout(1.5, connect=0.5)) as client:
            resp = await client.post(f"{settings.VALHALLA_URL}/route", json=payload)

            if resp.status_code == 200:
                data = resp.json()
                trip = data.get("trip", {})
                summary = trip.get("summary", {})
                legs = trip.get("legs", [])
                
                instruksi = []
                coords = []
                for leg in legs:
                    # Parse maneuvers
                    for man in leg.get("maneuvers", []):
                        instruksi.append({
                            "teks": man.get("instruction", "Lanjutkan rute"),
                            "jarak_m": round(man.get("length", 0) * 1000)
                        })
                    # Valhalla shape decoding (polyline)
                    # Jika GeoJSON tersedia
                    if "shape" in leg:
                        # Valhalla encoded shape
                        pass

                return {
                    "posko": posko_info,
                    "jarak_km": round(summary.get("length", 0), 2),
                    "estimasi_menit": max(1, math.ceil(summary.get("time", 0) / 60.0)),
                    "duration_detik": summary.get("time", 0),
                    "geometry": {"type": "LineString", "coordinates": coords},
                    "instruksi": instruksi
                }
    except Exception as e:
        logger.warning(f"Valhalla service tidak dapat dihubungi: {e}")

    return None

from shapely.geometry import shape as shapely_shape

def check_route_intersects_closures(route_geom: dict, closures: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Memeriksa secara spasial apakah LineString rute memotong polygon buffer jalan terputus.
    Mengembalikan daftar ruas jalan terputus yang benar-benar dilintasi rute.
    """
    if not closures or not route_geom or not route_geom.get("coordinates"):
        return []
    try:
        route_line = shapely_shape(route_geom)
        intersecting = []
        for cl in closures:
            buf_geom = cl.get("buffer")
            if buf_geom and buf_geom.get("coordinates"):
                poly = shapely_shape(buf_geom)
                if route_line.intersects(poly):
                    intersecting.append(cl)
        return intersecting
    except Exception as e:
        logger.warning(f"Gagal memeriksa interseksi spasial rute: {e}")
        return []

def find_avoidance_waypoint(
    start_lat: float, start_lon: float,
    dest_lat: float, dest_lon: float,
    closures: List[Dict[str, Any]]
) -> Optional[tuple[float, float]]:
    """
    Algoritma Detour Penghindar Rintangan Bencana:
    Menghasilkan titik perantara (waypoint offset) yang mengelilingi rintangan jalan terputus.
    Hanya dipanggil jika ruas jalan terputus memang berada di antara rute evakuasi.
    """
    if not closures:
        return None

    # Ambil koordinat tengah rintangan yang bersilangan
    c = closures[0]
    line_coords = c["line"].get("coordinates", [])
    if not line_coords:
        return None

    # Hitung centroid ruas putus
    mid_lon = sum(pt[0] for pt in line_coords) / len(line_coords)
    mid_lat = sum(pt[1] for pt in line_coords) / len(line_coords)

    # Vektor dari start ke dest
    dx = dest_lon - start_lon
    dy = dest_lat - start_lat
    length = math.hypot(dx, dy)
    if length < 0.0001:
        return None

    # Vektor normal tegak lurus
    norm_x = -dy / length
    norm_y = dx / length

    # Geser 400m-600m (sekitar 0.005 derajat) menjauhi titik putus
    offset_dist = 0.005
    waypoint_lon = mid_lon + norm_x * offset_dist
    waypoint_lat = mid_lat + norm_y * offset_dist

    return (waypoint_lon, waypoint_lat)

async def kalkulasi_evakuasi_darurat(
    db: AsyncSession,
    lat: float,
    lon: float,
    moda: str = "mobil"
) -> Dict[str, Any]:
    """
    Alur terintegrasi navigasi evakuasi darurat sadar-blokade (06-routing-evakuasi.md):
    1. Cari 3 posko terdekat via PostGIS KNN (<->)
    2. Cek apakah ada jalan terputus aktif di database
    3. Evaluasi rute langsung ke setiap posko
    4. Cek interseksi spasial: HANYA lakukan pengalihan jika rute langsung memotong jalan putus!
    5. Kembalikan paket rute tercepat dan teraman beserta instruksi turn-by-turn
    """
    # 1. 3 Posko terdekat
    poskos = await get_nearest_posko(db, lat, lon, limit=3)
    if not poskos:
        raise ValueError("Tidak ditemukan posko evakuasi aktif dalam basis data.")

    # 2. Cek jalan terputus aktif
    jalan_putus = await get_active_road_closures(db)
    rute_kandidat = []

    for posko in poskos:
        # Langkah A: Hitung rute normal tercepat langsung via OSRM
        rute_langsung = await hitung_rute_osrm(lat, lon, posko["lat"], posko["lon"], posko)

        if not rute_langsung:
            # Fallback jika jaringan/OSRM offline: garis lurus darurat
            jarak_garis_lurus = posko.get("jarak_garis_lurus_m", 1000) / 1000.0
            rute_langsung = {
                "posko": posko,
                "jarak_km": round(jarak_garis_lurus, 2),
                "estimasi_menit": max(2, math.ceil(jarak_garis_lurus * 2.5)),
                "duration_detik": jarak_garis_lurus * 150,
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[lon, lat], [posko["lon"], posko["lat"]]]
                },
                "instruksi": [
                    {"teks": "Mulai evakuasi dari lokasi Anda", "jarak_m": 0},
                    {"teks": "Bergerak lurus ke arah posko darurat", "jarak_m": round(jarak_garis_lurus * 1000)},
                    {"teks": f"Tiba di posko evakuasi: {posko['nama']}", "jarak_m": 0}
                ],
                "menghindari_blokade": False
            }

        # Langkah B: Cek apakah rute langsung ini bersilangan dengan jalan terputus
        conflicting_closures = check_route_intersects_closures(
            rute_langsung.get("geometry", {}), 
            jalan_putus
        )

        if not conflicting_closures:
            # RUTE AMAN: Tidak ada halangan jalan terputus di sepanjang koridor ini!
            rute_langsung["menghindari_blokade"] = False
            rute_kandidat.append(rute_langsung)
            continue

        # Langkah C: Rute langsung TERHALANG bencana! Cari rute alternatif pengalihan
        logger.info(f"[-] Rute ke {posko['nama']} memotong {len(conflicting_closures)} blokade jalan! Mencari jalan alternatif...")
        rute_alternatif = None

        # Coba Valhalla jika aktif (mendukung exclude polygon dinamis)
        exclude_polys = []
        for cl in conflicting_closures:
            poly_coords = cl["buffer"].get("coordinates", [])
            if poly_coords:
                exclude_polys.append(poly_coords)

        if exclude_polys:
            rute_alternatif = await hitung_rute_valhalla(
                lat, lon, posko["lat"], posko["lon"], posko, exclude_polys
            )

        # Jika Valhalla offline / tidak menghasilkan rute, gunakan detour waypoint OSRM
        if not rute_alternatif or not rute_alternatif.get("geometry", {}).get("coordinates"):
            waypoint = find_avoidance_waypoint(lat, lon, posko["lat"], posko["lon"], conflicting_closures)
            if waypoint:
                rute_detour = await hitung_rute_osrm(
                    lat, lon, posko["lat"], posko["lon"], posko, avoid_waypoint=waypoint
                )
                if rute_detour:
                    rute_alternatif = rute_detour

        if rute_alternatif:
            rute_alternatif["menghindari_blokade"] = True
            rute_kandidat.append(rute_alternatif)
        else:
            # Jika tidak ada alternatif yang ditemukan, sertakan rute langsung dengan penanda
            rute_langsung["menghindari_blokade"] = True
            rute_kandidat.append(rute_langsung)

    # Pilih rute terbaik (durasi tercepat)
    rute_terpilih = min(rute_kandidat, key=lambda r: r.get("duration_detik", float("inf")))

    estimasi = rute_terpilih["estimasi_menit"]
    instruksi = list(rute_terpilih["instruksi"])

    if moda in ("jalan_kaki", "pejalan_kaki", "foot"):
        # Kecepatan jalan kaki darurat rata-rata 4.5 km/jam
        estimasi = max(1, round((rute_terpilih["jarak_km"] / 4.5) * 60))
        if instruksi and len(instruksi) > 0:
            if instruksi[0]["teks"].startswith("Mulai perjalanan"):
                instruksi[0]["teks"] = instruksi[0]["teks"].replace("Mulai perjalanan", "Mulai berjalan kaki / lari evakuasi")

    # Jika posko tujuan adalah shelter TES vertikal, perjelas instruksi tiba
    if rute_terpilih["posko"].get("jenis") == "shelter_tes_tea":
        if instruksi and len(instruksi) > 0:
            instruksi[-1]["teks"] = f"Tiba di Shelter Vertikal Tsunami: {rute_terpilih['posko']['nama']}. Segera naik ke lantai aman!"

    return {
        "posko": rute_terpilih["posko"],
        "jarak_km": rute_terpilih["jarak_km"],
        "estimasi_menit": estimasi,
        "geometry": rute_terpilih["geometry"],
        "instruksi": instruksi,
        "menghindari_blokade": rute_terpilih.get("menghindari_blokade", False)
    }

