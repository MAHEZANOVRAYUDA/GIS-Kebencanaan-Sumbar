"""
Script Seeding Data Fase 3: Posko Evakuasi Realistis & Akun RBAC Awal
Sistem Informasi Geografis Kebencanaan Provinsi Sumatera Barat.
"""
import sys
import os
import bcrypt
from datetime import datetime, timezone

# Tambahkan direktori backend ke sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import sync_engine

def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")

def seed_fase3():
    with sync_engine.connect() as conn:
        print("[-] Memulai seeding data Posko Evakuasi & Pengguna RBAC Fase 3...")

        # 1. Seeding Akun Pengguna (RBAC: Admin, Operator, Pimpinan)
        users = [
            {
                "nama": "Administrator Pusdalops BPBD Sumbar",
                "email": "admin@sumbarprov.go.id",
                "password": hash_password("AdminSumbar2026!"),
                "role": "admin",
                "wilayah_tugas_id": 1, # Provinsi Sumatera Barat
                "aktif": True
            },
            {
                "nama": "Operator Lapangan BPBD Kota Padang",
                "email": "operator.padang@sumbarprov.go.id",
                "password": hash_password("OperatorPadang2026!"),
                "role": "operator",
                "wilayah_tugas_id": 2, # Kota Padang
                "aktif": True
            },
            {
                "nama": "Kepala Pelaksana BPBD Sumbar",
                "email": "pimpinan@sumbarprov.go.id",
                "password": hash_password("PimpinanSumbar2026!"),
                "role": "pimpinan",
                "wilayah_tugas_id": 1,
                "aktif": True
            }
        ]

        for u in users:
            conn.execute(text("""
                INSERT INTO pengguna (nama, email, password_hash, role, wilayah_tugas_id, aktif)
                VALUES (:nama, :email, :password, :role, :wilayah_tugas_id, :aktif)
                ON CONFLICT (email) DO UPDATE
                SET nama = EXCLUDED.nama, password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role, wilayah_tugas_id = EXCLUDED.wilayah_tugas_id,
                    aktif = EXCLUDED.aktif;
            """), u)

        print(f"[+] Berhasil memasukkan {len(users)} akun pengguna RBAC.")

        # 2. Seeding Posko Evakuasi Nyata di Sumatera Barat
        posko_list = [
            {
                "nama": "Posko Utama GOR H. Agus Salim",
                "jenis": "posko_utama",
                "lat": -0.9234,
                "lon": 100.3592,
                "kapasitas": 2500,
                "fasilitas": ["air_bersih", "mck", "dapur_umum", "tenda_peleton", "pos_kesehatan", "genset"],
                "kontak_pic": "Drs. Hendri (Kabid Kedaruratan BPBD Padang)",
                "kontak_telepon": "081267890123",
                "status": "aktif",
                "wilayah_id": 2
            },
            {
                "nama": "TES (Tempat Evakuasi Sementara) Ulak Karang",
                "jenis": "shelter_sementara",
                "lat": -0.8995,
                "lon": 100.3478,
                "kapasitas": 1200,
                "fasilitas": ["air_bersih", "genset", "mck", "pos_komunikasi", "helipad_atap"],
                "kontak_pic": "Rahmat Hidayat (Satgas Kelurahan Ulak Karang)",
                "kontak_telepon": "081374561234",
                "status": "aktif",
                "wilayah_id": 2
            },
            {
                "nama": "Pusdalops PB BPBD Provinsi Sumatera Barat",
                "jenis": "posko_utama",
                "lat": -0.8872,
                "lon": 100.3541,
                "kapasitas": 800,
                "fasilitas": ["pusdalops", "radio_komunikasi_hf_vhf", "genset_cadangan", "logistik_makanan", "dapur_umum"],
                "kontak_pic": "Pusdalops Sumbar Call Center",
                "kontak_telepon": "0751-7058835",
                "status": "aktif",
                "wilayah_id": 1
            },
            {
                "nama": "Posko Logistik Balai Kota Padang Aie Pacah",
                "jenis": "posko_utama",
                "lat": -0.8524,
                "lon": 100.3789,
                "kapasitas": 1800,
                "fasilitas": ["dapur_umum", "helipad", "logistik", "air_bersih", "tempat_tidur_lipat"],
                "kontak_pic": "Irwan Suhardi (Bagian Umum Pemko)",
                "kontak_telepon": "085278904321",
                "status": "aktif",
                "wilayah_id": 2
            },
            {
                "nama": "Faskes Darurat RSUP Dr. M. Djamil Padang",
                "jenis": "fasilitas_kesehatan",
                "lat": -0.9412,
                "lon": 100.3685,
                "kapasitas": 650,
                "fasilitas": ["igd_trauma_center", "bank_darah", "ambulans_lapangan", "tenda_triage", "helipad"],
                "kontak_pic": "Dr. Fauzi Sp.B (Tim Penanggulangan Bencana RSUP)",
                "kontak_telepon": "0751-32372",
                "status": "aktif",
                "wilayah_id": 2
            },
            {
                "nama": "Titik Kumpul Lapangan Rektorat Unand Limau Manis",
                "jenis": "titik_kumpul",
                "lat": -0.9150,
                "lon": 100.4580,
                "kapasitas": 3500,
                "fasilitas": ["lapangan_terbuka_luas", "auditorium_tertutup", "air_bersih", "masjid_kampus"],
                "kontak_pic": "Biro Umum & Satpam Unand",
                "kontak_telepon": "08116601234",
                "status": "aktif",
                "wilayah_id": 2
            },
            {
                "nama": "Posko Utama Lapangan Kantin Bukittinggi",
                "jenis": "posko_utama",
                "lat": -0.3068,
                "lon": 100.3664,
                "kapasitas": 1500,
                "fasilitas": ["dapur_umum", "pos_kesehatan", "tenda_peleton", "air_bersih"],
                "kontak_pic": "Zulkifli (BPBD Bukittinggi)",
                "kontak_telepon": "081363456789",
                "status": "aktif",
                "wilayah_id": 3
            },
            {
                "nama": "TES Wisma Atlet Parit Malintang",
                "jenis": "shelter_sementara",
                "lat": -0.5833,
                "lon": 100.2000,
                "kapasitas": 900,
                "fasilitas": ["tempat_tidur", "mck_komplit", "dapur_umum", "posko_logistik"],
                "kontak_pic": "BPBD Padang Pariaman",
                "kontak_telepon": "0751-91234",
                "status": "aktif",
                "wilayah_id": 5
            }
        ]

        # Bersihkan data posko lama jika ada
        conn.execute(text("DELETE FROM posko_evakuasi;"))

        for p in posko_list:
            conn.execute(text("""
                INSERT INTO posko_evakuasi (
                    nama, jenis, lokasi, kapasitas, fasilitas, 
                    kontak_pic, kontak_telepon, status, wilayah_id
                )
                VALUES (
                    :nama, :jenis, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :kapasitas, :fasilitas,
                    :kontak_pic, :kontak_telepon, :status, :wilayah_id
                );
            """), p)

        conn.commit()
        print(f"[+] Berhasil memasukkan {len(posko_list)} titik Posko Evakuasi Sumatera Barat.")

if __name__ == "__main__":
    seed_fase3()
