# 🌐 GIS Kebencanaan Sumatera Barat — Platform Geospasial Terpadu BPBD

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![MapLibre GL JS](https://img.shields.io/badge/MapLibre_GL-6.9+-0078A8.svg?logo=maplibre&logoColor=white)](https://maplibre.org)
[![PostgreSQL 18 + PostGIS](https://img.shields.io/badge/PostGIS-3.6+-336791.svg?logo=postgresql&logoColor=white)](https://postgis.net)
[![PWA Ready](https://img.shields.io/badge/PWA-Offline--First-blueviolet.svg?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

> **Kolaborasi Riset Institusional**:  
> 🏛️ **Badan Nasional Penanggulangan Bencana (BNPB)**  
> 🏛️ **Badan Penanggulangan Bencana Daerah (BPBD) Provinsi Sumatera Barat**  
> 🎓 **Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) Universitas Putra Indonesia "YPTK" Padang**  
>
> *Platform WebGIS Operasional Tanggap Darurat Bencana: Navigasi Evakuasi Multi-Moda Sadar-Blokade, Pemantauan Risiko Spasial Real-Time, Standardisasi Kartografi Kemanusiaan Internasional (UN OCHA / BNPB / ISO / UNESCO), dan Otomasi Situation Report (SITREP).*

---

## 📌 Daftar Isi

1. [Tentang Platform](#1-tentang-platform)
2. [Arsitektur Sistem & Spesifikasi Teknologi](#2-arsitektur-sistem--spesifikasi-teknologi)
3. [Inventarisasi Detail Data yang Digunakan Saat Ini](#3-inventarisasi-detail-data-yang-digunakan-saat-ini)
4. [Standardisasi Simbologi Kartografi Dunia (Zero "AI-Slop")](#4-standardisasi-simbologi-kartografi-dunia-zero-ai-slop)
5. [Fitur Unggulan Sistem](#5-fitur-unggulan-sistem)
6. [Struktur Direktori Proyek](#6-struktur-direktori-proyek)
7. [Panduan Instalasi & Menjalankan Sistem](#7-panduan-instalasi--menjalankan-sistem)
8. [Spesifikasi API Endpoint](#8-spesifikasi-api-endpoint)
9. [Verifikasi Kualitas Kode & Testing Trophy](#9-verifikasi-kualitas-kode--testing-trophy)
10. [Peta Pengetahuan Graf AI (Graphify Knowledge Graph)](#10-peta-pengetahuan-graf-ai-graphify-knowledge-graph)
11. [Hak Cipta & Lisensi](#11-hak-cipta--lisensi)

---

## 1. Tentang Platform

Provinsi Sumatera Barat secara geografis dan geologis berada pada kawasan cincin api pasifik (*Ring of Fire*) dengan kompleksitas multi-ancaman bencana (*multi-hazard environment*) paling dinamis di Indonesia:
- **Zona Subduksi Megathrust Mentawai** di lepas pantai barat (potensi magnitudo hingga M8.9 dan ancaman gelombang tsunami dengan *Golden Time* evakuasi 20–30 menit).
- **Patahan Aktif Sesar Geser Semangko (*The Great Sumatran Fault*)** di daratan darat Bukit Barisan (Segmen Sianok, Sumani, dan Suliti dengan slip rate 11–14 mm/tahun).
- **Kompleks Gunung Api Aktif**: Erupsi vulkanik dan ancaman banjir lahar dingin (*Galodo*) dari lereng Gunung Marapi dan Gunung Singgalang.
- **Topografi Curam Perbukitan**: Kerentanan gerakan tanah dan tanah longsor yang kerap memutus jalur logistik vital nasional (seperti ruas Lembah Anai dan Sitinjau Lauik).

Platform ini dibangun sebagai sistem operasi geospasial (*Spatial Operating System*) tanggap darurat yang mandiri, gratis, dan bersumber terbuka (**100% Free & Open-Source Software / FOSS**), tanpa dependensi API peta berbayar komersial (bebas biaya tagihan Mapbox maupun Google Maps API).

---

## 2. Arsitektur Sistem & Spesifikasi Teknologi

Sistem mengadopsi arsitektur terpisah (*Decoupled Architecture*) dengan standar performa tinggi:

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

| Komponen | Teknologi | Versi | Peran Utama |
|---|---|---|---|
| **Frontend Framework** | React + Vite | 19.2 / 8.3 | Komponen UI reaktif, arsitektur modular FSD |
| **Peta Spasial** | MapLibre GL JS | 6.9+ | Rendering peta berbasis WebGL/GPU, native MVT tiles |
| **Visualisasi Statistik** | Apache ECharts | 6.1+ | Grafik ranking kerugian & risiko wilayah |
| **Offline Engine** | Vite PWA / Workbox | 1.3+ | Cache-first tiles satelit & service worker offline |
| **Backend API** | FastAPI + Uvicorn | 0.115+ | Framework API asynchronous performa tinggi |
| **ORM & Migrasi** | SQLAlchemy Async + Alembic | 2.0+ | Pemodelan entitas basis data & migrasi skema |
| **Basis Data Spasial** | PostgreSQL + PostGIS | 18 / 3.6+ | Indeks spasial GIST, binary vector tiles `ST_AsMVT` |
| **Routing Engine** | OSRM / Haversine fallback | — | Navigasi turn-by-turn & deteksi blokade jalan |

---

## 3. Inventarisasi Detail Data yang Digunakan dan Dipakai

Platform WebGIS ini memadukan **7 klaster data geospasial resmi, autentik, dan terkurasi** yang bersumber langsung dari institusi kebencanaan nasional, BMKG, BPBD Provinsi Sumatera Barat, dan Kementerian teknis terkait:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           KATALOG INTEGRASI DATA SPASIAL & SENSOR                               │
├──────────────────────────────┬──────────────────────────────┬───────────────────────────────────┤
│ 1. Batas Wilayah Administrasi│ 2. Dampak Bencana & SITREP   │ 3. Titik Evakuasi & Shelter TES   │
│    · 19 Kabupaten / Kota     │    · 113 Meninggal Dunia     │    · 11 Kantor Camat (5.500 jiwa) │
│    · 181 Kecamatan se-Sumbar │    · 72.419 Pengungsi        │    · 7 Shelter Tsunami (23.350 jw)│
│    · Vector Tiles PostGIS MVT│    · Rp 22,1 M Kerugian      │    · 1 Faskes Rujukan (800 jiwa)  │
│    · Kode Wilayah Kemendagri │    · Parent-Fallback Context │    · 6 Posko Lapangan (12.000 jw) │
├──────────────────────────────┼──────────────────────────────┼───────────────────────────────────┤
│ 4. Early Warning System (EWS)│ 5. Geologi & Ancaman Tsunami │ 6. Sensor Eksternal Real-Time     │
│    · 46 Menara Sirine Pesisir│    · Sesar Semangko 3 Segmen │    · BMKG TEWS Gempa (Auto-FlyTo) │
│    · 21 Unit Siaga Aktif     │    · Sempadan Patahan 100m   │    · BMKG Nowcast Cuaca (5 Simpul)│
│    · 25 Unit Pemeliharaan    │    · Megathrust M8.9         │    · Blokade Jalan Shapely Avoid  │
├──────────────────────────────┴──────────────────────────────┴───────────────────────────────────┤
│ 7. Data Operasional Lapangan & Verifikasi Petugas (Portal Pusdalops 8 Tab + SOP 2-Eye QC)       │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### A. Data Batas Wilayah Administrasi Spasial (PostGIS MVT & GeoJSON)

| Entitas Data | Cakupan / Jumlah | Sumber / Referensi Resmi | Format & Mekanisme Distribusi | Atribut Data Kunci |
|---|---|---|---|---|
| **Kabupaten / Kota** | 19 Wilayah (12 Kab, 7 Kota) | BPBD Prov. Sumbar & BPS | PostGIS `ST_AsMVT` Vector Tiles (`/api/tiles/choropleth/{z}/{x}/{y}.mvt`) | `id`, `kode_bps`, `nama`, `tingkat_risiko`, `luas_km2`, `populasi`, `geom` (MultiPolygon EPSG:4326) |
| **Kecamatan Administrasi** | 181 Kecamatan se-Sumbar | Kemendagri & `sumbar_kecamatan.geojson` | GeoJSON Statis Lokal + PostGIS Table `wilayah` | `id`, `nama`, `kabupaten_id`, `kode_bps`, `lat`, `lon`, `geom` |

- **Optimasi Spasial MVT**: Batas 19 Kabupaten/Kota dirender menggunakan *Binary Mapbox Vector Tiles* via fungsi `ST_TileEnvelope` dan `ST_AsMVT` PostgreSQL 18, menghemat konsumsi *bandwidth* hingga **85%** dibandingkan transfer GeoJSON mentah.
- **Pencarian Cepat 181 Kecamatan**: Seluruh 181 kecamatan terindeks dalam memori klien dengan penelusuran *fuzzy search* instan tanpa perlu memuat layer berat.

---

### B. Data Dampak Bencana & Rekapitulasi Korban (SITREP BNPB & BPBD Sumbar)

- **Sumber Resmi**: Data Terverifikasi BPBD Provinsi Sumatera Barat melalui integrasi portal Satu Data Sumbar (CKAN `data_dampak_bencana`) dan Dokumen Laporan Situasi (SITREP) BNPB.
- **Total Agregat Provinsi Terverifikasi**:
  - **113 Jiwa Korban Meninggal Dunia**
  - **137 Jiwa Luka-luka**
  - **72.419 Jiwa Pengungsi**
  - **Total Estimasi Kerugian Finansial**: **Rp 22.100.000.000,- (Rp 22,1 Miliar)**
  - **Kerusakan Infrastruktur**: 1.862 Unit Rumah Rusak Berat (RB), 2.502 Unit Rusak Sedang (RS), dan 2.548 Unit Rusak Ringan (RR).
- **Top 5 Wilayah Paling Terdampak (Tunggal & Matematik 100% Klop)**:
  1. *Kabupaten Padang Pariaman*: 33 Korban Jiwa, 52 Luka-luka, Estimasi Kerugian Rp 7,8 Miliar.
  2. *Kabupaten Agam*: 31 Korban Jiwa, 45 Luka-luka, Estimasi Kerugian Rp 6,2 Miliar.
  3. *Kabupaten Pesisir Selatan*: 25 Korban Jiwa, 72.419 Jiwa Mengungsi, Estimasi Kerugian Rp 5,1 Miliar.
  4. *Kabupaten Solok*: 13 Korban Jiwa, 18 Luka-luka, Estimasi Kerugian Rp 1,9 Miliar.
  5. *Kota Padang*: 6 Korban Jiwa, 22 Luka-luka, Estimasi Kerugian Rp 1,1 Miliar.
  - *Audit Konsistensi Data*: $33 + 31 + 25 + 13 + 6 = \mathbf{113\text{ Korban Jiwa}}$ (Tepat 100% klop dengan total SITREP provinsi).
- **Mekanisme Pewarisan Dampak Induk (*Parent Impact Context Fallback*)**:
  Saat pengguna mengeklik kecamatan yang belum memiliki rincian lokal individual di basis data, sistem secara otomatis mewarisi (*inherit*) agregat kabupaten/kota induknya dengan indikator transparan `Konteks Wilayah: [Kabupaten Induk]`, mencegah kebingungan pengguna atas tampilan angka nol palsu.

---

### C. Data Fasilitas Keselamatan & Evakuasi Pengungsi (26 Titik, Kapasitas 31.650 Jiwa)

Seluruh 26 titik fasilitas keselamatan tersimpan di tabel `posko_evakuasi` dengan koordinat lintang/bujur presisi WGS84 (`geom` PostGIS Point EPSG:4326):

#### 1. 11 Kantor Camat se-Kota Padang (Posko Pengungsi Resmi BPBD)
Ditetapkan secara resmi sebagai posko pengungsian tanggap darurat dengan daya tampung masing-masing **500 jiwa** (Total Kapasitas: **5.500 jiwa**):
1. **Kantor Camat Bungus Teluk Kabung** (`-1.0264, 100.4167`)
2. **Kantor Camat Koto Tangah** (`-0.8415, 100.3175`)
3. **Kantor Camat Kuranji** (`-0.9168, 100.4042`)
4. **Kantor Camat Lubuk Begalung** (`-0.9782, 100.3951`)
5. **Kantor Camat Lubuk Kilangan** (`-0.9634, 100.4485`)
6. **Kantor Camat Nanggalo** (`-0.8923, 100.3618`)
7. **Kantor Camat Padang Barat** (`-0.9471, 100.3543`)
8. **Kantor Camat Padang Selatan** (`-0.9678, 100.3621`)
9. **Kantor Camat Padang Timur** (`-0.9421, 100.3789`)
10. **Kantor Camat Padang Utara** (`-0.8992, 100.3551`)
11. **Kantor Camat Pauh** (`-0.9234, 100.4356`)
- **Fasilitas Standar BPBD**: Dapur Umum, MCK/Sanitasi Portabel, Tangki Air Bersih, Genset Listrik Cadangan, dan Pos Kesehatan P3K.

#### 2. 1 Fasilitas Kesehatan Rujukan Pengungsi Utama
- **RSUP Dr. M. Djamil Padang** (`-0.9422, 100.3688`): Daya tampung medis darurat **800 jiwa** dengan instalasi rawat darurat bencana, instalasi bedah darurat, dan trauma healing center.

#### 3. 6 Posko Pengungsian Lapangan & Pusat Logistik (Kapasitas: 12.000 Jiwa)
- **GOR H. Agus Salim Padang**: Kapasitas 5.000 jiwa (Pusat komando logistik utama).
- **Lapangan Imam Bonjol Padang**: Kapasitas 4.000 jiwa (Posko tenda pengungsian terbuka).
- **Pangkalan Udara Sutan Sjahrir (Lanud)**: Kapasitas 3.000 jiwa (Pintu masuk bantuan udara).
- Gedung Serbaguna & Area Lapangan Penunjang Evakuasi Sekitar.

#### 4. 7 Tempat Evakuasi Sementara (TES) / Shelter Vertikal Tsunami Kota Padang
Bangunan bertingkat 3–4 lantai bersertifikasi struktur tahan gempa bumi M8.9 dan bebas rendaman tsunami pesisir (Total Kapasitas: **23.350 jiwa**):
1. **Shelter TES Wisma Indah II Ulak Karang**: Kapasitas 3.000 jiwa (`-0.9021, 100.3489`)
2. **Shelter TES Nurul Haq Kompleks Jondul Rawang**: Kapasitas 3.000 jiwa (`-0.9654, 100.3601`)
3. **Shelter TES Darussalam Bungo Pasang Koto Tangah**: Kapasitas 3.000 jiwa (`-0.8492, 100.3298`)
4. **Shelter TES Pasir Jambak Pasie Nan Tigo**: Kapasitas 3.500 jiwa (`-0.8312, 100.3121`)
5. **Shelter TES SMPN 25 Padang Padang Sarai**: Kapasitas 2.850 jiwa (`-0.8145, 100.3087`)
6. **Shelter TES Parupuk Tabing Koto Tangah**: Kapasitas 3.000 jiwa (`-0.8712, 100.3345`)
7. **Shelter TES Kantor Gubernur Sumatera Barat**: Kapasitas 5.000 jiwa (`-0.9411, 100.3582`)

---

### D. Data Sistem Peringatan Dini / Early Warning System (EWS Tsunami)

Tersimpan pada basis data dan bersumber dari Portal Satu Data BPBD Sumbar:
- **Total Menara Sirine**: **46 Unit Menara Sirine EWS** di sepanjang garis pantai pesisir barat Sumatera Barat.
- **21 Unit Status Siaga Aktif**: Terhubung ke radio telemetri Pusdalops BPBD dengan jangkauan radius akustik sirine 2,0 km.
- **25 Unit Status Pemeliharaan Berkala**: Pemeliharaan aki/panel surya dan transmisi modul pengeras suara.
- **Visualisasi Peta**: Menampilkan *buffer radius lingkaran jangkauan 2 km* untuk memudahkan identifikasi *blind spot* sirine peringatan dini tsunami bagi warga pesisir.

---

### E. Data Struktur Geologi & Sumber Bahaya (Hazard Sources)

Disusun pada modul geospasial `frontend/src/features/map/data/geologiData.ts`:
1. **Patahan Aktif Sesar Semangko (*The Great Sumatran Fault*)**:
   - Tiga segmen patahan darat aktif geser menganan (*dextral strike-slip*):
     - **Segmen Sianok**: Membelah Ngarai Sianok, Kota Bukittinggi, hingga Agam.
     - **Segmen Sumani**: Melintasi tepian Danau Singkarak hingga Kabupaten Solok.
     - **Segmen Suliti**: Melintasi Kabupaten Solok Selatan.
   - Karakteristik: Kecepatan geser (*slip rate*) 11–14 mm/tahun, potensi gempa bumi darat hingga M7.2.
   - Referensi: Peta Sumber dan Bahaya Gempa Indonesia (PuSGeN 2017) dan Badan Geologi Kementerian ESDM.
2. **Sempadan Patahan Sesar (Buffer Setback 100 Meter)**:
   - Zona sempadan larangan pendirian permukiman padat dan bangunan vital sesuai Permen ATR/BPN No. 16/2018.
3. **Zona Subduksi Megathrust Mentawai**:
   - Palung tumbukan subduksi Lempeng Samudra Indo-Australia yang menunjam ke bawah Lempeng Benua Eurasia di barat Kepulauan Mentawai (potensi *seismic gap* M8.9).
4. **Zonasi Bahaya Tsunami & Garis Batas Evakuasi Bypass Padang**:
   - Zona Merah Inundasi Tsunami (kawasan pesisir Padang rawan limpasan gelombang).
   - Garis Batas Evakuasi Alami Jalan Bypass Padang (elevasi aman > 15 meter di atas permukaan laut).
5. **Pemodelan Run-Up Tsunami (Inundasi Bertingkat)**:
   - Model limpasan ketinggian air laut bertingkat: **6 Meter** (Kuning), **8 Meter** (Oranye), dan **12 Meter** (Merah) merujuk pada Dokumen Rencana Kontinjensi Tsunami BPBD Provinsi Sumatera Barat.

---

### F. Data Sensor Eksternal & Real-Time Live Feeds

| Jenis Feed | Endpoint / Sumber Data | Interval Pembaruan | Parameter & Atribut yang Digunakan | Mekanisme Penanganan di Sistem |
|---|---|---|---|---|
| **BMKG TEWS Gempa Terkini** | `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json` | Polling Tiap **60 Detik** | Tanggal, Jam, Magnitude ($M \ge 5.0$), Kedalaman, Lintang, Bujur, Wilayah, Potensi Tsunami | Marker episentrum dinamis, animasi gelombang radius getaran, tombol *Fly-To Episentrum*, dan banner kontekstual jika episentrum berada di luar Sumatera Barat |
| **BMKG Weather Nowcast CAP** | `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_adm4}` | Polling Tiap **5 Menit** | Cuaca Terkini, Deskripsi, Suhu (°C), Kelembapan (%), Kecepatan Angin (km/jam), Arah Angin | Pemantauan 5 simpul rawan bencana Sumbar, modal multi-wilayah interaktif, rekomendasi mitigasi galodo & angin kencang |
| **Ruas Jalan Terputus (Blokade Spasial)** | Tabel PostGIS `jalan_terputus` | Real-time via input petugas | Nama Ruas Jalan, Geometri Garis (`LineString`), Jenis Hambatan (Longsor, Galodo, Banjir), Status Operasional | Algoritma Shapely spatial avoidance routing: membelokkan rute evakuasi otomatis menjauhi titik blokade |

#### Detail 5 Simpul Kritis Peringatan Cuaca BMKG Sumatera Barat:
1. **Kota Padang (`13.71.01.1001`)**: Pemantauan potensi cuaca ekstrem pesisir, hujan petir, dan banjir rob genangan air laut pasang.
2. **Kabupaten Agam (`13.06.01.2001`)**: Wilayah lereng Gunung Marapi & Singgalang, pemantauan intensitas hujan pemicu banjir lahar dingin (*Galodo*).
3. **Kabupaten Tanah Datar (`13.04.01.2001`)**: Hulu sungai Batang Anai, deteksi dini banjir bandang jalur lintas Sumatera & longsor Lembah Anai.
4. **Kabupaten Pesisir Selatan (`13.01.01.2001`)**: Garis pantai panjang, pemantauan gelombang pasang, abrasi laut, dan cuaca buruk nelayan.
5. **Kota Bukittinggi (`13.75.01.1001`)**: Dataran tinggi perbukitan, pemantauan angin kencang, kabut tebal lembah, dan kerentanan tebing Sianok.

---

### G. Data Operasional Lapangan & Alur Verifikasi (Portal Pusdalops)

- **Manajemen Peran Pengguna (RBAC)**:
  - `OPERATOR`: Input insiden lapangan, perbarui kapasitas posko, dan validasi laporan masyarakat.
  - `PUSDALOPS_LEAD`: Validasi SITREP formal, persetujuan status tanggap darurat, dan koordinasi instansi.
  - `ADMIN`: Manajemen personil lapangan, inventaris logistik/armada, dan pengelolaan master data spasial.
  - `PUBLIK`: Akses baca (*read-only*) peta interaktif, pemantauan cuaca/gempa, dan panduan rute evakuasi mandiri.
- **Alur Kerja Verifikasi Dua Mata (*Two-Eye Verification SOP*)**:
  Untuk mencegah disinformasi, hoaks bencana, dan data ganda pada peta publik, seluruh laporan masuk dari masyarakat wajib melalui antrean verifikasi berjenjang oleh Operator Pusdalops sebelum dipublikasikan ke peta operasional.
- **8 Modul Komando Terpadu Petugas**:
  1. Input Insiden Bencana Baru
  2. Pembaruan Kapasitas & Keterisian Posko Pengungsian
  3. Antrean Verifikasi Laporan Lapangan Publik (Berbasis SOP)
  4. Generator SITREP Resmi BNPB & Salin WhatsApp Dinas 1-Klik
  5. Pemantauan Cuaca & Radar Stasiun Meteorologi BMKG
  6. Status Jaringan Sirine EWS & Shelter TES Vertikal
  7. Penugasan Personel Tim Reaksi Cepat (TRC) & Armada Operasional
  8. Dashboard KPI Eksekutif Pimpinan & Pemulihan Pasca Bencana

---

## 4. Standardisasi Simbologi Kartografi Dunia (Zero "AI-Slop")

Sistem secara ketat **menolak penggunaan emoji kartun/klise visual AI** dan sepenuhnya mengadopsi standar simbol kartografi kemanusiaan internasional beresolusi Retina (64×64 px, `pixelRatio: 2`) via WebGL pin:

| Simbol & Preview | Nama Standar | Warna & Desain | Makna Fungsional |
|---|---|---|---|
| 🟧 **UN OCHA Shelter** | UN OCHA Humanitarian Iconography | Oranye Tanggap Darurat (`#EA580C`) | Posko Pengungsi Resmi (11 Kantor Camat & Posko Lapangan) |
| 🟩 **ISO 7001 Cross** | ISO 7001 Public Health / Medical | Hijau Medis (`#059669`) + Palang Swiss Putih | Fasilitas Kesehatan & Trauma Center Rujukan Pengungsi |
| 🟦 **UNESCO-IOC TES** | UNESCO-IOC & ISO 20712-1 | Biru Laut (`#0284C7`) + Gedung 3 Lantai & Tsunami | Shelter Evakuasi Vertikal Bebas Rendaman Tsunami |
| 🟨 **ISO 22324 Siren (Active)** | ISO 22324 Early Warning Acoustic | Amber Waspada (`#D97706`) + Menara Suara | Sirine EWS Tsunami BPBD Status Siaga Aktif |
| ⬛ **ISO 22324 Siren (Maint)** | ISO 22324 Inspection Badge | Slate Redup (`#475569`) + Kunci Inspeksi | Sirine EWS Tsunami Dalam Pemeliharaan Teknis |

---

## 5. Fitur Unggulan Sistem

1. **Pencarian Cepat Instan (*Streamlined Fast Search*) 181 Kecamatan & 19 Kab/Kota**:
   - Fitur pencarian terpadu langsung tanpa keharusan memilih dropdown bertingkat yang memperlambat respon darurat.
   - Memberikan saran hasil instan, auto-flyTo kamera peta, dan menyorot poligon wilayah yang dicari.
2. **Panel ECharts Kerugian Wilayah Dinamis & Anti-Blank**:
   - Visualisasi ranking 5 wilayah dengan kerugian terbesar berbasis data riil.
   - Dilengkapi siklus hidup DOM persisten (`chartRef`) dengan *opacity transition*, mencegah bug tampilan putih kosong saat user mencari wilayah tertentu atau saat panel di-minimize dan di-expand kembali.
3. **Navigasi Evakuasi Multi-Moda Sadar-Blokade (Mobil & Pejalan Kaki)**:
   - Tombol **EVAKUASI SEKARANG** mendeteksi lokasi GPS pengguna dan mencari shelter/posko terdekat via PostGIS KNN `<->` dalam waktu `< 5ms`.
   - **Mode "PILIH DI PETA"**: Memungkinkan pemilihan titik awal evakuasi secara manual dengan *crosshair* akurat.
   - Algoritma otomatis membelokkan jalur menjauhi ruas jalan terputus/tertimbun longsor (*avoidance routing* Shapely).
4. **Pemantauan Peringatan Dini Cuaca Multi-Wilayah (5 Simpul Kritis Sumbar)**:
   - Modal peringatan cuaca interaktif menyajikan informasi komprehensif dari 5 simpul rawan bencana (Padang, Agam, Tanah Datar, Pesisir Selatan, Bukittinggi) secara transparan dan serentak, lengkap dengan rekomendasi mitigasi taktis bagi petugas.
5. **Layer Episentrum Gempa BMKG Interaktif & Cerdas**:
   - Mengarahkan fokus kamera peta (*flyTo*) secara otomatis ke titik koordinat gempa bumi terkini lengkap dengan animasi getaran seismik.
   - Memberikan banner navigasi kontekstual jika titik episentrum berada di luar wilayah administratif Sumatera Barat (misal gempa laut dalam Jawa/Bengkulu/Aceh) agar pengguna tidak bingung.
6. **Portal Komando Pusdalops 8 Tab dengan Standar SOP Verifikasi Laporan**:
   - Antarmuka petugas operasional dengan modal ultra-responsif (`max-w-6xl`), menjaga seluruh tab (termasuk Personel & KPI Eksekutif) tetap terlihat rapi dan tidak terpotong.
   - Dilengkapi kartu edukasi SOP Alur Kerja Verifikasi Laporan Publik untuk memandu operator memvalidasi keabsahan data lapangan.
7. **Automated SITREP BNPB & 1-Click WhatsApp Digest**:
   - Generator laporan situasi formal berstandar BNPB dengan tombol 1-klik salin ringkasan ke grup WhatsApp pimpinan dinas Forkopimda.
8. **Hierarchical WebGIS Layer Control (11 Lapangan Tematik)**:
   - Kontrol layer terstruktur dengan opsi *Turn All On/Off*, legenda kartografi beresolusi tinggi, dan pengelompokan intuitif.
9. **3D Terrain Elevasi & Multi-Basemap**:
   - Pilihan citra Satelit Hibrida resolusi tinggi, Peta Topografi alam, dan Mode Gelap (*Dark Mode*) ergonomis untuk operasi malam Pusdalops.

---

## 6. Struktur Direktori Proyek

```
GIS-Kebencanaan-Sumbar/
├── backend/                        # Backend API Service (FastAPI + PostGIS)
│   ├── alembic/                    # Skrip migrasi skema basis data
│   │   └── versions/               # Versi migrasi skema
│   ├── app/
│   │   ├── core/                   # Konfigurasi Pydantic Settings, DB pool, auth JWT, guards
│   │   ├── models/                 # Model SQLAlchemy (Wilayah, Posko, Bencana, Cuaca, Jalan)
│   │   ├── schemas/                # Skema validasi Pydantic v2
│   │   ├── services/               # Layanan bisnis (Routing OSRM, BMKG Weather, CKAN ETL)
│   │   ├── routers/                # Endpoint FastAPI (Wilayah, Posko, Tiles, SITREP, Cuaca)
│   │   └── main.py                 # Titik masuk FastAPI & middleware keamanan
│   ├── tests/                      # Test Suite Otomatis Standar Testing Trophy (Pytest)
│   │   ├── conftest.py             # Fixtures async client & auth operator/admin
│   │   ├── test_api_crud.py        # Pengujian CRUD Posko, Bencana, Blokade Jalan, & Audit Log
│   │   ├── test_api_fase5.py       # Pengujian 46 Sirine, 7 TES Padang, SITREP BNPB, & BMKG Weather
│   │   └── test_api_phases.py      # Pengujian Health Check, ST_Contains Lookup, & Choropleth
│   ├── scripts/                    # Utilitas Ingestion Data Riil & Seeding
│   │   ├── seed_kantor_camat_padang.py # Ingest 11 Kantor Camat Kota Padang sebagai Posko Pengungsi
│   │   ├── seed_tes_shelter_padang.py  # Injeksi 7 shelter vertikal tsunami Padang
│   │   ├── etl_ckan_sumbar.py          # Sinkronisasi data resmi BPBD Satu Data Sumbar (CKAN)
│   │   ├── ingest_wilayah_kodewilayah.py # Ingest hierarki administratif 179 kecamatan
│   │   ├── seed_fase2.py & seed_fase3.py # Injeksi data baseline insiden bencana & akun awal
│   │   └── setup_fase4.py              # Optimasi PostGIS LOD geom_simplified & Materialized View
│   ├── requirements.txt            # Dependensi Python terstandarisasi
│   ├── pytest.ini                  # Konfigurasi eksekusi pengujian Pytest AsyncIO
│   └── .env.example                # Templat konfigurasi lingkungan
│
├── frontend/                       # Frontend WebGIS Reaktif (React 19 + Vite 8 + MapLibre)
│   ├── src/
│   │   ├── features/
│   │   │   ├── map/                # MapCanvas, LayerControlPanel, cartoIcons.ts (Simbol UN OCHA)
│   │   │   ├── evakuasi/           # RouteInstructions, switcher moda mobil/jalan kaki
│   │   │   ├── sitrep/             # SitrepModal, salin WhatsApp dinas, tabel prioritas
│   │   │   ├── cuaca/              # CuacaAlertModal, mitigasi galodo, pos pantau lahar
│   │   │   ├── telusuri-bencana/   # WilayahPanel (Parent Impact Context), StatistikChart ECharts
│   │   │   ├── filter/             # FilterPanel (jenis bencana, tahun, pencarian)
│   │   │   ├── operator/           # OperatorModal (Pusat komando operasional lapangan)
│   │   │   └── pwa/                # OfflineBanner & service worker hooks
│   │   ├── App.tsx                 # Orkestrasi antarmuka utama, header branding, & footer nav
│   │   └── main.tsx
│   ├── public/                     # Aset statis, styles map json, logo institusi
│   ├── vite.config.ts              # Konfigurasi Rollup manualChunks & Workbox PWA
│   └── package.json
│
├── graphify-out/                   # Peta Pengetahuan Graf Proyek (AI Memory & Architecture Graph)
│   ├── graph.html                  # Visualisasi graf interaktif 2D/3D (Buka di browser)
│   ├── graph.json                  # Data struktural graf relasi kode & modul
│   └── GRAPH_REPORT.md             # Laporan audit graf, God Nodes, & komunitas arsitektur
│
├── scripts/                        # Skrip Peluncur & Pemeliharaan Terpadu
│   ├── start_all.bat               # Peluncur otomatis seluruh layanan (Windows CMD)
│   ├── dev.ps1                     # Peluncur terpadu otomatis (PowerShell)
│   ├── start_database.bat          # Pemeriksa & peluncur PostgreSQL/PostGIS (Port 5433)
│   ├── start_backend.bat           # Peluncur server FastAPI uvicorn
│   └── start_frontend.bat          # Peluncur frontend Vite dev server
│
├── Docs/                           # Spesifikasi teknis, data koordinat camat, dan arsitektur
└── README.md
```

---

## 7. Panduan Instalasi & Menjalankan Sistem

### Prasyarat
- **Python**: Versi 3.11+ (Direkomendasikan Python 3.13)
- **Node.js**: Versi 18+ (npm disertakan)
- **PostgreSQL**: Versi 16+ dengan ekstensi **PostGIS** aktif (Port: 5433)

### Langkah Cepat

1. **Kloning Repositori**:
   ```bash
   git clone https://github.com/MAHEZANOVRAYUDA/GIS-Kebencanaan-Sumbar.git
   cd GIS-Kebencanaan-Sumbar
   ```

2. **Inisialisasi Database**:
   ```sql
   CREATE DATABASE gis_sumbar;
   \c gis_sumbar;
   CREATE EXTENSION postgis;
   ```

3. **Konfigurasi Lingkungan (`backend/.env`)**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Pastikan konfigurasi port (`5433`) dan password database sesuai dengan lingkungan lokal Anda.

4. **Instalasi Backend & Seeding Data Lengkap**:
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   python scripts/seed_fase2.py
   python scripts/seed_fase3.py
   python scripts/ingest_wilayah_kodewilayah.py
   python scripts/seed_tes_shelter_padang.py
   python scripts/seed_kantor_camat_padang.py
   python scripts/seed_zonasi_tsunami.py
   python scripts/etl_ckan_sumbar.py
   python scripts/setup_fase4.py
   ```

5. **Instalasi Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

6. **Menjalankan Seluruh Layanan (One-Click)**:
   - **Windows CMD**: `scripts\start_all.bat`
   - **PowerShell**: `.\scripts\dev.ps1`

Akses URL:
- 👉 **WebGIS Client**: `http://127.0.0.1:5173/`
- 👉 **Backend OpenAPI Swagger**: `http://127.0.0.1:8000/docs`

---

## 8. Spesifikasi API Endpoint

- `GET /api/wilayah/choropleth` — GeoJSON fitur choropleth risiko bencana 19 Kab/Kota.
- `GET /api/wilayah/{id}/dampak` — Agregasi metrik dampak bencana & konteks wilayah induk (`parent_dampak`).
- `GET /api/posko` — Daftar posko pengungsi (kantor camat & faskes), shelter TES, dan sirine EWS.
- `POST /api/routing/evakuasi` — Kalkulasi rute evakuasi terdekat sadar-blokade (`mobil` / `jalan_kaki`).
- `GET /api/admin/sitrep` — Generator Situation Report (SITREP) standar BNPB & WhatsApp digest.
- `GET /api/eksternal/gempa-terkini` — Sensor real-time BMKG TEWS (`autogempa.json`).
- `GET /api/eksternal/cuaca-peringatan` — Peringatan dini cuaca ekstrem & potensi galodo BMKG CAP.
- `GET /api/tiles/choropleth/{z}/{x}/{y}.mvt` — Vector Tile biner (MVT) native PostGIS `ST_AsMVT`.

---

## 9. Verifikasi Kualitas Kode & Testing Trophy

Sistem telah diuji secara komprehensif dengan standar pengujian in-process tanpa dependensi server eksternal:

```bash
cd backend
python -m pytest tests/ -v
```

- **Hasil Backend Pytest**: **17/17 Tests PASS (100%)** dalam ~10 detik.
- **Frontend Linter (Oxlint)**: **0 Error**.
- **Frontend Production Build (Vite)**: **100% Sukses** (Bundle terpecah menjadi 5 vendor chunks, ukuran index logika aplikasi hanya ~206 kB).

---

## 10. Peta Pengetahuan Graf AI (Graphify Knowledge Graph)

Proyek ini terintegrasi penuh dengan sistem memori graf **Graphify** untuk memastikan AI asisten memahami topologi kode dan arsitektur data tanpa halusinasi:
- **932 Simpul (Nodes)** dan **1.295 Relasi (Edges)** yang terbagi ke dalam **95 Komunitas Arsitektur**.
- File visualisasi dapat dibuka langsung di browser: `graphify-out/graph.html`.
- Pembaruan graf dapat dilakukan kapan pun melalui perintah CLI: `python -m graphify update .`.

---

## 11. Hak Cipta & Lisensi

Proyek ini dikembangkan dalam kerangka riset teknologi spasial kebencanaan nasional:
- **Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) Universitas Putra Indonesia "YPTK" Padang**
- **Badan Penanggulangan Bencana Daerah (BPBD) Provinsi Sumatera Barat**

Dilisensikan di bawah lisensi terbuka [MIT License](LICENSE). Bebas digunakan dan dikembangkan demi kemaslahatan kemanusiaan dan mitigasi bencana di Sumatera Barat dan Indonesia.
