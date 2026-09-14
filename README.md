# 🌐 GIS Kebencanaan Sumatera Barat — Platform Geospasial Terpadu BPBD

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![MapLibre GL JS](https://img.shields.io/badge/MapLibre_GL-6.9+-0078A8.svg?logo=maplibre&logoColor=white)](https://maplibre.org)
[![PostgreSQL 18 + PostGIS](https://img.shields.io/badge/PostGIS-3.6+-336791.svg?logo=postgresql&logoColor=white)](https://postgis.net)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-blueviolet.svg?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

> **Kolaborasi Riset LPPM Universitas Putra Indonesia "YPTK" Padang × BPBD Provinsi Sumatera Barat**  
> *Sistem Informasi Geografis Operasional Terpadu untuk Navigasi Evakuasi Bencana Multi-Moda, Monitoring Risiko Spasial Real-Time, dan Pelaporan Eksekutif BNPB.*

---

## 📌 Daftar Isi

1. [Tentang Platform](#1-tentang-platform)
2. [Arsitektur Sistem](#2-arsitektur-sistem)
3. [Fitur Unggulan Sistem](#3-fitur-unggulan-sistem)
4. [Integrasi Data Geospasial Autentik](#4-integrasi-data-geospasial-autentik)
5. [Struktur Direktori Proyek](#5-struktur-direktori-proyek)
6. [Panduan Instalasi & Menjalankan Sistem](#6-panduan-instalasi--menjalankan-sistem)
7. [Spesifikasi API Endpoint](#7-spesifikasi-api-endpoint)
8. [Verifikasi & Pengujian Kualitas (Testing Trophy)](#8-verifikasi--pengujian-kualitas-testing-trophy)
9. [Hak Cipta & Lisensi](#9-hak-cipta--lisensi)

---

## 1. Tentang Platform

Provinsi Sumatera Barat berada di zona cincin api (*Ring of Fire*) dengan kompleksitas multi-ancaman bencana alam yang sangat tinggi di Indonesia — mulai dari potensi gempa bumi *Megathrust Mentawai* dan tsunami di sepanjang pesisir barat, patahan aktif Sesar Semangko di daratan, ancaman erupsi serta banjir lahar dingin (*Galodo*) dari Gunung Marapi dan Singgalang, hingga risiko tanah longsor di perbukitan Bukit Barisan.

Platform ini dibangun sebagai solusi operasional terpadu yang memadukan komputasi spasial modern berkinerja tinggi dengan standar penanggulangan bencana BPBD dan BNPB:

- **Bagi Warga Terdampak**: Navigasi evakuasi mandiri instan (*turn-by-turn routing*) menuju shelter atau posko terdekat dengan opsi moda mobil/motor maupun jalan kaki, yang secara dinamis menghindari ruas jalan terputus akibat longsor atau banjir.
- **Bagi Operator Lapangan**: Pembaruan status posko darurat dan penambahan titik blokade jalan secara *real-time* berbasis GIS.
- **Bagi Pusdalops PB**: Pemantauan terpusat lapisan kebencanaan (Choropleth Risiko, Shelter Vertikal TES, Jaringan Sirine EWS Tsunami, Episentrum Gempa BMKG, dan Peringatan Cuaca Ekstrem).
- **Bagi Pimpinan Forkopimda / Kepala Daerah**: Dashboard KPI eksekutif dan *Situation Report (SITREP)* otomatis berstandar BNPB dengan fitur **1-Click WhatsApp Executive Digest**.

**Prinsip Desain**: **100% Free & Open-Source Software (FOSS)**, *Self-Hostable*, bebas dependensi API peta berbayar (zero Mapbox/Google Maps billing API).

---

## 2. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       KLIEN ANTARMUKA (Browser / PWA)                       │
│     React 19 + TypeScript + MapLibre GL JS + ECharts + Workbox PWA Cache    │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ HTTP REST + Binary Vector Tiles (MVT)
┌──────────────────────────────▼──────────────────────────────────────────────┐
│                    BACKEND API GATEWAY (FastAPI / Python 3.13)              │
│    JWT Auth (HttpOnly) · RBAC Guard · PostGIS Spatial Engine · SITREP Core  │
└──────┬───────────────────────┬──────────────────────────────┬───────────────┘
       │                       │                              │
┌──────▼──────┐     ┌──────────▼──────────┐       ┌───────────▼───────────┐
│ PostGIS     │     │ Engine Routing      │       │ Sensor Eksternal BMKG │
│ Database    │     │ OSRM + Shapely      │       │ · Gempa Bumi Real-time│
│ Port 5433   │     │ (Multi-Moda & Avoid)│       │ · Feed Cuaca CAP      │
└─────────────┘     └─────────────────────┘       └───────────────────────┘
```

### Spesifikasi Komponen Teknologi

| Lapisan | Komponen | Versi | Peran Utama |
|---|---|---|---|
| **Frontend** | React + Vite | 19.2 / 8.3 | Komponen UI reaktif, arsitektur modular FSD |
| **Peta Spasial** | MapLibre GL JS | 6.9+ | Rendering peta berbasis WebGL/GPU, native MVT tiles |
| **Visualisasi Data** | Apache ECharts | 6.1+ | Grafik horizontal ranking kerugian & risiko wilayah |
| **Offline/PWA** | Vite PWA / Workbox | 1.3+ | Cache-first tiles satelit & service worker offline |
| **Backend API** | FastAPI + Uvicorn | 0.115+ | Framework API asynchronous performa tinggi |
| **ORM & Migrasi** | SQLAlchemy Async + Alembic | 2.0+ | Pemodelan entitas basis data & migrasi skema |
| **Basis Data Spasial**| PostgreSQL + PostGIS | 18 / 3.6+ | Indeks spasial GIST, binary vector tiles `ST_AsMVT` |
| **Routing Spasial** | OSRM / Haversine fallback | — | Navigasi turn-by-turn & deteksi blokade jalan |

---

## 3. Fitur Unggulan Sistem

### 3.1 Peta Choropleth 19 Kabupaten/Kota Autentik
- Menampilkan visualisasi risiko spasial untuk seluruh **19 Kabupaten/Kota di Sumatera Barat** dengan batas poligon administratif resmi yang presisi (rata-rata 528 titik batas per wilayah mengikuti garis pantai dan kontur alam).
- Dihasilkan langsung dari PostGIS menggunakan fungsi biner native `ST_AsMVT` dan `ST_TileEnvelope`, menghemat hingga 85% bandwidth dibandingkan GeoJSON mentah.
- Pewarnaan risiko semantik berstandar penanggulangan bencana:
  - 🔴 **Tinggi / Bahaya**: Total kerugian ≥ Rp 1,5 Miliar atau terdapat korban jiwa.
  - 🟡 **Sedang / Waspada**: Total kerugian Rp 400 Juta – Rp 1,5 Miliar.
  - 🟢 **Rendah / Aman**: Total kerugian < Rp 400 Juta.

### 3.2 Navigasi Evakuasi Multi-Moda Sadar-Blokade
- Tombol **EVAKUASI SEKARANG** di pojok kiri bawah mengeksekusi:
  1. Deteksi koordinat pengguna via Geolocation API (dengan fallback koordinat simulasi pesisir Padang).
  2. Pencarian posko/shelter terdekat menggunakan operator spasial **PostGIS KNN (`<->`)** (< 5ms).
  3. **Pilihan Moda Rute**: 🚗 **Kendaraan (Mobil/Motor)** atau 🏃 **Jalan Kaki** (kecepatan 4.5 km/jam khusus evakuasi vertikal tsunami).
  4. Pemeriksaan irisan jalan terputus via **Shapely spatial intersection** — rute otomatis dialihkan menjauhi blokade.
  5. **Filter Beacon Sirine**: Menara sirine EWS secara ketat dikecualikan dari tujuan posko evakuasi agar warga tidak diarahkan ke menara pengeras suara, melainkan ke posko/shelter penampungan nyata.

### 3.3 Shelter Vertikal Tsunami (TES/TEA) & Sirine EWS BPBD
- **7 Shelter Evakuasi Vertikal Tsunami (TES) Padang**: Dilengkapi badge navigasi instruksi khusus lantai bertingkat (*"Evakuasi Vertikal: Prioritaskan naik ke Lantai 3 atau Rooftop"*).
- **46 Titik Sirine EWS Tsunami BPBD**: Pemantauan visual menara sirine dini tsunami di pesisir Sumbar dengan status operasional: Siaga Aktif (Amber) vs Pemeliharaan/Perbaikan (Slate).

### 3.4 Peringatan Dini Cuaca BMKG & Potensi Banjir/Galodo
- Terhubung langsung ke feed **BMKG Stasiun Meteorologi Minangkabau** berbasis protokol CAP (Common Alerting Protocol).
- Ticker interaktif di bagian header yang dapat diklik untuk membuka **`CuacaAlertModal`**:
  - Penjelasan kearifan lokal mengenai bencana **"Galodo"** (aliran lahar dingin dan banjir bandang dari lereng Gunung Marapi/Singgalang).
  - Rincian wilayah administratif berisiko (Agam, Tanah Datar, Padang Pariaman, Pesisir Selatan).
  - Petunjuk kesiapsiagaan darurat resmi BPBD Prov. Sumbar.
  - Tombol **"Fokus ke Wilayah Terdampak"** untuk mengarahkan kamera peta ke episentrum potensi bahaya.

### 3.5 Automated SITREP BNPB & 1-Click WhatsApp Digest
- Generator laporan situasi kebencanaan otomatis melalui endpoint `/api/admin/sitrep`.
- Mengagregasi metrik riil seluruh provinsi: Total Korban Meninggal/Hilang/Luka, Pengungsi, Estimasi Kerugian Finansial, Posko Aktif, Titik Sirine, dan Ruas Jalan Terputus.
- Dilengkapi tombol **Salin Ringkasan WhatsApp** siap kirim ke grup Forkopimda / Pimpinan BPBD.

### 3.6 WebGIS Layer Control Switcher
- Panel kontrol lapis peta interaktif (*glassmorphism*) yang memungkinkan pengguna mengaktifkan atau menonaktifkan 6 layer spasial secara independen:
  1. Zona Risiko Wilayah (Choropleth MVT)
  2. Shelter TES Tsunami (Padang)
  3. Jaringan Sirine EWS Tsunami BPBD
  4. Ruas Jalan Terputus (Blokade)
  5. Episentrum Gempa BMKG Real-time
  6. Peringatan Dini Cuaca Ekstrem

### 3.7 Basemap Switcher & 3D Terrain
- Tiga varian gaya peta:
  - 🌍 **Satelit Hibrida**: Citra satelit bumi resolusi tinggi dengan label wilayah kontras.
  - 🗺️ **Topografi**: Peta kontur elevasi alami Sumatera Barat.
  - 🌙 **Mode Gelap**: Tampilan minim silau untuk operasional malam Pusdalops.
- Mode **3D Terrain Elevasi**: Visualisasi kontur pegunungan Bukit Barisan dan lereng gunung api berbasis *Digital Elevation Model (DEM)*.

---

## 4. Integrasi Data Geospasial Autentik

Platform ini sepenuhnya menggunakan data publik resmi dan autentik:

| Dataset | Sumber Resmi | Frekuensi | Penggunaan dalam Sistem |
|---|---|---|---|
| **Batas Administrasi 19 Kab/Kota** | GADM / BIG / Kemendagri | Statis Terkurasi | Poligon batas wilayah choropleth MVT |
| **Batas Administrasi 179 Kecamatan** | API Kode Wilayah Kemendagri | Statis | Data atribut & hierarki wilayah |
| **46 Sirine Tsunami BPBD** | Portal Satu Data Sumbar (CKAN) | Berkala | Titik lokasi EWS di pesisir barat Sumbar |
| **Data Dampak Bencana 2024** | BPBD Provinsi Sumbar (CKAN) | Tahunan | Rekapitulasi korban jiwa, luka, & kerugian |
| **7 Shelter Vertikal TES Padang** | Dokumen Kontinjensi Tsunami BPBD | Statis | Titik posko evakuasi vertikal tsunami |
| **Gempa Terkini Real-time** | BMKG TEWS (`autogempa.json`) | Tiap 60 detik | Marker episentrum gempa & peringatan dini |
| **Cuaca Ekstrem & Nowcast** | BMKG CAP Minangkabau | Tiap 5 menit | Peringatan dini hujan lebat & potensi galodo |

---

## 5. Struktur Direktori Proyek

```
GIS-Kebencanaan-Sumbar/
├── backend/                        # Backend API Service (FastAPI)
│   ├── alembic/                    # Skrip migrasi skema basis data
│   │   └── versions/               # Versi migrasi (001_init, 002_add_mitigasi_dan_cuaca)
│   ├── app/
│   │   ├── core/                   # Konfigurasi, DB pool, auth JWT, dependencies
│   │   ├── models/                 # Model SQLAlchemy (Wilayah, Posko, Bencana, Cuaca, Jalan)
│   │   ├── schemas/                # Skema validasi Pydantic v2
│   │   ├── services/               # Layanan bisnis (Routing, BMKG Weather, CKAN ETL)
│   │   ├── routers/                # Endpoint FastAPI (Wilayah, Posko, Tiles, SITREP, Cuaca)
│   │   └── main.py                 # Titik masuk aplikasi FastAPI
│   ├── scripts/                    # Skrip ETL, seeding data, dan automated tests
│   │   ├── etl_ckan_sumbar.py      # Sinkronisasi data resmi BPBD CKAN
│   │   ├── seed_tes_shelter_padang.py # Injeksi shelter evakuasi tsunami
│   │   ├── test_all_phases.py      # Regression test suite Fase 1 - Fase 4
│   │   └── test_fase5_data.py      # Test suite autentisitas data Fase 5
│   ├── requirements.txt            # Dependensi Python
│   └── alembic.ini
│
├── frontend/                       # Frontend WebGIS (React 19 + Vite)
│   ├── src/
│   │   ├── features/
│   │   │   ├── map/                # MapCanvas, LayerControlPanel, popup & layer styles
│   │   │   ├── evakuasi/           # RouteInstructions, moda switcher, badge vertikal
│   │   │   ├── sitrep/             # SitrepModal, copy WhatsApp, tabel prioritas
│   │   │   ├── cuaca/              # CuacaAlertModal, edukasi galodo, mitigasi BPBD
│   │   │   ├── telusuri-bencana/   # WilayahPanel, StatistikChart ECharts
│   │   │   ├── filter/             # FilterPanel (jenis bencana, tahun, pencarian)
│   │   │   ├── operator/           # OperatorModal, form lapor jalan & posko
│   │   │   └── pwa/                # OfflineBanner & service worker hooks
│   │   ├── App.tsx                 # Orkestrasi komponen utama & layout overlay
│   │   └── main.tsx
│   ├── public/                     # Aset statis, styles map json, pmtiles, favicon
│   ├── vite.config.ts              # Konfigurasi Vite & caching Workbox PWA
│   └── package.json
│
├── gis-data/                       # Data spasial & skrip pemrosesan
├── 01-arsitektur.md s/d 11-optimasi-performa.md # Dokumentasi spesifikasi arsitektur riset
├── .gitignore
└── README.md
```

---

## 6. Panduan Instalasi & Menjalankan Sistem

### Prasyarat Sistem
- **Python**: Versi 3.11 atau lebih baru
- **Node.js**: Versi 18 atau lebih baru (npm disertakan)
- **PostgreSQL**: Versi 16 atau lebih baru dengan ekstensi **PostGIS** aktif
- **Git**: Terpasang pada terminal

---

### Langkah 1: Kloning Repositori
```bash
git clone https://github.com/MAHEZANOVRAYUDA/GIS-Kebencanaan-Sumbar.git
cd GIS-Kebencanaan-Sumbar
```

---

### Langkah 2: Konfigurasi Basis Data PostGIS
Buat database bernama `gis_kebencanaan_sumbar` dan aktifkan ekstensi PostGIS:
```sql
CREATE DATABASE gis_kebencanaan_sumbar;
\c gis_kebencanaan_sumbar;
CREATE EXTENSION postgis;
```

Buat file environment `backend/.env` (sesuaikan port dan kredensial basis data Anda):
```ini
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5433/gis_kebencanaan_sumbar
SYNC_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/gis_kebencanaan_sumbar
SECRET_KEY=kunci-rahasia-lppm-upiyptk-bpbd-sumbar-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
```

---

### Langkah 3: Setup & Jalankan Backend API
```bash
cd backend

# Buat virtual environment (opsional namun disarankan)
python -m venv venv
venv\Scripts\activate      # Di Windows PowerShell / CMD
# source venv/bin/activate # Di Linux / macOS

# Install dependensi
pip install -r requirements.txt

# Jalankan migrasi Alembic
alembic upgrade head

# Ingest data spasial autentik Sumbar
python scripts/seed_tes_shelter_padang.py
python scripts/etl_ckan_sumbar.py

# Jalankan server FastAPI
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Layanan backend akan aktif pada `http://127.0.0.1:8000` dengan Swagger UI di `http://127.0.0.1:8000/docs`.

---

### Langkah 4: Setup & Jalankan Frontend Antarmuka
Buka terminal baru:
```bash
cd frontend

# Install dependensi Node.js
npm install

# Jalankan server pengembangan Vite
npm run dev
```
Buka browser Anda dan akses:
👉 **`http://127.0.0.1:5173/`**

---

## 7. Spesifikasi API Endpoint

### Wilayah & Choropleth
- `GET /api/wilayah/choropleth` — GeoJSON fitur choropleth risiko bencana (filter `level=kabupaten` atau `kecamatan`).
- `GET /api/wilayah/lookup?lat={lat}&lon={lon}` — Mengembalikan data wilayah administratif berdasarkan koordinat klik.
- `GET /api/wilayah/{id}/dampak` — Mengembalikan agregasi metrik dampak bencana lengkap.
- `GET /api/tiles/choropleth/{z}/{x}/{y}.mvt` — Vector Tile biner (MVT) poligon wilayah untuk MapLibre GL.

### Mitigasi & Evakuasi
- `GET /api/posko` — Daftar posko darurat dan faskes (parameter: `jenis`, `include_nonaktif`).
- `POST /api/routing/evakuasi` — Menghitung rute navigasi terdekat sadar-blokade (payload: `lat`, `lon`, `moda: "mobil" | "jalan_kaki"`).
- `GET /api/jalan-terputus` — Daftar ruas jalan yang terblokir akibat bencana.
- `POST /api/operator/jalan-terputus` — Menambahkan laporan blokade jalan baru (memerlukan token operator).

### Data Eksternal & Pelaporan
- `GET /api/eksternal/gempa-terkini` — Data sensor gempa bumi real-time BMKG TEWS.
- `GET /api/eksternal/cuaca-peringatan` — Data peringatan dini cuaca ekstrem & potensi galodo BMKG.
- `POST /api/eksternal/sync-ckan` — Pemicu sinkronisasi data terbuka Satu Data Sumbar.
- `GET /api/admin/sitrep` — Generator Situation Report (SITREP) standar BNPB & pesan WhatsApp dinas.
- `GET /api/health` — Telemetri kesehatan koneksi basis data, routing engine, dan uptime service.

---

## 8. Verifikasi & Pengujian Kualitas (Testing Trophy)

Proyek ini dilengkapi dengan rangkaian pengujian otomatis (*automated test suites*) untuk menjamin keandalan fungsional dan integritas data spasial:

```bash
cd backend

# Menjalankan pengujian regresi menyeluruh Fase 1 - 4
python -m pytest scripts/test_all_phases.py -v

# Menjalankan pengujian integritas data spasial & fitur Fase 5
python -m pytest scripts/test_fase5_data.py -v
```

### Hasil Pengujian:
- **`test_all_phases.py`**: **33/33 Tests PASS (100%)** — Mencakup autentikasi JWT, proteksi RBAC, spatial containment PostGIS, validasi skema Pydantic, algoritma penghindaran rute terputus, dan pembaruan materialized view.
- **`test_fase5_data.py`**: **6/6 Tests PASS (100%)** — Mencakup verifikasi 46 titik sirine EWS tsunami, 7 shelter TES evakuasi vertikal, eliminasi menara sirine dari target rute evakuasi, moda jalan kaki, endpoint SITREP BNPB, dan feed cuaca BMKG.
- **Frontend Typecheck & Build**: Kompilasi TypeScript (`tsc -b`) dan Vite bundling berhasil mulus dalam **2.15 detik** tanpa error.

---

## 9. Hak Cipta & Lisensi

Platform ini dikembangkan dalam rangka riset pengembangan teknologi kebencanaan:
- **Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) Universitas Putra Indonesia "YPTK" Padang**
- **Badan Penanggulangan Bencana Daerah (BPBD) Provinsi Sumatera Barat**

Dilisensikan di bawah lisensi terbuka [MIT License](LICENSE). Bebas digunakan, dipelajari, dan dikembangkan untuk kepentingan kemanusiaan dan penanggulangan bencana di Indonesia.
