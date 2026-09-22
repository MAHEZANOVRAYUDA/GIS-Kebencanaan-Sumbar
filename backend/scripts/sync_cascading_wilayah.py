"""
Script Sinkronisasi dan Seeding Tabel Relasional Cascading Wilayah:
Provinsi -> Kota/Kabupaten -> Kecamatan
serta menautkan id_kecamatan pada posko_evakuasi.
"""
import sys
import os
from sqlalchemy import text

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import sync_engine

def sync_cascading_wilayah():
    print("=== SINKRONISASI DATA WILAYAH BERTINGKAT (PROVINSI -> KOTA -> KECAMATAN) ===")
    
    with sync_engine.connect() as conn:
        # 1. Pastikan entri Provinsi Sumatera Barat
        conn.execute(text("""
            INSERT INTO provinsi (id, nama, created_at, updated_at)
            VALUES ('13', 'Sumatera Barat', NOW(), NOW())
            ON CONFLICT (id) DO UPDATE 
            SET nama = EXCLUDED.nama, updated_at = NOW();
        """))
        print("  [OK] Provinsi: Sumatera Barat (ID: 13) tersimpan.")

        # 2. Ingest 19 Kabupaten / Kota dari wilayah_administratif
        kab_rows = conn.execute(text("""
            SELECT id, kode_wilayah, nama
            FROM wilayah_administratif
            WHERE level = 'kabupaten'
            ORDER BY kode_wilayah;
        """)).fetchall()

        total_kota = 0
        for kab in kab_rows:
            kab_code = kab.kode_wilayah.strip()
            kab_name = kab.nama.strip()
            conn.execute(text("""
                INSERT INTO kota (id, id_provinsi, nama, created_at, updated_at)
                VALUES (:id, '13', :nama, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE
                SET nama = EXCLUDED.nama, id_provinsi = '13', updated_at = NOW();
            """), {"id": kab_code, "nama": kab_name})
            total_kota += 1
        print(f"  [OK] Kota/Kabupaten: {total_kota} wilayah tersimpan.")

        # 3. Ingest Kecamatan per Kota/Kabupaten
        # Ambil semua kecamatan dari wilayah_administratif
        kec_rows = conn.execute(text("""
            SELECT c.id, c.kode_wilayah, c.nama, c.parent_id, k.kode_wilayah AS kab_kode, k.nama AS kab_nama
            FROM wilayah_administratif c
            JOIN wilayah_administratif k ON k.id = c.parent_id
            WHERE c.level = 'kecamatan'
            ORDER BY c.kode_wilayah;
        """)).fetchall()

        # Deduplikasi: prioritaskan kode 6 digit (Kemendagri)
        # Jika kode 7 digit (BPS), potong angka 0 di belakang atau sesuaikan ke 6 digit
        kec_map = {}
        for r in kec_rows:
            raw_code = r.kode_wilayah.strip()
            norm_code = raw_code
            if len(raw_code) == 7 and raw_code.endswith('0'):
                norm_code = raw_code[:6]

            # Key unik berdasarkan nama kecamatan & kota
            key = (r.kab_kode.strip(), r.nama.strip().lower())
            if key not in kec_map:
                kec_map[key] = {
                    "id": norm_code,
                    "id_kota": r.kab_kode.strip(),
                    "nama": r.nama.strip(),
                    "wilayah_administratif_id": r.id
                }
            else:
                # Jika sudah ada, tapi yang ini kode 6 digit persis, update ID
                if len(raw_code) == 6:
                    kec_map[key]["id"] = raw_code
                    kec_map[key]["wilayah_administratif_id"] = r.id

        total_kec = 0
        for key, item in kec_map.items():
            conn.execute(text("""
                INSERT INTO kecamatan (id, id_kota, nama, wilayah_administratif_id, created_at, updated_at)
                VALUES (:id, :id_kota, :nama, :w_id, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE
                SET nama = EXCLUDED.nama, 
                    id_kota = EXCLUDED.id_kota, 
                    wilayah_administratif_id = EXCLUDED.wilayah_administratif_id,
                    updated_at = NOW();
            """), {
                "id": item["id"],
                "id_kota": item["id_kota"],
                "nama": item["nama"],
                "w_id": item["wilayah_administratif_id"]
            })
            total_kec += 1

        print(f"  [OK] Kecamatan: {total_kec} kecamatan unik terdaftar dengan relasi valid.")

        # 4. Tautkan id_kecamatan pada posko_evakuasi
        # 4a. Tautkan melalui kesesuaian wilayah_id -> wilayah_administratif_id
        update_posko_1 = conn.execute(text("""
            UPDATE posko_evakuasi p
            SET id_kecamatan = k.id
            FROM kecamatan k
            WHERE p.wilayah_id = k.wilayah_administratif_id
              AND p.id_kecamatan IS NULL;
        """))
        print(f"  [SYNC POSKO] {update_posko_1.rowcount} posko ditautkan via wilayah_id.")

        # 4b. Tautkan melalui nama kecamatan jika ada di nama/alamat posko (khusus kantor camat Padang)
        padang_kec_rows = conn.execute(text("SELECT id, nama FROM kecamatan WHERE id_kota = '1371'")).fetchall()
        for pk in padang_kec_rows:
            conn.execute(text("""
                UPDATE posko_evakuasi
                SET id_kecamatan = :kec_id
                WHERE (LOWER(nama) LIKE :pat OR LOWER(alamat) LIKE :pat)
                  AND id_kecamatan IS NULL;
            """), {"kec_id": pk.id, "pat": f"%{pk.nama.lower()}%"})

        # 4c. Tautkan shelter TES di Padang secara spesifik
        shelter_mapping = {
            "Shelter TES Pasie Nan Tigo": "137111", # Koto Tangah
            "Kantor BPBD Provinsi": "137103",       # Padang Barat
            "Wisma Warta Ulak Karang": "137104",    # Padang Utara
            "UPI YPTK Padang": "137106",            # Lubuk Begalung
            "SMPN 25 Padang": "137101",             # Padang Selatan
            "Kantor Gubernur": "137103",            # Padang Barat
            "Masjid Raya Sumatera Barat": "137104", # Padang Utara
            "TES (Tempat Evakuasi Sementara) Ulak Karang": "137104", # Padang Utara
            "GOR H. Agus Salim": "137104",          # Padang Utara
            "Balai Kota Padang Aie Pacah": "137111",# Koto Tangah
            "RSUP Dr. M. Djamil": "137102"          # Padang Timur
        }
        for name_pat, kec_code in shelter_mapping.items():
            conn.execute(text("""
                UPDATE posko_evakuasi
                SET id_kecamatan = :kec_code
                WHERE LOWER(nama) LIKE :pat;
            """), {"kec_code": kec_code, "pat": f"%{name_pat.lower()}%"})

        conn.commit()

        # Verifikasi posko
        linked_posko = conn.execute(text("SELECT count(*) FROM posko_evakuasi WHERE id_kecamatan IS NOT NULL")).scalar()
        total_posko = conn.execute(text("SELECT count(*) FROM posko_evakuasi")).scalar()
        print(f"  [SUMMARY] {linked_posko} dari {total_posko} lokasi posko/shelter berhasil ditautkan ke ID kecamatan.")

if __name__ == "__main__":
    sync_cascading_wilayah()
