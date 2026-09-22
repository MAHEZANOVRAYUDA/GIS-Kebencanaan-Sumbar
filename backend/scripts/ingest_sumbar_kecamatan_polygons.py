"""
Script Ingest Geometri Batas Wilayah Perkecamatan Resmi Provinsi Sumatera Barat (ADM3)
Mengambil 181 poligon kecamatan resmi dari dataset ADM3 BPS/Kemendagri,
memperbarui tabel 'wilayah_administratif' (PostGIS), mengaitkan parent_id ke 19 Kabupaten/Kota,
menghasilkan geom_simplified untuk render cepat LOD, serta me-refresh Materialized View.
"""
import sys
import os
import io
import zipfile
import json
import httpx
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import sync_engine

URL_ADM3_ZIP = "https://raw.githubusercontent.com/bachtiarpanjaitan/geojson-id/master/data/adm3.json.zip"

def download_and_ingest_kecamatan():
    print("=================================================================")
    print(" 1. MENGUNDUH & MEMPROSES GEOMETRI RESMI KECAMATAN SUMATERA BARAT ")
    print("=================================================================")
    
    print(f"[-] Mengunduh dataset ADM3 dari {URL_ADM3_ZIP} ...")
    resp = httpx.get(URL_ADM3_ZIP, timeout=120)
    resp.raise_for_status()
    print(f"[+] Berhasil mengunduh zip ({len(resp.content)} bytes). Mengekstrak adm3.json...")
    
    zf = zipfile.ZipFile(io.BytesIO(resp.content))
    with zf.open("adm3.json") as f:
        all_districts = json.load(f)
    print(f"[+] Total kecamatan nasional: {len(all_districts)}")

    # Filter seluruh kecamatan di Sumatera Barat (adm1_code == 'ID13' atau adm1 == 'Sumatera Barat')
    sumbar_districts = [
        d for d in all_districts 
        if d.get("adm1_code") == "ID13" or d.get("adm1") == "Sumatera Barat"
    ]
    print(f"[+] Ditemukan {len(sumbar_districts)} kecamatan di Provinsi Sumatera Barat.")

    # Simpan salinan lokal GeoJSON murni untuk cache offline & backup
    os.makedirs("gis-data/raw", exist_ok=True)
    local_geojson_path = "gis-data/raw/sumbar_kecamatan_adm3.geojson"
    features = []
    for d in sumbar_districts:
        raw_coords = d.get("coordinates")
        if not raw_coords:
            continue
        try:
            fc = json.loads(raw_coords) if isinstance(raw_coords, str) else raw_coords
            geom = fc["features"][0]["geometry"]
            if isinstance(geom, str):
                geom = json.loads(geom)
            features.append({
                "type": "Feature",
                "properties": {
                    "id": d.get("id"),
                    "code": d.get("code"),
                    "name": d.get("name"),
                    "kabupaten": d.get("adm2"),
                    "adm2_code": d.get("adm2_code"),
                    "x": d.get("x"),
                    "y": d.get("y"),
                },
                "geometry": geom
            })
        except Exception as e:
            print(f"[!] Warning parsing geometry for {d.get('name')}: {e}")

    with open(local_geojson_path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False)
    print(f"[+] Salinan lokal GeoJSON berhasil disimpan ke {local_geojson_path} ({len(features)} fitur).")

    # Ingest ke Database PostgreSQL / PostGIS
    print("\n=================================================================")
    print(" 2. MEMPERBARUI BASIS DATA POSTGIS (wilayah_administratif)       ")
    print("=================================================================")

    with sync_engine.connect() as conn:
        # Ambil pemetaan 19 Kabupaten/Kota yang ada di wilayah_administratif
        res_kab = conn.execute(text("""
            SELECT id, kode_wilayah, nama FROM wilayah_administratif WHERE level = 'kabupaten'
        """)).fetchall()

        kab_map = {}
        for r in res_kab:
            clean_name = r.nama.lower().replace("kabupaten ", "").replace("kota ", "").strip()
            kab_map[clean_name] = r.id
            # Simpan juga format utuh
            kab_map[r.nama.lower().strip()] = r.id
            # Simpan kode wilayah
            kab_map[str(r.kode_wilayah)] = r.id

        print(f"[+] Master 19 Kabupaten/Kota di DB terdeteksi ({len(res_kab)} entri).")

        updated_count = 0
        inserted_count = 0

        for feat in features:
            props = feat["properties"]
            name = props["name"]
            kab_name = props["kabupaten"] or ""
            geom_json = json.dumps(feat["geometry"])
            code_str = str(props["code"] or "")
            clean_code = code_str.replace("ID", "").strip()

            # Tentukan parent_id kabupaten
            clean_kab = kab_name.lower().replace("kabupaten ", "").replace("kota ", "").strip()
            parent_id = kab_map.get(clean_kab) or kab_map.get(kab_name.lower().strip())

            # Fallback pencarian fuzzy nama kabupaten jika belum match
            if not parent_id:
                for k, v in kab_map.items():
                    if k in clean_kab or clean_kab in k:
                        parent_id = v
                        break

            # 1. Cek apakah kecamatan ini sudah ada di tabel wilayah_administratif (berdasarkan nama dan parent_id)
            existing = conn.execute(text("""
                SELECT id FROM wilayah_administratif 
                WHERE level = 'kecamatan' 
                  AND (
                    LOWER(nama) = LOWER(:nama) 
                    OR kode_wilayah = :code
                    OR kode_wilayah = :clean_code
                  )
                LIMIT 1
            """), {"nama": name, "code": code_str, "clean_code": clean_code}).fetchone()

            if existing:
                # Update baris yang sudah ada dengan geometri asli + parent_id yang valid
                conn.execute(text("""
                    UPDATE wilayah_administratif 
                    SET 
                        geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326)),
                        geom_simplified = ST_Multi(ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326), 0.001)),
                        parent_id = COALESCE(:parent_id, parent_id),
                        kode_wilayah = COALESCE(NULLIF(kode_wilayah, ''), :clean_code),
                        updated_at = now()
                    WHERE id = :id
                """), {
                    "geom_json": geom_json,
                    "parent_id": parent_id,
                    "clean_code": clean_code,
                    "id": existing[0]
                })
                updated_count += 1
            else:
                # Insert kecamatan baru jika belum tercatat di DB
                conn.execute(text("""
                    INSERT INTO wilayah_administratif (
                        kode_wilayah, nama, level, parent_id, populasi, geom, geom_simplified, created_at, updated_at
                    ) VALUES (
                        :clean_code, :nama, 'kecamatan', :parent_id, 35000,
                        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326)),
                        ST_Multi(ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326), 0.001)),
                        now(), now()
                    )
                """), {
                    "clean_code": clean_code,
                    "nama": name,
                    "parent_id": parent_id,
                    "geom_json": geom_json
                })
                inserted_count += 1

        conn.commit()
        print(f"[+] Selesai sinkronisasi PostGIS! Diperbarui: {updated_count}, Ditambahkan baru: {inserted_count}.")

        # 3. Refresh Materialized View & Spatial Index
        print("\n=================================================================")
        print(" 3. ME-REFRESH SPATIAL INDEX & MATERIALIZED VIEW                 ")
        print("=================================================================")
        try:
            conn.execute(text("REINDEX TABLE wilayah_administratif;"))
            conn.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan;"))
            conn.commit()
            print("[+] Spatial index & mv_dampak_per_kecamatan berhasil di-refresh.")
        except Exception as ex:
            print(f"[!] Info reindex/refresh MV: {ex}")

        # 4. Verifikasi Akhir Jumlah Geometri Kecamatan
        res_check = conn.execute(text("""
            SELECT level, count(*) as total, count(geom) as bergeometri, count(geom_simplified) as simplified
            FROM wilayah_administratif
            GROUP BY level
            ORDER BY level;
        """)).fetchall()

        print("\n=== STATUS DATA WILAYAH SETELAH INGESTION ===")
        for r in res_check:
            print(f"- Level '{r.level}': Total {r.total} baris, {r.bergeometri} memiliki poligon geometri aktif.")

if __name__ == "__main__":
    download_and_ingest_kecamatan()
