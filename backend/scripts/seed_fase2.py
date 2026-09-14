"""
Script Seeding Data Realistis Kecamatan, Kejadian Bencana, & Dampak Bencana
untuk Sumatera Barat (Fase 2 - Visualisasi Data & Drill-Down).
"""
import sys
import os
from datetime import datetime, timezone, timedelta

# Tambahkan direktori backend ke path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import sync_engine

def seed_data():
    with sync_engine.connect() as conn:
        print("[-] Memulai seeding data administratif kecamatan & dampak bencana Sumbar...")

        # 1. Pastikan parent kabupaten (Kota Padang & Kota Bukittinggi) sudah ada
        # Tambahkan juga Kab. Agam dan Kab. Padang Pariaman untuk konteks kebencanaan Sumbar
        conn.execute(text("""
        INSERT INTO wilayah_administratif (id, kode_wilayah, nama, level, parent_id, populasi, geom)
        VALUES 
            (4, '1306', 'Kabupaten Agam', 'kabupaten', 1, 529138, 
             ST_Multi(ST_GeomFromText('POLYGON((99.85 -0.45, 100.35 -0.45, 100.35 -0.15, 99.85 -0.15, 99.85 -0.45))', 4326))),
            (5, '1305', 'Kabupaten Padang Pariaman', 'kabupaten', 1, 430626, 
             ST_Multi(ST_GeomFromText('POLYGON((100.05 -0.80, 100.40 -0.80, 100.40 -0.45, 100.05 -0.45, 100.05 -0.80))', 4326)))
        ON CONFLICT (kode_wilayah) DO UPDATE 
        SET nama = EXCLUDED.nama, populasi = EXCLUDED.populasi;
        """))

        # Update sequence jika ada id manual
        conn.execute(text("SELECT setval('wilayah_administratif_id_seq', (SELECT MAX(id) FROM wilayah_administratif));"))

        # 2. Seeding Data Kecamatan di Kota Padang (11 Kecamatan Asli)
        # Poligon dibuat bertetangga dan mengisi area daratan Kota Padang
        padang_kecamatan = [
            (
                '1371010', 'Padang Selatan', 2, 61460,
                'POLYGON((100.340 -0.985, 100.380 -0.985, 100.380 -0.945, 100.340 -0.945, 100.340 -0.985))'
            ),
            (
                '1371020', 'Padang Timur', 2, 78340,
                'POLYGON((100.365 -0.950, 100.395 -0.950, 100.395 -0.915, 100.365 -0.915, 100.365 -0.950))'
            ),
            (
                '1371030', 'Padang Barat', 2, 45210,
                'POLYGON((100.340 -0.945, 100.365 -0.945, 100.365 -0.895, 100.340 -0.895, 100.340 -0.945))'
            ),
            (
                '1371040', 'Padang Utara', 2, 68700,
                'POLYGON((100.340 -0.895, 100.370 -0.895, 100.370 -0.855, 100.340 -0.855, 100.340 -0.895))'
            ),
            (
                '1371050', 'Bungus Teluk Kabung', 2, 26800,
                'POLYGON((100.370 -1.050, 100.470 -1.050, 100.470 -0.985, 100.370 -0.985, 100.370 -1.050))'
            ),
            (
                '1371060', 'Lubuk Begalung', 2, 120500,
                'POLYGON((100.375 -0.985, 100.425 -0.985, 100.425 -0.930, 100.375 -0.930, 100.375 -0.985))'
            ),
            (
                '1371070', 'Lubuk Kilangan', 2, 57400,
                'POLYGON((100.425 -0.985, 100.510 -0.985, 100.510 -0.920, 100.425 -0.920, 100.425 -0.985))'
            ),
            (
                '1371080', 'Pauh', 2, 63800,
                'POLYGON((100.410 -0.930, 100.510 -0.930, 100.510 -0.875, 100.410 -0.875, 100.410 -0.930))'
            ),
            (
                '1371090', 'Kuranji', 2, 142300,
                'POLYGON((100.380 -0.915, 100.440 -0.915, 100.440 -0.855, 100.380 -0.855, 100.380 -0.915))'
            ),
            (
                '1371100', 'Nanggalo', 2, 59700,
                'POLYGON((100.360 -0.895, 100.395 -0.895, 100.395 -0.850, 100.360 -0.850, 100.360 -0.895))'
            ),
            (
                '1371110', 'Koto Tangah', 2, 198500,
                'POLYGON((100.310 -0.855, 100.430 -0.855, 100.430 -0.790, 100.310 -0.790, 100.310 -0.855))'
            ),
        ]

        # 3. Seeding Data Kecamatan di Kota Bukittinggi (3 Kecamatan Asli)
        bukittinggi_kecamatan = [
            (
                '1375010', 'Guguak Panjang', 3, 44200,
                'POLYGON((100.355 -0.315, 100.385 -0.315, 100.385 -0.295, 100.355 -0.295, 100.355 -0.315))'
            ),
            (
                '1375020', 'Mandiangin Koto Selayan', 3, 52100,
                'POLYGON((100.350 -0.295, 100.395 -0.295, 100.395 -0.275, 100.350 -0.275, 100.350 -0.295))'
            ),
            (
                '1375030', 'Aur Birugo Tigo Baleh', 3, 26900,
                'POLYGON((100.355 -0.335, 100.390 -0.335, 100.390 -0.315, 100.355 -0.315, 100.355 -0.335))'
            ),
        ]

        # 4. Kecamatan tambahan di Agam dan Padang Pariaman (rawan lahar/banjir)
        tambahan_kecamatan = [
            (
                '1306010', 'Tanjung Raya', 4, 38100,
                'POLYGON((100.120 -0.350, 100.250 -0.350, 100.250 -0.200, 100.120 -0.200, 100.120 -0.350))'
            ),
            (
                '1306080', 'Canduang', 4, 25400,
                'POLYGON((100.420 -0.350, 100.520 -0.350, 100.520 -0.260, 100.420 -0.260, 100.420 -0.350))'
            ),
            (
                '1305010', 'Batang Anai', 5, 54200,
                'POLYGON((100.280 -0.790, 100.380 -0.790, 100.380 -0.680, 100.280 -0.680, 100.280 -0.790))'
            ),
        ]

        all_kecamatan = padang_kecamatan + bukittinggi_kecamatan + tambahan_kecamatan

        for kode, nama, parent_id, populasi, poly_wkt in all_kecamatan:
            conn.execute(text("""
                INSERT INTO wilayah_administratif (kode_wilayah, nama, level, parent_id, populasi, geom)
                VALUES (:kode, :nama, 'kecamatan', :parent_id, :populasi, ST_Multi(ST_GeomFromText(:wkt, 4326)))
                ON CONFLICT (kode_wilayah) DO UPDATE
                SET nama = EXCLUDED.nama, parent_id = EXCLUDED.parent_id, 
                    populasi = EXCLUDED.populasi, geom = EXCLUDED.geom;
            """), {"kode": kode, "nama": nama, "parent_id": parent_id, "populasi": populasi, "wkt": poly_wkt})

        print(f"[+] Berhasil memasukkan {len(all_kecamatan)} kecamatan administratif.")

        # Ambil mapping id wilayah untuk foreign keys
        res = conn.execute(text("SELECT kode_wilayah, id, nama FROM wilayah_administratif WHERE level = 'kecamatan';"))
        wilayah_map = {row.kode_wilayah: row.id for row in res.fetchall()}

        # 3. Seeding Kejadian Bencana Realistis di Sumatera Barat
        # Menggunakan kejadian riil seperti banjir bandang Kuranji, longsor Sitinjau Lauik, lahar dingin Canduang
        bencana_data = [
            {
                "jenis": "banjir",
                "tanggal": datetime(2025, 11, 14, 18, 30, tzinfo=timezone.utc),
                "kode_wilayah": "1371090", # Kuranji
                "lokasi_wkt": "POINT(100.410 -0.885)",
                "deskripsi": "Banjir bandang luapan Batang Kuranji merendam ratusan pemukiman warga di Belimbing dan Gunung Sarik.",
                "sumber": "operator_bpbd",
                "status": "terverifikasi",
                # Dampak:
                "dampak": {
                    "meninggal": 1, "hilang": 0, "luka": 14, "pengungsi": 380,
                    "kerugian": 1850000000, # 1.85 Milyar (Kategori Tinggi / Merah)
                    "rusak_berat": 18, "rusak_sedang": 42, "rusak_ringan": 115,
                    "fasum": 3, "faskes": 1, "sekolah": 2, "terdampak": 1450,
                    "catatan": "Tanggul penahan air sungai jebol sepanjang 25 meter."
                }
            },
            {
                "jenis": "longsor",
                "tanggal": datetime(2025, 12, 2, 4, 15, tzinfo=timezone.utc),
                "kode_wilayah": "1371070", # Lubuk Kilangan (Sitinjau Lauik)
                "lokasi_wkt": "POINT(100.465 -0.952)",
                "deskripsi": "Longsor tebing jalur utama Sitinjau Lauik menutup badan jalan nasional Padang-Solok dan menimpa 2 unit kendaraan.",
                "sumber": "operator_bpbd",
                "status": "terverifikasi",
                "dampak": {
                    "meninggal": 3, "hilang": 1, "luka": 8, "pengungsi": 45,
                    "kerugian": 2650000000, # 2.65 Milyar (Kategori Tinggi / Merah)
                    "rusak_berat": 4, "rusak_sedang": 2, "rusak_ringan": 6,
                    "fasum": 1, "faskes": 0, "sekolah": 0, "terdampak": 280,
                    "catatan": "Akses jalan terputus selama 48 jam, material batu besar dan lumpur pekat."
                }
            },
            {
                "jenis": "banjir",
                "tanggal": datetime(2026, 1, 8, 14, 0, tzinfo=timezone.utc),
                "kode_wilayah": "1371110", # Koto Tangah
                "lokasi_wkt": "POINT(100.360 -0.820)",
                "deskripsi": "Luapan Sungai Batang Kandis akibat curah hujan ekstrem merendam kawasan perumahan di Lubuk Buaya.",
                "sumber": "operator_bpbd",
                "status": "terverifikasi",
                "dampak": {
                    "meninggal": 0, "hilang": 0, "luka": 5, "pengungsi": 520,
                    "kerugian": 950000000, # 950 Juta (Kategori Sedang / Oranye)
                    "rusak_berat": 2, "rusak_sedang": 19, "rusak_ringan": 84,
                    "fasum": 2, "faskes": 0, "sekolah": 1, "terdampak": 2100,
                    "catatan": "Evakuasi perahu karet BPBD dikerahkan ke perumahan Griya Anak Air."
                }
            },
            {
                "jenis": "banjir",
                "tanggal": datetime(2026, 1, 15, 7, 30, tzinfo=timezone.utc),
                "kode_wilayah": "1371030", # Padang Barat
                "lokasi_wkt": "POINT(100.352 -0.920)",
                "deskripsi": "Pasang air laut (rob) disertai hujan lebat menggenangi kawasan Purus dan Flamboyan Baru.",
                "sumber": "operator_bpbd",
                "status": "terverifikasi",
                "dampak": {
                    "meninggal": 0, "hilang": 0, "luka": 2, "pengungsi": 85,
                    "kerugian": 420000000, # 420 Juta (Kategori Sedang / Oranye)
                    "rusak_berat": 0, "rusak_sedang": 8, "rusak_ringan": 34,
                    "fasum": 1, "faskes": 0, "sekolah": 0, "terdampak": 750,
                    "catatan": "Ketinggian air rob mencapai 40-70 cm di jalan raya."
                }
            },
            {
                "jenis": "gempa",
                "tanggal": datetime(2026, 2, 3, 21, 12, tzinfo=timezone.utc),
                "kode_wilayah": "1371010", # Padang Selatan
                "lokasi_wkt": "POINT(100.360 -0.965)",
                "deskripsi": "Guncangan gempa tektonik M5.4 pantai barat Sumbar meretakkan sejumlah ruko dan pemukiman tua di Seberang Padang.",
                "sumber": "bmkg",
                "status": "terverifikasi",
                "dampak": {
                    "meninggal": 0, "hilang": 0, "luka": 7, "pengungsi": 120,
                    "kerugian": 780000000, # 780 Juta (Kategori Sedang / Oranye)
                    "rusak_berat": 3, "rusak_sedang": 14, "rusak_ringan": 28,
                    "fasum": 2, "faskes": 1, "sekolah": 1, "terdampak": 620,
                    "catatan": "Struktur bangunan tua colonial retak rambut hingga sedang."
                }
            },
            {
                "jenis": "erupsi",
                "tanggal": datetime(2026, 2, 18, 16, 45, tzinfo=timezone.utc),
                "kode_wilayah": "1306080", # Canduang (Gunung Marapi)
                "lokasi_wkt": "POINT(100.470 -0.300)",
                "deskripsi": "Lahar hujan Gunung Marapi membawa material pasir dan batu besar menerjang lahan pertanian dan jembatan nagari.",
                "sumber": "operator_bpbd",
                "status": "terverifikasi",
                "dampak": {
                    "meninggal": 4, "hilang": 0, "luka": 19, "pengungsi": 650,
                    "kerugian": 3450000000, # 3.45 Milyar (Kategori Sangat Tinggi / Merah Pekat)
                    "rusak_berat": 24, "rusak_sedang": 31, "rusak_ringan": 55,
                    "fasum": 4, "faskes": 1, "sekolah": 2, "terdampak": 1890,
                    "catatan": "Lahan pertanian sayur seluas 42 hektar tertimbun material vulkanik."
                }
            },
            {
                "jenis": "longsor",
                "tanggal": datetime(2026, 3, 1, 10, 20, tzinfo=timezone.utc),
                "kode_wilayah": "1375010", # Guguak Panjang Bukittinggi (Ngarai Sianok)
                "lokasi_wkt": "POINT(100.365 -0.305)",
                "deskripsi": "Longsor dinding tebing Ngarai Sianok menimbun gazebo wisata dan jalan inspeksi taman panorama.",
                "sumber": "operator_bpbd",
                "status": "terverifikasi",
                "dampak": {
                    "meninggal": 0, "hilang": 0, "luka": 3, "pengungsi": 0,
                    "kerugian": 310000000, # 310 Juta (Kategori Rendah-Sedang / Kuning)
                    "rusak_berat": 1, "rusak_sedang": 3, "rusak_ringan": 5,
                    "fasum": 2, "faskes": 0, "sekolah": 0, "terdampak": 95,
                    "catatan": "Kawasan wisata ditutup sementara selama 5 hari untuk stabilisasi tebing."
                }
            },
            {
                "jenis": "banjir",
                "tanggal": datetime(2026, 3, 10, 23, 15, tzinfo=timezone.utc),
                "kode_wilayah": "1305010", # Batang Anai (Padang Pariaman)
                "lokasi_wkt": "POINT(100.330 -0.730)",
                "deskripsi": "Sungai Batang Anai meluap merendam area persawahan dan akses lingkar luar Bandara Internasional Minangkabau.",
                "sumber": "operator_bpbd",
                "status": "terverifikasi",
                "dampak": {
                    "meninggal": 0, "hilang": 0, "luka": 1, "pengungsi": 230,
                    "kerugian": 640000000, # 640 Juta (Kategori Sedang / Oranye)
                    "rusak_berat": 0, "rusak_sedang": 12, "rusak_ringan": 46,
                    "fasum": 1, "faskes": 0, "sekolah": 1, "terdampak": 890,
                    "catatan": "Jalan akses BIM sempat dialihkan melalui jalur alternatif."
                }
            },
            {
                "jenis": "angin_puting_beliung",
                "tanggal": datetime(2026, 2, 25, 15, 30, tzinfo=timezone.utc),
                "kode_wilayah": "1371080", # Pauh
                "lokasi_wkt": "POINT(100.450 -0.900)",
                "deskripsi": "Angin puting beliung menerbangkan atap puluhan rumah di Limau Manis dan menumbangkan pohon pelindung.",
                "sumber": "operator_bpbd",
                "status": "terverifikasi",
                "dampak": {
                    "meninggal": 0, "hilang": 0, "luka": 4, "pengungsi": 60,
                    "kerugian": 190000000, # 190 Juta (Kategori Rendah / Hijau-Kuning)
                    "rusak_berat": 2, "rusak_sedang": 9, "rusak_ringan": 22,
                    "fasum": 1, "faskes": 0, "sekolah": 0, "terdampak": 180,
                    "catatan": "Pohon tumbang menimpa jaringan kabel listrik PLN."
                }
            }
        ]

        # Bersihkan data lama jika ada
        conn.execute(text("DELETE FROM data_dampak_bencana;"))
        conn.execute(text("DELETE FROM kejadian_bencana;"))

        for b in bencana_data:
            w_id = wilayah_map.get(b["kode_wilayah"])
            if not w_id:
                continue

            # Insert kejadian
            res_k = conn.execute(text("""
                INSERT INTO kejadian_bencana (jenis_bencana, tanggal_kejadian, wilayah_id, lokasi, deskripsi, sumber_data, status_verifikasi)
                VALUES (:jenis, :tanggal, :wilayah_id, ST_GeomFromText(:lokasi_wkt, 4326), :deskripsi, :sumber, :status)
                RETURNING id;
            """), {
                "jenis": b["jenis"],
                "tanggal": b["tanggal"],
                "wilayah_id": w_id,
                "lokasi_wkt": b["lokasi_wkt"],
                "deskripsi": b["deskripsi"],
                "sumber": b["sumber"],
                "status": b["status"]
            })
            k_id = res_k.scalar()

            # Insert dampak
            d = b["dampak"]
            conn.execute(text("""
                INSERT INTO data_dampak_bencana (
                    kejadian_id, wilayah_id, korban_meninggal, korban_hilang, korban_luka, jumlah_pengungsi,
                    kerugian_rp, rumah_rusak_berat, rumah_rusak_sedang, rumah_rusak_ringan,
                    fasilitas_umum_rusak, fasilitas_kesehatan_rusak, sekolah_rusak, penduduk_terdampak, catatan
                )
                VALUES (
                    :k_id, :w_id, :meninggal, :hilang, :luka, :pengungsi,
                    :kerugian, :rusak_berat, :rusak_sedang, :rusak_ringan,
                    :fasum, :faskes, :sekolah, :terdampak, :catatan
                );
            """), {
                "k_id": k_id, "w_id": w_id,
                "meninggal": d["meninggal"], "hilang": d["hilang"], "luka": d["luka"], "pengungsi": d["pengungsi"],
                "kerugian": d["kerugian"], "rusak_berat": d["rusak_berat"], "rusak_sedang": d["rusak_sedang"],
                "rusak_ringan": d["rusak_ringan"], "fasum": d["fasum"], "faskes": d["faskes"],
                "sekolah": d["sekolah"], "terdampak": d["terdampak"], "catatan": d["catatan"]
            })

        print(f"[+] Berhasil memasukkan {len(bencana_data)} kejadian bencana & data dampak riil.")

        # 4. Refresh Materialized View mv_dampak_per_kecamatan dengan CONCURRENTLY
        # Sesuai 02-database.md & 11-optimasi-performa.md
        print("[-] Me-refresh Materialized View mv_dampak_per_kecamatan secara CONCURRENTLY...")
        conn.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan;"))
        conn.commit()
        print("[+] Refresh Materialized View selesai dengan sukses!")

if __name__ == "__main__":
    seed_data()
