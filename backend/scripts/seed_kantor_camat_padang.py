"""
Script Ingesti & Migrasi 11 Kantor Camat Kota Padang sebagai Posko Pengungsi Resmi
Sesuai Dokumen: Docs/koordinat kantor camat.md
Standar: LPPM UPI YPTK Padang & BPBD Provinsi Sumatera Barat
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import sync_engine

KANTOR_CAMAT_PADANG = [
    {
        "nama": "Posko Pengungsi Kantor Camat Padang Barat",
        "alamat": "Jl. Veteran No.85, Purus",
        "lat": -0.933125,
        "lon": 100.353625,
        "wilayah_id": 8,
        "kode_wilayah": "1371030",
        "kontak_pic": "Pusdalops Camat Padang Barat",
        "kontak_telepon": "0751-21345"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Padang Selatan",
        "alamat": "Jl. Sutan Syahrir No.250",
        "lat": -0.975350,
        "lon": 100.377720,
        "wilayah_id": 6,
        "kode_wilayah": "1371010",
        "kontak_pic": "Pusdalops Camat Padang Selatan",
        "kontak_telepon": "0751-31456"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Padang Utara",
        "alamat": "Jl. Beringin Ujung No.74, Lolong Belanti",
        "lat": -0.918999,
        "lon": 100.357125,
        "wilayah_id": 9,
        "kode_wilayah": "1371040",
        "kontak_pic": "Pusdalops Camat Padang Utara",
        "kontak_telepon": "0751-54321"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Pauh",
        "alamat": "Jl. Sungai Balang No.1, Cupak Tangah",
        "lat": -0.939412,
        "lon": 100.433973,
        "wilayah_id": 13,
        "kode_wilayah": "1371080",
        "kontak_pic": "Pusdalops Camat Pauh",
        "kontak_telepon": "0751-71234"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Lubuk Begalung",
        "alamat": "Jl. Berlian Raya No.2, Pagambiran",
        "lat": -0.980190,
        "lon": 100.399802,
        "wilayah_id": 11,
        "kode_wilayah": "1371060",
        "kontak_pic": "Pusdalops Camat Lubuk Begalung",
        "kontak_telepon": "0751-61567"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Padang Timur",
        "alamat": "Jl. Sisingamangaraja No.57",
        "lat": -0.945252,
        "lon": 100.360010,
        "wilayah_id": 7,
        "kode_wilayah": "1371020",
        "kontak_pic": "Pusdalops Camat Padang Timur",
        "kontak_telepon": "0751-28901"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Nanggalo",
        "alamat": "Jl. Pagang Raya–Siteba No.51",
        "lat": -0.896575,
        "lon": 100.375416,
        "wilayah_id": 15,
        "kode_wilayah": "1371100",
        "kontak_pic": "Pusdalops Camat Nanggalo",
        "kontak_telepon": "0751-41234"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Kuranji",
        "alamat": "Jl. By Pass KM 9, Kalumbuk",
        "lat": -0.916784,
        "lon": 100.395205,
        "wilayah_id": 14,
        "kode_wilayah": "1371090",
        "kontak_pic": "Pusdalops Camat Kuranji",
        "kontak_telepon": "0751-49876"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Koto Tangah",
        "alamat": "Jl. Adinegoro No.17, Lubuk Buaya",
        "lat": -0.820599,
        "lon": 100.321785,
        "wilayah_id": 16,
        "kode_wilayah": "1371110",
        "kontak_pic": "Pusdalops Camat Koto Tangah",
        "kontak_telepon": "0751-48234"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Lubuk Kilangan",
        "alamat": "Jl. Ampera No.26, Bandar Buat",
        "lat": -0.955122,
        "lon": 100.419240,
        "wilayah_id": 12,
        "kode_wilayah": "1371070",
        "kontak_pic": "Pusdalops Camat Lubuk Kilangan",
        "kontak_telepon": "0751-72345"
    },
    {
        "nama": "Posko Pengungsi Kantor Camat Bungus Teluk Kabung",
        "alamat": "Jl. Padang–Painan KM 11",
        "lat": -1.046750,
        "lon": 100.413000,
        "wilayah_id": 10,
        "kode_wilayah": "1371050",
        "kontak_pic": "Pusdalops Camat Bungus Teluk Kabung",
        "kontak_telepon": "0751-75123"
    }
]

FASILITAS_PENGUNGSI = [
    "tenda_pengungsi",
    "dapur_umum",
    "air_bersih",
    "mck_darurat",
    "genset_darurat",
    "posko_medis",
    "komunikasi_radio_bpbd",
    "logistik_sembako"
]

def run_seed():
    print("=== SEEDING 11 KANTOR CAMAT SEBAGAI POSKO PENGUNGSI RESMI KOTA PADANG ===")
    
    with sync_engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Pastikan check constraint check_posko_jenis mendukung 'posko_pengungsi'
            print("[1/3] Memperbarui check constraint tabel posko_evakuasi...")
            conn.execute(text("ALTER TABLE posko_evakuasi DROP CONSTRAINT IF EXISTS check_posko_jenis;"))
            conn.execute(text("""
                ALTER TABLE posko_evakuasi ADD CONSTRAINT check_posko_jenis CHECK (
                    jenis IN (
                        'posko_utama', 
                        'posko_pengungsi', 
                        'titik_kumpul', 
                        'shelter_sementara', 
                        'fasilitas_kesehatan', 
                        'shelter_tes_tea', 
                        'sirine_tsunami'
                    )
                );
            """))
            
            # 2. Ingesti / Upsert 11 Kantor Camat
            print("[2/3] Menyimpan 11 Kantor Camat ke basis data PostGIS...")
            inserted = 0
            updated = 0
            
            for item in KANTOR_CAMAT_PADANG:
                # Cek apakah sudah ada posko dengan nama serupa
                check_q = text("SELECT id FROM posko_evakuasi WHERE nama = :nama OR (wilayah_id = :wilayah_id AND jenis = 'posko_pengungsi');")
                existing = conn.execute(check_q, {"nama": item["nama"], "wilayah_id": item["wilayah_id"]}).fetchone()
                
                if existing:
                    update_q = text("""
                        UPDATE posko_evakuasi
                        SET nama = :nama,
                            jenis = 'posko_pengungsi',
                            lokasi = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                            kapasitas = 500,
                            fasilitas = :fasilitas,
                            kontak_pic = :pic,
                            kontak_telepon = :telp,
                            status = 'aktif',
                            wilayah_id = :wilayah_id,
                            updated_at = now()
                        WHERE id = :id;
                    """)
                    conn.execute(update_q, {
                        "id": existing[0],
                        "nama": item["nama"],
                        "lon": item["lon"],
                        "lat": item["lat"],
                        "fasilitas": FASILITAS_PENGUNGSI,
                        "pic": item["kontak_pic"],
                        "telp": item["kontak_telepon"],
                        "wilayah_id": item["wilayah_id"]
                    })
                    updated += 1
                else:
                    insert_q = text("""
                        INSERT INTO posko_evakuasi (
                            nama, jenis, lokasi, kapasitas, fasilitas, kontak_pic, kontak_telepon, status, wilayah_id, created_at, updated_at
                        ) VALUES (
                            :nama, 'posko_pengungsi', ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                            500, :fasilitas, :pic, :telp, 'aktif', :wilayah_id, now(), now()
                        );
                    """)
                    conn.execute(insert_q, {
                        "nama": item["nama"],
                        "lon": item["lon"],
                        "lat": item["lat"],
                        "fasilitas": FASILITAS_PENGUNGSI,
                        "pic": item["kontak_pic"],
                        "telp": item["kontak_telepon"],
                        "wilayah_id": item["wilayah_id"]
                    })
                    inserted += 1

            trans.commit()
            print(f"[3/3] Selesai! Berhasil menambahkan {inserted} posko pengungsi baru, memperbarui {updated} posko.")
            
            # Verifikasi jumlah posko pengungsi di DB
            count_res = conn.execute(text("SELECT jenis, COUNT(*) FROM posko_evakuasi GROUP BY jenis ORDER BY jenis;")).fetchall()
            print("\nRekapitulasi Fasilitas & Posko Saat Ini di Basis Data PostGIS:")
            for c in count_res:
                print(f"  * {c[0]}: {c[1]} lokasi")
                
        except Exception as e:
            trans.rollback()
            print(f"[!] Terjadi error saat seeding: {e}")
            raise e

if __name__ == "__main__":
    run_seed()
