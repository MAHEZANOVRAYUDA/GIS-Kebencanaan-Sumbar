"""
Script Ingestion Hierarki Wilayah Administratif Resmi Provinsi Sumatera Barat
Mengambil 19 Kabupaten/Kota & Kecamatan dari API Kode Wilayah (Kemendagri/BPS)
dan menyinkronkannya ke tabel PostGIS wilayah_administratif.
"""
import sys
import os
import httpx
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import sync_engine

# Koordinat Pusat Indikatif 19 Kabupaten/Kota (10-katalog-data-sumbar.md)
KAB_KOTA_CENTROIDS = {
    1301: {"lat": -1.3667, "lon": 100.5667, "name": "Kabupaten Pesisir Selatan"},
    1302: {"lat": -0.8000, "lon": 100.7000, "name": "Kabupaten Solok"},
    1303: {"lat": -0.6833, "lon": 100.9500, "name": "Kabupaten Sijunjung"},
    1304: {"lat": -0.4500, "lon": 100.5833, "name": "Kabupaten Tanah Datar"},
    1305: {"lat": -0.5833, "lon": 100.2000, "name": "Kabupaten Padang Pariaman"},
    1306: {"lat": -0.3167, "lon": 100.1000, "name": "Kabupaten Agam"},
    1307: {"lat": -0.1667, "lon": 100.6667, "name": "Kabupaten Lima Puluh Kota"},
    1308: {"lat": -0.1167, "lon": 100.0833, "name": "Kabupaten Pasaman"},
    1309: {"lat": -1.8833, "lon": 99.6667, "name": "Kabupaten Kepulauan Mentawai"},
    1310: {"lat": -1.0500, "lon": 101.5833, "name": "Kabupaten Dharmasraya"},
    1311: {"lat": -1.4500, "lon": 101.2667, "name": "Kabupaten Solok Selatan"},
    1312: {"lat": 0.1333, "lon": 99.8833, "name": "Kabupaten Pasaman Barat"},
    1371: {"lat": -0.9471, "lon": 100.4172, "name": "Kota Padang"},
    1372: {"lat": -0.7900, "lon": 100.6500, "name": "Kota Solok"},
    1373: {"lat": -0.6833, "lon": 100.7833, "name": "Kota Sawahlunto"},
    1374: {"lat": -0.4600, "lon": 100.4000, "name": "Kota Padang Panjang"},
    1375: {"lat": -0.3056, "lon": 100.3692, "name": "Kota Bukittinggi"},
    1376: {"lat": -0.2333, "lon": 100.6333, "name": "Kota Payakumbuh"},
    1377: {"lat": -0.6167, "lon": 100.1167, "name": "Kota Pariaman"},
}

def create_bounding_box_geom(lon, lat, delta_x=0.10, delta_y=0.08):
    """Membuat MultiPolygon WGS84 di sekitar centroid wilayah."""
    x1, y1 = lon - delta_x, lat - delta_y
    x2, y2 = lon + delta_x, lat + delta_y
    wkt = f"MULTIPOLYGON((({x1} {y1}, {x2} {y1}, {x2} {y2}, {x1} {y2}, {x1} {y1})))"
    return wkt

def ingest_wilayah():
    print(">>> Menghubungi API Kode Wilayah (https://api.kodewilayah.web.id)...")
    headers = {"User-Agent": "gis-sumbar-research/1.0"}
    
    try:
        resp = httpx.get("https://api.kodewilayah.web.id/regencies/13", headers=headers, timeout=15)
        resp.raise_for_status()
        regencies = resp.json().get("data", [])
        print(f"  -> Diterima {len(regencies)} data Kabupaten/Kota resmi Sumbar.")
    except Exception as e:
        print(f"  [ERROR] Gagal mengambil regencies dari API: {e}")
        return

    with sync_engine.connect() as conn:
        # 1. Pastikan entri Provinsi Sumbar (ID=1 atau kode='13')
        prov = conn.execute(text("SELECT id FROM wilayah_administratif WHERE kode_wilayah = '13' LIMIT 1")).fetchone()
        if not prov:
            insert_prov = text("""
                INSERT INTO wilayah_administratif (kode_wilayah, nama, level, geom, populasi, created_at, updated_at)
                VALUES ('13', 'Provinsi Sumatera Barat', 'provinsi', 
                        ST_Multi(ST_MakeEnvelope(98.5, -3.6, 101.95, 1.0, 4326)), 5600000, now(), now())
                RETURNING id;
            """)
            prov_id = conn.execute(insert_prov).scalar()
        else:
            prov_id = prov[0]

        # 2. Ingest 19 Kabupaten/Kota
        kab_id_map = {}
        for r in regencies:
            code_str = str(r["code"])
            name = r["name"]
            code_int = int(r["code"])

            centroid = KAB_KOTA_CENTROIDS.get(code_int, {"lat": -0.85, "lon": 100.45})
            is_kota = "Kota" in name
            delta = 0.05 if is_kota else 0.12
            geom_wkt = create_bounding_box_geom(centroid["lon"], centroid["lat"], delta_x=delta, delta_y=delta)

            existing = conn.execute(
                text("SELECT id FROM wilayah_administratif WHERE kode_wilayah = :code LIMIT 1"),
                {"code": code_str}
            ).fetchone()

            if existing:
                kab_id = existing[0]
                conn.execute(
                    text("UPDATE wilayah_administratif SET nama = :name, parent_id = :parent_id WHERE id = :id"),
                    {"name": name, "parent_id": prov_id, "id": kab_id}
                )
                print(f"  [SYNC KAB] {name} ({code_str}) -> ID {kab_id}")
            else:
                insert_kab = text("""
                    INSERT INTO wilayah_administratif (kode_wilayah, nama, level, parent_id, geom, populasi, created_at, updated_at)
                    VALUES (:code, :name, 'kabupaten', :parent_id, ST_GeomFromText(:wkt, 4326), 250000, now(), now())
                    RETURNING id;
                """)
                kab_id = conn.execute(insert_kab, {
                    "code": code_str, "name": name, "parent_id": prov_id, "wkt": geom_wkt
                }).scalar()
                print(f"  [INSERT KAB] {name} ({code_str}) -> ID {kab_id}")
            
            kab_id_map[code_int] = kab_id

        conn.commit()

        # 3. Ingest Kecamatan untuk tiap kabupaten/kota
        print("\n>>> Sinkronisasi Kecamatan per Kabupaten/Kota...")
        total_kec_synced = 0
        for code_int, kab_db_id in kab_id_map.items():
            try:
                kec_url = f"https://api.kodewilayah.web.id/districts/{code_int}"
                kec_resp = httpx.get(kec_url, headers=headers, timeout=15)
                if kec_resp.status_code != 200:
                    continue
                districts = kec_resp.json().get("data", [])

                centroid_kab = KAB_KOTA_CENTROIDS.get(code_int, {"lat": -0.85, "lon": 100.45})
                lat_base = centroid_kab["lat"]
                lon_base = centroid_kab["lon"]

                for idx, d in enumerate(districts):
                    d_code = str(d["code"])
                    d_name = d["name"]

                    # Grid offset kecil untuk tiap kecamatan
                    row = idx // 4
                    col = idx % 4
                    d_lon = lon_base + (col - 1.5) * 0.035
                    d_lat = lat_base + (row - 1.5) * 0.030
                    d_wkt = create_bounding_box_geom(d_lon, d_lat, delta_x=0.016, delta_y=0.014)

                    existing_d = conn.execute(
                        text("SELECT id FROM wilayah_administratif WHERE kode_wilayah = :code LIMIT 1"),
                        {"code": d_code}
                    ).fetchone()

                    if existing_d:
                        conn.execute(
                            text("UPDATE wilayah_administratif SET nama = :name, parent_id = :parent_id WHERE id = :id"),
                            {"name": d_name, "parent_id": kab_db_id, "id": existing_d[0]}
                        )
                    else:
                        conn.execute(
                            text("""
                                INSERT INTO wilayah_administratif (kode_wilayah, nama, level, parent_id, geom, populasi, created_at, updated_at)
                                VALUES (:code, :name, 'kecamatan', :parent_id, ST_GeomFromText(:wkt, 4326), 35000, now(), now())
                            """),
                            {"code": d_code, "name": d_name, "parent_id": kab_db_id, "wkt": d_wkt}
                        )
                    total_kec_synced += 1

                conn.commit()
                print(f"  [OK] {KAB_KOTA_CENTROIDS.get(code_int, {}).get('name', code_int)}: {len(districts)} kecamatan tersinkron.")
            except Exception as ex:
                print(f"  [WARN] Gagal sinkron kecamatan kab {code_int}: {ex}")

        print(f"\n>>> Sukses! Total {total_kec_synced} kecamatan tersinkronisasi ke basis data PostGIS.")

if __name__ == "__main__":
    ingest_wilayah()
