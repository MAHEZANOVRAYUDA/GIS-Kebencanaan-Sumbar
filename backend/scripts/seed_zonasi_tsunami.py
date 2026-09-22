"""
Seed Script: Zonasi Tsunami Pesisir Sumatera Barat & Update Alamat Posko Evakuasi
Standar: BPBD Provinsi Sumatera Barat & Dokumen Rencana Kontinjensi Gempa-Tsunami Padang
"""
import sys
import os
import json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import sync_engine

# 1. Poligon Zonasi Tsunami Pesisir
# - ZONA MERAH (KRB III): Bahaya Rendaman Ekstrem Pesisir (0 - 1.5 km, Elevasi < 5m dpl, Run-Up > 3 - 8m)
# - ZONA KUNING (KRB I/II): Waspada Rendaman Sedang (1.5 - 3.5 km, Rendaman 0.2 - 3m)
# - ZONA HIJAU: Aman (> 15m dpl / Kawasan Perbukitan & Timur Garis Batas Bypass)

ZONASI_DATA = [
    {
        "nama_zona": "Zona Merah — KRB III Bahaya Ekstrem Pesisir Padang",
        "zona": "merah",
        "tingkat_bahaya": "KRB III (Bahaya Ekstrem)",
        "kedalaman_rendaman": "> 3.0 – 8.0+ Meter di Garis Pantai (Run-Up 10–12m)",
        "deskripsi": "Kawasan pesisir pantai terdampak langsung gelombang pertama (Purus, Taplau, Ulak Karang, Pasir Jambak, Muaro Padang, Pantai Air Manis). Wajib evakuasi cepat ke shelter vertikal lantai 3+.",
        "rekomendasi": "Dilarang bertahan di lantai 1-2. Segera lari ke Shelter Vertikal TES terdekat atau evakuasi horizontal melewati Bypass.",
        "geojson_poly": {
            "type": "MultiPolygon",
            "coordinates": [[
                [
                    [100.285, -0.782],
                    [100.292, -0.798],
                    [100.303, -0.816],
                    [100.315, -0.835],
                    [100.324, -0.852],
                    [100.334, -0.870],
                    [100.342, -0.888],
                    [100.347, -0.905],
                    [100.350, -0.920],
                    [100.352, -0.935],
                    [100.353, -0.948],
                    [100.356, -0.960],
                    [100.352, -0.966],
                    [100.362, -0.985],
                    [100.370, -0.998],
                    [100.375, -0.995],
                    [100.367, -0.970],
                    [100.361, -0.945],
                    [100.357, -0.915],
                    [100.353, -0.885],
                    [100.345, -0.850],
                    [100.333, -0.820],
                    [100.311, -0.795],
                    [100.291, -0.782],
                    [100.285, -0.782]
                ]
            ]]
        }
    },
    {
        "nama_zona": "Zona Kuning — KRB I & II Waspada Kawasan Intermediet Padang",
        "zona": "kuning",
        "tingkat_bahaya": "KRB II (Bahaya Tinggi/Waspada)",
        "kedalaman_rendaman": "0.5 – 3.0 Meter (Genangan & Aliran Deras)",
        "deskripsi": "Kawasan koridor perkotaan antara pesisir dan jalur Bypass (Jl. Hamka, Khatib Sulaiman, Sawahan, Lapai, Kuranji barat). Rawan limpasan air bah dan puing hanyut.",
        "rekomendasi": "Bergerak cepat ke Timur menyeberangi Garis Evakuasi Aman Jalur Bypass menuju perbukitan.",
        "geojson_poly": {
            "type": "MultiPolygon",
            "coordinates": [[
                [
                    [100.291, -0.782],
                    [100.311, -0.795],
                    [100.333, -0.820],
                    [100.345, -0.850],
                    [100.353, -0.885],
                    [100.357, -0.915],
                    [100.361, -0.945],
                    [100.367, -0.970],
                    [100.375, -0.995],
                    [100.389, -0.995],
                    [100.386, -0.970],
                    [100.383, -0.945],
                    [100.379, -0.915],
                    [100.373, -0.885],
                    [100.366, -0.850],
                    [100.353, -0.820],
                    [100.336, -0.795],
                    [100.306, -0.782],
                    [100.291, -0.782]
                ]
            ]]
        }
    },
    {
        "nama_zona": "Zona Hijau — Kawasan Aman Bebas Tsunami (Timur Bypass & Perbukitan)",
        "zona": "hijau",
        "tingkat_bahaya": "Zona Hijau (Aman Bebas Rendaman)",
        "kedalaman_rendaman": "0 Meter (Elevasi > 15m – 200m dpl)",
        "deskripsi": "Kawasan sebelah timur Jalan Bypass Kota Padang dan lereng perbukitan Bukit Barisan (Pauh, Kuranji Timur, Lubuk Kilangan, Indarung, Limau Manis Kampus Unand). Dinyatakan aman dari rendaman gelombang tsunami.",
        "rekomendasi": "Kawasan titik akhir evakuasi horizontal (TEA). Lokasi pendirian tenda pengungsi utama dan fasilitas logistik darurat.",
        "geojson_poly": {
            "type": "MultiPolygon",
            "coordinates": [[
                [
                    [100.389, -0.995],
                    [100.386, -0.970],
                    [100.383, -0.945],
                    [100.379, -0.915],
                    [100.373, -0.885],
                    [100.366, -0.850],
                    [100.353, -0.820],
                    [100.336, -0.795],
                    [100.306, -0.782],
                    [100.320, -0.750],
                    [100.370, -0.760],
                    [100.430, -0.820],
                    [100.480, -0.900],
                    [100.470, -0.960],
                    [100.430, -1.020],
                    [100.389, -0.995]
                ]
            ]]
        }
    }
]

# 2. Pembaruan Alamat Posko & Kantor Camat
POSKO_ALAMAT_UPDATES = [
    {"nama": "Posko Pengungsi Kantor Camat Padang Barat", "alamat": "Jl. Veteran No.85, Purus, Padang Barat"},
    {"nama": "Posko Pengungsi Kantor Camat Padang Selatan", "alamat": "Jl. Sutan Syahrir No.250, Rawang, Padang Selatan"},
    {"nama": "Posko Pengungsi Kantor Camat Padang Utara", "alamat": "Jl. Beringin Ujung No.74, Lolong Belanti, Padang Utara"},
    {"nama": "Posko Pengungsi Kantor Camat Pauh", "alamat": "Jl. Sungai Balang No.1, Cupak Tangah, Pauh"},
    {"nama": "Posko Pengungsi Kantor Camat Lubuk Begalung", "alamat": "Jl. Berlian Raya No.2, Pagambiran, Lubuk Begalung"},
    {"nama": "Posko Pengungsi Kantor Camat Padang Timur", "alamat": "Jl. Sisingamangaraja No.57, Simpang Haru, Padang Timur"},
    {"nama": "Posko Pengungsi Kantor Camat Nanggalo", "alamat": "Jl. Pagang Raya–Siteba No.51, Surau Gadang, Nanggalo"},
    {"nama": "Posko Pengungsi Kantor Camat Kuranji", "alamat": "Jl. By Pass KM 9, Kalumbuk, Kuranji"},
    {"nama": "Posko Pengungsi Kantor Camat Koto Tangah", "alamat": "Jl. Adinegoro No.17, Lubuk Buaya, Koto Tangah"},
    {"nama": "Posko Pengungsi Kantor Camat Lubuk Kilangan", "alamat": "Jl. Ampera No.26, Bandar Buat, Lubuk Kilangan"},
    {"nama": "Posko Pengungsi Kantor Camat Bungus Teluk Kabung", "alamat": "Jl. Padang–Painan KM 11, Teluk Kabung Utara"},
    # Shelter TES Tsunami
    {"nama": "Shelter TES Pasie Nan Tigo (Koto Tangah)", "alamat": "Jl. Pasir Jambak No.12, Pasie Nan Tigo, Koto Tangah"},
    {"nama": "Gedung Kantor BPBD Provinsi Sumatera Barat", "alamat": "Jl. Jenderal Sudirman No.47, Padang Barat"},
    {"nama": "Shelter Wisma Warta Ulak Karang (Padang Utara)", "alamat": "Jl. Medan No.8, Ulak Karang Selatan, Padang Utara"},
    {"nama": "Gedung Kampus UPI YPTK Padang (Lubuk Begalung)", "alamat": "Jl. Raya Lubuk Begalung No.1, Lubuk Begalung Nan XX"},
    {"nama": "SMPN 25 Padang (Shelter Rawang Timur)", "alamat": "Jl. Rawang Timur No.14, Mata Air, Padang Selatan"},
    {"nama": "Kantor Gubernur Sumatera Barat (Komando Provinsi)", "alamat": "Jl. Jenderal Sudirman No.51, Padang Pasir, Padang Barat"},
    {"nama": "Masjid Raya Sumatera Barat (Khatib Sulaiman)", "alamat": "Jl. Khatib Sulaiman, Alai Parak Kopi, Padang Utara"},
    {"nama": "Titik Kumpul Lapangan Rektorat Unand Limau Manis", "alamat": "Kampus Universitas Andalas, Limau Manis, Pauh"},
    {"nama": "Posko Utama GOR H. Agus Salim", "alamat": "Kompleks Olahraga GOR H. Agus Salim, Rimbo Kaluang, Padang Barat"},
    {"nama": "Posko Utama Lapangan Kantin Bukittinggi", "alamat": "Jl. Sudirman, Benteng Pasar Atas, Guguk Panjang, Bukittinggi"},
    {"nama": "TES Wisma Atlet Parit Malintang", "alamat": "Kawasan IKK Parit Malintang, Enam Lingkung, Padang Pariaman"}
]

def run_seed():
    print(">>> Memulai Seed Data Zonasi Tsunami PostGIS...")
    with sync_engine.connect() as conn:
        for z in ZONASI_DATA:
            poly_geojson_str = json.dumps(z["geojson_poly"])
            check_q = text("SELECT id FROM zonasi_tsunami WHERE nama_zona = :nama LIMIT 1")
            existing = conn.execute(check_q, {"nama": z["nama_zona"]}).fetchone()

            if existing:
                update_q = text("""
                    UPDATE zonasi_tsunami
                    SET zona = :zona,
                        tingkat_bahaya = :tingkat_bahaya,
                        kedalaman_rendaman = :kedalaman_rendaman,
                        deskripsi = :deskripsi,
                        rekomendasi = :rekomendasi,
                        geom = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)),
                        updated_at = now()
                    WHERE id = :id
                """)
                conn.execute(update_q, {
                    "id": existing[0],
                    "zona": z["zona"],
                    "tingkat_bahaya": z["tingkat_bahaya"],
                    "kedalaman_rendaman": z["kedalaman_rendaman"],
                    "deskripsi": z["deskripsi"],
                    "rekomendasi": z["rekomendasi"],
                    "geojson": poly_geojson_str
                })
                print(f"    [UPDATE] {z['nama_zona']}")
            else:
                insert_q = text("""
                    INSERT INTO zonasi_tsunami (nama_zona, zona, tingkat_bahaya, kedalaman_rendaman, deskripsi, rekomendasi, geom)
                    VALUES (:nama, :zona, :tingkat_bahaya, :kedalaman_rendaman, :deskripsi, :rekomendasi, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)))
                """)
                conn.execute(insert_q, {
                    "nama": z["nama_zona"],
                    "zona": z["zona"],
                    "tingkat_bahaya": z["tingkat_bahaya"],
                    "kedalaman_rendaman": z["kedalaman_rendaman"],
                    "deskripsi": z["deskripsi"],
                    "rekomendasi": z["rekomendasi"],
                    "geojson": poly_geojson_str
                })
                print(f"    [INSERT] {z['nama_zona']}")

        print("\n>>> Memperbarui Alamat Lengkap Posko & Shelter Evakuasi...")
        updated_count = 0
        for p in POSKO_ALAMAT_UPDATES:
            up_q = text("UPDATE posko_evakuasi SET alamat = :alamat WHERE nama ILIKE :nama")
            res = conn.execute(up_q, {"alamat": p["alamat"], "nama": f"%{p['nama']}%"})
            if res.rowcount > 0:
                updated_count += res.rowcount

        conn.commit()
        print(f"    Berhasil memperbarui {updated_count} alamat posko evakuasi.")

if __name__ == "__main__":
    run_seed()
