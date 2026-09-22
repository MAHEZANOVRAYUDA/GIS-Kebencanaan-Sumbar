"""
Script: fix_sumbar_boundaries_accurate.py
Membersihkan dan memetakan secara akurat poligon batas kecamatan resmi se-Sumatera Barat ke PostGIS.
Mencocokkan geometri berdasarkan relasi parent_id (19 Kab/Kota) + kamus alias dialek Minang vs Kemendagri.
Memperbarui geom, geom_simplified, kode_wilayah, serta me-refresh Materialized View dan file GeoJSON lokal.
"""
import sys
import os
import json
import re
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import sync_engine

# Mapping Eksplisit Nama Kabupaten di GeoJSON ADM3 ke ID resmi di Database PostGIS (19 Kab/Kota)
KAB_MAP = {
    'Agam': 4,
    'Dharmasraya': 30,
    'Kepulauan Mentawai': 29,
    'Kota Bukittinggi': 3,
    'Kota Padang': 2,
    'Kota Padang Panjang': 35,
    'Kota Pariaman': 37,
    'Kota Payakumbuh': 36,
    'Kota Sawah Lunto': 34,
    'Kota Solok': 33,
    'Lima Puluh Kota': 27,
    'Padang Pariaman': 5,
    'Pasaman': 28,
    'Pasaman Barat': 32,
    'Pesisir Selatan': 23,
    'Sijunjung': 25,
    'Solok': 24, # KABUPATEN SOLOK!
    'Solok Selatan': 31,
    'Tanah Datar': 26
}

# Kamus translasi nama kecamatan Minang / kemendagri
NAME_ALIASES = {
    '2 x 11 anam lingkuang': '2 x 11 enam lingkung',
    '2x11 anam lingkuang': '2 x 11 enam lingkung',
    'anam lingkuang': 'enam lingkung',
    'iv koto aua malintang': 'iv koto aur malintang',
    'lubuak aluang': 'lubuk alung',
    'sintuak toboh gadang': 'sintuk toboh gadang',
    'sungai garinggiang': 'sungai geringging',
    'ulakan tapakih': 'ulakan tapakis',
    'candung': 'canduang',
    'duo koto': 'dua koto',
    'sembilan koto': 'ix koto',
    'koto vii': 'koto tujuh',
    'lembah melintang': 'lembah malintang',
    'pauh duo': 'pauah duo',
    'siberut barat daya': 'seberut barat daya',
    'x koto': 'sepuluh koto',
    'tanjuang baru': 'tanjung baru',
    'batipuah': 'batipuh',
    'batipuah selatan': 'batipuh selatan',
}

def normalize_name(s: str) -> str:
    """Normalisasi string nama wilayah untuk pencocokan ketat."""
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r'^(kabupaten|kecamatan)\s+', '', s)
    s = s.replace("sawah lunto", "sawahlunto").replace("sawah-lunto", "sawahlunto")
    s = s.replace("guguak", "guguk")
    s = s.replace("lubuak", "lubuk")
    s = s.replace("sariak", "sarik")
    s = s.replace("tujuah", "tujuh")
    s = s.replace("ampek", "4").replace("empat", "4")
    s = s.replace("limo", "5").replace("lima", "5")
    s = s.replace("anam", "6").replace("enam", "6")
    s = s.replace("tigo", "3").replace("tiga", "3")
    s = s.replace("viii", "8").replace("vii", "7").replace("vi", "6").replace("iv", "4").replace("ix", "9")
    s = s.replace("x", "10").replace("v", "5").replace("iii", "3").replace("ii", "2")
    return re.sub(r'[^a-z0-9]', '', s)

def run_fix():
    print("=================================================================")
    print(" 1. MEMUAT DATASET RESMI ADM3 SUMATERA BARAT                    ")
    print("=================================================================")
    
    geojson_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "gis-data", "raw", "sumbar_kecamatan_adm3.geojson")
    )
    if not os.path.exists(geojson_path):
        print(f"[ERROR] File tidak ditemukan: {geojson_path}")
        return

    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_features = data.get("features", [])
    # Saring poligon danau dummy
    features = [
        f for f in raw_features 
        if f["properties"].get("adm2_code") != "ID1388" 
        and f["properties"].get("name") != "Danau" 
        and f["properties"].get("kabupaten") != "Danau"
    ]
    print(f"[+] Berhasil membaca {len(features)} fitur kecamatan resmi dari {geojson_path}.")

    print("\n=================================================================")
    print(" 2. MEMPERBAIKI GEOMETRI & RELASI DI POSTGIS                     ")
    print("=================================================================")

    with sync_engine.connect() as conn:
        kab_rows = conn.execute(text("""
            SELECT id, kode_wilayah, nama FROM wilayah_administratif WHERE level = 'kabupaten'
        """)).fetchall()

        kab_name_by_id = {k.id: k.nama for k in kab_rows}
        print(f"[+] Master 19 Kabupaten/Kota terkonfirmasi:")
        for k in kab_rows:
            print(f"    - ID {k.id:2d} ({k.kode_wilayah}): {k.nama}")

        kec_rows = conn.execute(text("""
            SELECT id, kode_wilayah, nama, parent_id
            FROM wilayah_administratif
            WHERE level = 'kecamatan'
        """)).fetchall()
        print(f"[+] Terdeteksi {len(kec_rows)} baris kecamatan master di database saat ini.")

        updated_count = 0
        matched_features = []

        for feat in features:
            props = feat["properties"]
            raw_name = props.get("name", "")
            raw_kab = props.get("kabupaten", "")
            raw_code = props.get("code", "").replace("ID", "").strip()
            geom = feat.get("geometry")

            target_parent_id = KAB_MAP.get(raw_kab)
            if not target_parent_id:
                print(f"[WARN] Kabupaten tidak dikenal: '{raw_kab}' untuk '{raw_name}'")
                continue

            norm_n = normalize_name(raw_name)
            # Cek alias
            alias_name = NAME_ALIASES.get(raw_name.lower().strip())
            norm_alias = normalize_name(alias_name) if alias_name else ""

            candidate_id = None
            # 1. Cari kec di target_parent_id yang namanya cocok
            for kr in kec_rows:
                if kr.parent_id == target_parent_id:
                    kr_norm = normalize_name(kr.nama)
                    kr_alias = normalize_name(NAME_ALIASES.get(kr.nama.lower().strip(), ""))
                    if kr_norm == norm_n or (norm_alias and kr_norm == norm_alias) or (kr_alias and kr_alias == norm_n):
                        candidate_id = kr.id
                        break

            # 2. Jika belum ketemu, cari di seluruh kec_rows yang namanya cocok (kasus parent_id salah di DB)
            if not candidate_id:
                for kr in kec_rows:
                    kr_norm = normalize_name(kr.nama)
                    kr_alias = normalize_name(NAME_ALIASES.get(kr.nama.lower().strip(), ""))
                    if kr_norm == norm_n or (norm_alias and kr_norm == norm_alias) or (kr_alias and kr_alias == norm_n):
                        candidate_id = kr.id
                        break

            # 3. Fallback substring dalam target_parent_id
            if not candidate_id:
                for kr in kec_rows:
                    if kr.parent_id == target_parent_id:
                        kr_norm = normalize_name(kr.nama)
                        if len(kr_norm) > 4 and (kr_norm in norm_n or norm_n in kr_norm):
                            candidate_id = kr.id
                            break

            if candidate_id:
                geom_json = json.dumps(geom)
                conn.execute(text("""
                    UPDATE wilayah_administratif
                    SET 
                        geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326)),
                        geom_simplified = ST_Multi(ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326), 0.001)),
                        parent_id = :parent_id,
                        updated_at = now()
                    WHERE id = :id
                """), {
                    "geom_json": geom_json,
                    "parent_id": target_parent_id,
                    "id": candidate_id
                })
                updated_count += 1
                matched_features.append({
                    "type": "Feature",
                    "properties": {
                        "id": candidate_id,
                        "nama": raw_name,
                        "kabupaten": raw_kab,
                        "parent_id": target_parent_id,
                        "kode_wilayah": raw_code,
                        "x": props.get("x"),
                        "y": props.get("y")
                    },
                    "geometry": geom
                })
            else:
                print(f"[WARN] Kecamatan '{raw_name}' ({raw_kab}) tidak menemukan kecocokan di database.")

        conn.commit()
        print(f"[+] Pembaruan PostGIS selesai: {updated_count} poligon kecamatan diperbarui.")

        # 3. Sinkronkan atribut dampak bencana ke GeoJSON
        print("\n=================================================================")
        print(" 3. MENSINKRONKAN ATRIBUT DAMPAK BENCANA KE GEOJSON               ")
        print("=================================================================")
        mv_rows = conn.execute(text("""
            SELECT 
                w.id,
                w.nama,
                COALESCE(mv.total_kerugian, 0) AS total_kerugian,
                COALESCE(mv.total_meninggal, 0) AS total_meninggal,
                COALESCE(mv.total_terdampak, 0) AS total_terdampak,
                ST_Y(ST_Centroid(w.geom)) AS lat,
                ST_X(ST_Centroid(w.geom)) AS lon
            FROM wilayah_administratif w
            LEFT JOIN mv_dampak_per_kecamatan mv ON mv.wilayah_id = w.id
            WHERE w.level = 'kecamatan' AND w.geom IS NOT NULL
        """)).fetchall()

        dampak_by_id = {}
        for r in mv_rows:
            dampak_by_id[r.id] = {
                "total_kerugian": float(r.total_kerugian),
                "total_meninggal": int(r.total_meninggal),
                "total_terdampak": int(r.total_terdampak),
                "lat": float(r.lat) if r.lat else None,
                "lon": float(r.lon) if r.lon else None,
            }

        final_geojson_features = []
        for feat in matched_features:
            p = feat["properties"]
            info = dampak_by_id.get(p["id"]) or {
                "total_kerugian": 0.0,
                "total_meninggal": 0,
                "total_terdampak": 0,
                "lat": p.get("y"),
                "lon": p.get("x")
            }

            kerugian = info["total_kerugian"]
            meninggal = info["total_meninggal"]
            if kerugian >= 1_500_000_000 or meninggal > 0:
                tingkat = "tinggi"
            elif kerugian >= 400_000_000:
                tingkat = "sedang"
            else:
                tingkat = "rendah"

            p["total_kerugian"] = kerugian
            p["total_meninggal"] = meninggal
            p["total_terdampak"] = info["total_terdampak"]
            p["tingkat_risiko"] = tingkat
            p["lat"] = info["lat"] or p.get("y")
            p["lon"] = info["lon"] or p.get("x")
            p["center_lat"] = p["lat"]
            p["center_lon"] = p["lon"]
            p["parent_nama"] = kab_name_by_id.get(p["parent_id"], "Sumatera Barat")
            final_geojson_features.append(feat)

        frontend_geojson = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "data", "sumbar_kecamatan.geojson")
        )
        os.makedirs(os.path.dirname(frontend_geojson), exist_ok=True)
        with open(frontend_geojson, "w", encoding="utf-8") as f:
            json.dump({"type": "FeatureCollection", "features": final_geojson_features}, f, ensure_ascii=False)
        print(f"[+] File GeoJSON tersinkronisasi ke: {frontend_geojson} ({len(final_geojson_features)} fitur).")

        # 4. Refresh Materialized View & Spatial Index
        print("\n=================================================================")
        print(" 4. REINDEX POSTGIS & REFRESH MATERIALIZED VIEW                  ")
        print("=================================================================")
        try:
            conn.execute(text("REINDEX TABLE wilayah_administratif;"))
            conn.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan;"))
            conn.commit()
            print("[+] REINDEX dan REFRESH MATERIALIZED VIEW berhasil.")
        except Exception as ex:
            print(f"[!] Info: {ex}")

        # 5. Verifikasi Final
        res_verify = conn.execute(text("""
            SELECT 
                level,
                count(*) AS total,
                count(geom) AS bergeometri
            FROM wilayah_administratif
            GROUP BY level
            ORDER BY level;
        """)).fetchall()

        print("\n=== VERIFIKASI AKHIR DATABASE ===")
        for rv in res_verify:
            print(f"Level: {rv.level:12s} | Total: {rv.total:3d} | Bergeometri: {rv.bergeometri:3d}")

if __name__ == "__main__":
    run_fix()
