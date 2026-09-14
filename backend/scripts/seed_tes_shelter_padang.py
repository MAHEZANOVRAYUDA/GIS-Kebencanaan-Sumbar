"""
Seed Script: Tempat Evakuasi Sementara (TES) & Tempat Evakuasi Akhir (TEA) Tsunami Kota Padang
Berdasarkan Dokumen Rencana Kontinjensi Gempa & Tsunami Kota Padang (BPBD Sumbar & LPPM UPI YPTK).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import sync_engine

TES_SHELTERS = [
    {
        "nama": "Shelter TES Pasie Nan Tigo (Koto Tangah)",
        "jenis": "shelter_tes_tea",
        "lat": -0.8820,
        "lon": 100.3390,
        "kapasitas": 2000,
        "fasilitas": ["shelter_vertikal", "tangga_darurat", "lantai_aman_lt3", "air_bersih"],
        "kontak_pic": "Pusdalops BPBD Koto Tangah",
        "kontak_telepon": "0751-7058831",
        "status": "aktif",
    },
    {
        "nama": "Gedung Kantor BPBD Provinsi Sumatera Barat",
        "jenis": "shelter_tes_tea",
        "lat": -0.9315,
        "lon": 100.3585,
        "kapasitas": 1500,
        "fasilitas": ["pusdalops", "shelter_vertikal", "genset", "komunikasi_radio", "logistik"],
        "kontak_pic": "Pusdalops PB Prov Sumbar",
        "kontak_telepon": "0811-666-2113",
        "status": "aktif",
    },
    {
        "nama": "Shelter Wisma Warta Ulak Karang (Padang Utara)",
        "jenis": "shelter_tes_tea",
        "lat": -0.8987,
        "lon": 100.3479,
        "kapasitas": 1800,
        "fasilitas": ["shelter_vertikal", "helipad_darurat", "mck", "dapur_umum"],
        "kontak_pic": "Tim Siaga Bencana Ulak Karang",
        "kontak_telepon": "0751-7058832",
        "status": "aktif",
    },
    {
        "nama": "Gedung Kampus UPI YPTK Padang (Lubuk Begalung)",
        "jenis": "shelter_tes_tea",
        "lat": -0.9440,
        "lon": 100.4100,
        "kapasitas": 3500,
        "fasilitas": ["shelter_kampus_vertikal", "lantai_aman_lt4", "aula_evakuasi", "faskes_lapangan", "air_bersih"],
        "kontak_pic": "Koordinator Satgas Kebencanaan UPI YPTK",
        "kontak_telepon": "0751-776666",
        "status": "aktif",
    },
    {
        "nama": "SMPN 25 Padang (Shelter Rawang Timur)",
        "jenis": "shelter_tes_tea",
        "lat": -0.9120,
        "lon": 100.3620,
        "kapasitas": 1200,
        "fasilitas": ["shelter_sekolah", "lapangan_evakuasi", "mck", "tenda_darurat"],
        "kontak_pic": "Kecamatan Padang Selatan",
        "kontak_telepon": "0751-7058833",
        "status": "aktif",
    },
    {
        "nama": "Kantor Gubernur Sumatera Barat (Komando Provinsi)",
        "jenis": "shelter_tes_tea",
        "lat": -0.9398,
        "lon": 100.3651,
        "kapasitas": 4000,
        "fasilitas": ["posko_komando_provinsi", "aula_gedung", "genset_darurat", "cadangan_air", "helipad"],
        "kontak_pic": "Sekretariat Satgas Bencana Forkopimda",
        "kontak_telepon": "0751-31580",
        "status": "aktif",
    },
    {
        "nama": "Masjid Raya Sumatera Barat (Khatib Sulaiman)",
        "jenis": "shelter_tes_tea",
        "lat": -0.9268,
        "lon": 100.3645,
        "kapasitas": 5000,
        "fasilitas": ["shelter_vertikal", "lantai_2_aman", "kapasitas_besar", "mck_lengkap", "parkir_luas"],
        "kontak_pic": "Pengurus Pengelola Masjid Raya Sumbar",
        "kontak_telepon": "0751-8951000",
        "status": "aktif",
    }
]

def seed_tes_shelters():
    print(">>> Memulai Seed Tempat Evakuasi Sementara (TES/TEA) Tsunami Kota Padang...")
    with sync_engine.connect() as conn:
        for s in TES_SHELTERS:
            check_q = text("SELECT id FROM posko_evakuasi WHERE nama = :nama LIMIT 1")
            existing = conn.execute(check_q, {"nama": s["nama"]}).fetchone()

            if existing:
                update_q = text("""
                    UPDATE posko_evakuasi
                    SET jenis = :jenis,
                        lokasi = ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                        kapasitas = :kapasitas,
                        fasilitas = :fasilitas,
                        kontak_pic = :kontak_pic,
                        kontak_telepon = :kontak_telepon,
                        status = :status,
                        updated_at = now()
                    WHERE id = :id
                """)
                conn.execute(update_q, {
                    "id": existing[0],
                    "jenis": s["jenis"],
                    "lon": s["lon"],
                    "lat": s["lat"],
                    "kapasitas": s["kapasitas"],
                    "fasilitas": s["fasilitas"],
                    "kontak_pic": s["kontak_pic"],
                    "kontak_telepon": s["kontak_telepon"],
                    "status": s["status"],
                })
                print(f"  [UPDATED] {s['nama']} (Kapasitas: {s['kapasitas']} Jiwa)")
            else:
                insert_q = text("""
                    INSERT INTO posko_evakuasi (
                        nama, jenis, lokasi, kapasitas, fasilitas,
                        kontak_pic, kontak_telepon, status, created_at, updated_at
                    )
                    VALUES (
                        :nama, :jenis, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                        :kapasitas, :fasilitas, :kontak_pic, :kontak_telepon, :status,
                        now(), now()
                    )
                """)
                conn.execute(insert_q, {
                    "nama": s["nama"],
                    "jenis": s["jenis"],
                    "lon": s["lon"],
                    "lat": s["lat"],
                    "kapasitas": s["kapasitas"],
                    "fasilitas": s["fasilitas"],
                    "kontak_pic": s["kontak_pic"],
                    "kontak_telepon": s["kontak_telepon"],
                    "status": s["status"],
                })
                print(f"  [INSERTED] {s['nama']} (Kapasitas: {s['kapasitas']} Jiwa)")
        conn.commit()
    print(">>> Seed TES/TEA Tsunami Padang selesai dengan sukses!\n")

if __name__ == "__main__":
    seed_tes_shelters()
