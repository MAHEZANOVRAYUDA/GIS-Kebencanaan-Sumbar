import httpx
import json
import logging
import math
from typing import List, Dict, Any, Optional, Union
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
            id, nama, jenis, alamat, kapasitas, fasilitas, kontak_pic, kontak_telepon,
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
            "alamat": r.alamat or "Sumatera Barat",
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
            ST_AsGeoJSON(ST_Buffer(geom, 0.0003)) AS buffer_geojson
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

def classify_disaster_flow(jenis_bencana: Optional[str]) -> str:
    """
    Menentukan alur evakuasi:
    - 'ALUR_A' untuk bencana Tsunami (memeriksa zonasi rendaman & shelter di luar zona bahaya)
    - 'ALUR_B' untuk Non-Tsunami seperti gempa bumi, galodo/banjir lahar, longsor, dll (posko terdekat dalam kecamatan)
    """
    if not jenis_bencana:
        return "ALUR_B"
    jb = jenis_bencana.strip().lower()
    if "tsunami" in jb:
        return "ALUR_A"
    return "ALUR_B"

async def get_user_tsunami_zone(db: AsyncSession, lat: float, lon: float) -> Dict[str, Any]:
    """
    Mendeteksi zonasi tsunami titik pengguna berdasarkan poligon spasial PostGIS ST_Contains.
    """
    query = text("""
        SELECT nama_zona, zona, tingkat_bahaya, kedalaman_rendaman, deskripsi
        FROM zonasi_tsunami
        WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
        ORDER BY CASE WHEN zona = 'merah' THEN 1 WHEN zona = 'kuning' THEN 2 ELSE 3 END ASC
        LIMIT 1;
    """)
    row = (await db.execute(query, {"lat": lat, "lon": lon})).fetchone()
    if row:
        return {
            "zona": row.zona,
            "nama_zona": row.nama_zona,
            "tingkat_bahaya": row.tingkat_bahaya,
            "kedalaman_rendaman": row.kedalaman_rendaman,
            "deskripsi": row.deskripsi
        }
    return {
        "zona": "hijau",
        "nama_zona": "Zona Hijau (Luar Rendaman Tsunami)",
        "tingkat_bahaya": "Zona Aman (> 15m dpl / Daratan Aman)",
        "kedalaman_rendaman": "0 Meter",
        "deskripsi": "Lokasi berada di luar peta zona rendaman tsunami pesisir."
    }

async def get_tsunami_safe_shelters(db: AsyncSession, lat: float, lon: float, limit: int = 3) -> List[Dict[str, Any]]:
    """
    ALUR A — TSUNAMI:
    Mencari shelter / titik aman tsunami terdekat dari lokasi pengguna yang:
    1. Berupa shelter vertikal bersertifikasi ('shelter_tes_tea' yang memiliki lantai aman lt3+), ATAU
    2. Berada di luar zona merah bahaya (di zona hijau aman / timur bypass).
    Diurutkan berdasarkan kedekatan jarak spasial.
    """
    query = text("""
        SELECT 
            p.id, p.nama, p.jenis, p.alamat, p.kapasitas, p.fasilitas, p.kontak_pic, p.kontak_telepon,
            ST_X(p.lokasi) AS lon, ST_Y(p.lokasi) AS lat,
            ST_Distance(p.lokasi::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS jarak_meter,
            COALESCE(z.zona, 'hijau') AS shelter_zona,
            COALESCE(z.nama_zona, 'Kawasan Aman Terbuka') AS shelter_nama_zona
        FROM posko_evakuasi p
        LEFT JOIN zonasi_tsunami z ON ST_Contains(z.geom, p.lokasi)
        WHERE p.status = 'aktif' 
          AND (p.jenis IS NULL OR p.jenis != 'sirine_tsunami')
          AND (
              p.jenis = 'shelter_tes_tea'
              OR COALESCE(z.zona, 'hijau') = 'hijau'
              OR NOT EXISTS (
                  SELECT 1 FROM zonasi_tsunami zm 
                  WHERE zm.zona = 'merah' AND ST_Contains(zm.geom, p.lokasi)
              )
          )
        ORDER BY p.lokasi <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
        LIMIT :limit;
    """)
    result = await db.execute(query, {"lat": lat, "lon": lon, "limit": limit})
    rows = result.fetchall()

    if not rows:
        return await get_nearest_posko(db, lat, lon, limit=limit)

    shelters = []
    for r in rows:
        shelters.append({
            "id": r.id,
            "nama": r.nama,
            "jenis": r.jenis or "shelter_tes_tea",
            "alamat": r.alamat or "Sumatera Barat",
            "kapasitas": r.kapasitas,
            "fasilitas": r.fasilitas or [],
            "kontak_pic": r.kontak_pic,
            "kontak_telepon": r.kontak_telepon,
            "lat": float(r.lat),
            "lon": float(r.lon),
            "jarak_garis_lurus_m": float(r.jarak_meter),
            "shelter_zona": r.shelter_zona,
            "shelter_nama_zona": r.shelter_nama_zona
        })
    return shelters

async def get_posko_in_same_kecamatan(
    db: AsyncSession,
    kecamatan_id: Union[int, str],
    lat: float,
    lon: float,
    limit: int = 3
) -> Dict[str, Any]:
    """
    ALUR B — NON-TSUNAMI (GALODO & GEMPA):
    Mencari posko terdekat yang berada di kecamatan yang sama.
    Mendukung input kecamatan_id berupa Integer ID maupun Kode Wilayah (String, misal '137101').
    Jika kecamatan kosong (kasus data kosong), fallback ke posko terdekat di wilayah induk.
    """
    kec_row = None
    kec_int_id = None
    kec_str_code = str(kecamatan_id).strip()

    if isinstance(kecamatan_id, int) or (isinstance(kecamatan_id, str) and kecamatan_id.isdigit() and len(kecamatan_id) <= 4):
        kec_int_id = int(kecamatan_id)
        kec_q = text("""
            SELECT w.id, w.kode_wilayah, w.nama, w.parent_id, p.nama AS parent_nama
            FROM wilayah_administratif w
            LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
            WHERE w.id = :kecamatan_id;
        """)
        kec_row = (await db.execute(kec_q, {"kecamatan_id": kec_int_id})).fetchone()

    if not kec_row:
        kec_q = text("""
            SELECT w.id, w.kode_wilayah, w.nama, w.parent_id, p.nama AS parent_nama
            FROM wilayah_administratif w
            LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
            WHERE w.kode_wilayah = :code OR w.kode_wilayah LIKE :codep
            ORDER BY w.id ASC
            LIMIT 1;
        """)
        kec_row = (await db.execute(kec_q, {"code": kec_str_code, "codep": f"{kec_str_code}%"})).fetchone()
        if kec_row:
            kec_int_id = kec_row.id

    kec_nama = kec_row.nama if kec_row else "Kecamatan Terpilih"
    kab_nama = kec_row.parent_nama if (kec_row and kec_row.parent_nama) else "Kota/Kabupaten"

    params: Dict[str, Any] = {
        "kec_str_code": kec_str_code,
        "lat": lat,
        "lon": lon,
        "limit": limit
    }
    conds = ["p.id_kecamatan = :kec_str_code"]
    if kec_int_id is not None:
        params["kec_int_id"] = kec_int_id
        conds.append("p.wilayah_id = :kec_int_id")
        conds.append("ST_Contains((SELECT geom FROM wilayah_administratif WHERE id = :kec_int_id), p.lokasi)")
    where_kec = f"({' OR '.join(conds)})"

    query = text(f"""
        SELECT 
            p.id, p.nama, p.jenis, p.alamat, p.kapasitas, p.fasilitas, p.kontak_pic, p.kontak_telepon,
            ST_X(p.lokasi) AS lon, ST_Y(p.lokasi) AS lat,
            ST_Distance(p.lokasi::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS jarak_meter
        FROM posko_evakuasi p
        WHERE p.status = 'aktif'
          AND (p.jenis IS NULL OR p.jenis != 'sirine_tsunami')
          AND {where_kec}
        ORDER BY p.lokasi <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
        LIMIT :limit;
    """)
    result = await db.execute(query, params)
    rows = result.fetchall()

    if rows:
        poskos = []
        for r in rows:
            poskos.append({
                "id": r.id,
                "nama": r.nama,
                "jenis": r.jenis,
                "alamat": r.alamat or f"Kecamatan {kec_nama}",
                "kapasitas": r.kapasitas,
                "fasilitas": r.fasilitas or [],
                "kontak_pic": r.kontak_pic,
                "kontak_telepon": r.kontak_telepon,
                "lat": float(r.lat),
                "lon": float(r.lon),
                "jarak_garis_lurus_m": float(r.jarak_meter)
            })
        return {
            "poskos": poskos,
            "is_fallback": False,
            "fallback_info": None,
            "kecamatan_id": kecamatan_id,
            "kecamatan_nama": kec_nama
        }

    # KASUS DATA KOSONG (FALLBACK CERDAS):
    fallback_poskos = await get_nearest_posko(db, lat, lon, limit=limit)
    return {
        "poskos": fallback_poskos,
        "is_fallback": True,
        "fallback_info": {
            "tipe": "posko_terdekat_lintas_kecamatan",
            "pesan": f"Belum tersedia posko resmi di Kecamatan {kec_nama}. Sistem otomatis mengarahkan ke posko alternatif terdekat di wilayah {kab_nama}.",
            "kecamatan_asal": kec_nama,
            "kabupaten_asal": kab_nama,
            "kontak_darurat": {
                "instansi": f"PUSDALOPS PB {kab_nama} & Provinsi Sumbar",
                "call_center": "112",
                "hotline_bpbd": "0811-666-2113",
                "telepon_kantor": "0751-31580"
            }
        },
        "kecamatan_id": kecamatan_id,
        "kecamatan_nama": kec_nama
    }

async def lookup_kecamatan_from_coords(db: AsyncSession, lat: float, lon: float) -> Optional[int]:
    """
    Menemukan id kecamatan dari koordinat pengguna via ST_Contains.
    """
    query = text("""
        SELECT id FROM wilayah_administratif
        WHERE level = 'kecamatan' AND ST_Contains(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
        LIMIT 1;
    """)
    row = (await db.execute(query, {"lat": lat, "lon": lon})).fetchone()
    return row[0] if row else None

async def kalkulasi_evakuasi_darurat(
    db: AsyncSession,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    kecamatan_id: Optional[Union[int, str]] = None,
    jenis_bencana: Optional[str] = "gempa",
    moda: str = "mobil"
) -> Dict[str, Any]:
    """
    Alur terintegrasi navigasi evakuasi darurat (Spesifikasi Revisi):
    1. Tentukan Alur (Tsunami -> ALUR A, Non-tsunami -> ALUR B)
    2. ALUR A: Rekomendasi shelter di luar zona bahaya / shelter vertikal TES
    3. ALUR B: Rekomendasi posko terdekat dalam kecamatan yang sama (dengan fallback jika kosong)
    4. Cek interseksi spasial dengan jalan terputus & kalkulasi rute OSRM/Valhalla Turn-by-Turn
    """
    # 1. Resolusi koordinat jika lat/lon kosong tapi kecamatan_id ada
    if (lat is None or lon is None) and kecamatan_id:
        cent_q = text("""
            SELECT 
                ST_Y(ST_Centroid(w.geom)) AS lat, 
                ST_X(ST_Centroid(w.geom)) AS lon,
                ST_Y(ST_Centroid(p.geom)) AS parent_lat,
                ST_X(ST_Centroid(p.geom)) AS parent_lon
            FROM wilayah_administratif w
            LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
            WHERE w.id = :id_int OR w.kode_wilayah = :code OR w.kode_wilayah LIKE :codep
            LIMIT 1;
        """)
        id_int_val = int(kecamatan_id) if (isinstance(kecamatan_id, int) or (isinstance(kecamatan_id, str) and kecamatan_id.isdigit() and len(kecamatan_id) <= 4)) else -1
        code_val = str(kecamatan_id).strip()
        crow = (await db.execute(cent_q, {"id_int": id_int_val, "code": code_val, "codep": f"{code_val}%"})).fetchone()
        if crow:
            if crow.lat is not None and crow.lon is not None:
                lat = float(crow.lat)
                lon = float(crow.lon)
            elif crow.parent_lat is not None and crow.parent_lon is not None:
                lat = float(crow.parent_lat)
                lon = float(crow.parent_lon)

    # Default fallback koordinat: Pusat Padang Barat
    if lat is None or lon is None:
        lat, lon = -0.933125, 100.353625

    # 2. Klasifikasi Alur Berdasarkan Jenis Bencana
    alur = classify_disaster_flow(jenis_bencana)
    is_fallback = False
    fallback_info = None
    zonasi_info = None

    if alur == "ALUR_A":
        # ALUR A — TSUNAMI
        user_zone = await get_user_tsunami_zone(db, lat, lon)
        poskos = await get_tsunami_safe_shelters(db, lat, lon, limit=3)
        zonasi_info = {
            "status_lokasi_asal": user_zone,
            "zona_label": user_zone["nama_zona"],
            "tingkat_bahaya": user_zone["tingkat_bahaya"],
            "rekomendasi": "Segera evakuasi ke shelter vertikal TES terdekat atau lintasi Garis Aman Bypass."
        }
    else:
        # ALUR B — NON-TSUNAMI (GALODO & GEMPA)
        if not kecamatan_id:
            kecamatan_id = await lookup_kecamatan_from_coords(db, lat, lon)

        if kecamatan_id:
            kec_res = await get_posko_in_same_kecamatan(db, kecamatan_id, lat, lon, limit=3)
            poskos = kec_res["poskos"]
            is_fallback = kec_res["is_fallback"]
            fallback_info = kec_res["fallback_info"]
        else:
            poskos = await get_nearest_posko(db, lat, lon, limit=3)

    if not poskos:
        raise ValueError("Tidak ditemukan posko atau shelter evakuasi aktif dalam basis data.")

    # 3. Cek jalan terputus aktif & hitung rute
    jalan_putus = await get_active_road_closures(db)
    rute_kandidat = []

    for posko in poskos:
        rute_langsung = await hitung_rute_osrm(lat, lon, posko["lat"], posko["lon"], posko)

        if not rute_langsung:
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
                    {"teks": f"Bergerak menuju posko darurat di {posko.get('alamat', 'lokasi aman')}", "jarak_m": round(jarak_garis_lurus * 1000)},
                    {"teks": f"Tiba di tujuan evakuasi: {posko['nama']}", "jarak_m": 0}
                ],
                "menghindari_blokade": False
            }

        conflicting_closures = check_route_intersects_closures(
            rute_langsung.get("geometry", {}), 
            jalan_putus
        )

        if not conflicting_closures:
            rute_langsung["menghindari_blokade"] = False
            rute_kandidat.append(rute_langsung)
            continue

        rute_alternatif = None
        exclude_polys = [
            cl["buffer"]["coordinates"] for cl in conflicting_closures 
            if cl.get("buffer") and cl["buffer"].get("coordinates")
        ]

        if exclude_polys:
            rute_alternatif = await hitung_rute_valhalla(
                lat, lon, posko["lat"], posko["lon"], posko, exclude_polys
            )

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
            rute_langsung["menghindari_blokade"] = True
            rute_kandidat.append(rute_langsung)

    # Pilih rute tercepat
    rute_terpilih = min(rute_kandidat, key=lambda r: r.get("duration_detik", float("inf")))

    estimasi = rute_terpilih["estimasi_menit"]
    instruksi = list(rute_terpilih["instruksi"])

    if moda in ("jalan_kaki", "pejalan_kaki", "foot"):
        estimasi = max(1, round((rute_terpilih["jarak_km"] / 4.5) * 60))
        if instruksi and len(instruksi) > 0:
            if instruksi[0]["teks"].startswith("Mulai perjalanan"):
                instruksi[0]["teks"] = instruksi[0]["teks"].replace("Mulai perjalanan", "Mulai berjalan kaki / lari evakuasi")

    # Penyempurnaan instruksi khusus Alur A (Tsunami)
    if alur == "ALUR_A":
        if rute_terpilih["posko"].get("jenis") == "shelter_tes_tea":
            if instruksi and len(instruksi) > 0:
                instruksi[-1]["teks"] = f"Tiba di Shelter Vertikal Tsunami: {rute_terpilih['posko']['nama']}. Segera naik ke Lantai 3+ (Zona Bebas Rendaman)!"
        else:
            if instruksi and len(instruksi) > 0:
                instruksi[-1]["teks"] = f"Tiba di Titik Aman Tsunami: {rute_terpilih['posko']['nama']} ({rute_terpilih['posko'].get('alamat', 'Kawasan Aman')})."

    return {
        "alur": alur,
        "jenis_bencana": jenis_bencana or "gempa",
        "posko": rute_terpilih["posko"],
        "jarak_km": rute_terpilih["jarak_km"],
        "estimasi_menit": estimasi,
        "geometry": rute_terpilih["geometry"],
        "instruksi": instruksi,
        "menghindari_blokade": rute_terpilih.get("menghindari_blokade", False),
        "is_fallback": is_fallback,
        "fallback_info": fallback_info,
        "zonasi_info": zonasi_info,
        "kecamatan_id": kecamatan_id
    }


