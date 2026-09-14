# 01 — Arsitektur Sistem

## Diagram alur data

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  React + Vite + TypeScript + Tailwind                    │    │
│  │  ├── MapLibre GL JS (render peta)                        │    │
│  │  ├── Service Worker / Workbox (PWA, offline cache)        │    │
│  │  └── Apache ECharts (grafik statistik)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ HTTPS/REST + WebSocket        │ HTTP range requests
                ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│      BACKEND API (FastAPI)     │   │   OBJECT STORAGE / STATIC      │
│  ├── /api/wilayah/*            │   │   (basemap PMTiles, sprite,    │
│  ├── /api/bencana/*            │   │    font, style.json)           │
│  ├── /api/posko/*              │   └───────────────────────────────┘
│  ├── /api/routing/*  ──────────┼──────► OSRM / Valhalla (proses lokal)
│  ├── /api/auth/*                │
│  └── worker terjadwal (APScheduler)
│        ├── sync BMKG (5 menit)
│        └── sync BNPB/data.bnpb.go.id (harian)
└───────────────┬─────────────────┘
                │ SQL (psycopg / SQLAlchemy)
                ▼
┌───────────────────────────────┐
│   PostgreSQL + PostGIS         │
│   (data wilayah, bencana,      │
│    posko, jalan_terputus, user)│
└───────────────────────────────┘
                ▲
                │ backup harian (cron + pg_dump)
                ▼
        Storage backup terpisah
```

## Kenapa struktur ini (bukan yang lain)

- **Backend tunggal (bukan microservices)**: tim kecil, skala data provinsi (bukan nasional). Microservices menambah overhead operasional tanpa manfaat nyata di skala ini. Kalau nanti butuh scale, backend FastAPI ini stateless dan bisa dijalankan multi-instance di belakang reverse proxy tanpa refactor besar.
- **OSRM/Valhalla dijalankan sebagai proses terpisah, dipanggil backend** (bukan library yang di-embed) — supaya proses routing yang berat tidak memblokir event loop API utama.
- **Data eksternal (BMKG/BNPB) tidak pernah dipanggil langsung dari browser** — selalu lewat worker backend yang menyimpan ke database lokal dulu. Alasan: (1) menghindari CORS issue, (2) menghindari rate-limit API eksternal saat banyak user akses bersamaan, (3) dashboard tetap bisa tampil data (walau agak basi) meski API eksternal sedang down.

## Struktur direktori proyek yang disarankan

```
gis-sumbar/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/          # satu file per grup endpoint
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # logika bisnis (routing, sinkronisasi data)
│   │   ├── workers/             # job terjadwal (BMKG, BNPB sync)
│   │   └── core/                 # config, security, db session
│   ├── alembic/                    # migrasi database
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/           # per fitur: map, evakuasi, telusuri-bencana, dsb
│   │   ├── hooks/
│   │   ├── styles/               # design tokens (lihat 04-frontend-ui-ux.md)
│   │   ├── lib/                    # client API, util
│   │   └── main.tsx
│   ├── public/
│   │   └── manifest.json          # PWA manifest
│   └── vite.config.ts
├── gis-data/
│   ├── raw/                        # ekstrak OSM Sumbar (.osm.pbf)
│   ├── pmtiles/                     # hasil build basemap
│   ├── styles/                       # style JSON (terang, gelap, satelit)
│   └── scripts/                       # script build/rebuild tile & routing graph
├── routing/
│   ├── osrm-data/                     # graph OSRM hasil build
│   └── valhalla-data/                  # graph Valhalla hasil build
└── docs/                                # salinan file .md ini + docx final
```

## Alur permintaan tipikal: "Telusuri Bencana"

1. User klik titik di peta (lat/lon dari event MapLibre `click`).
2. Frontend kirim `GET /api/wilayah/lookup?lat=..&lon=..`.
3. Backend jalankan query PostGIS `ST_Contains` untuk temukan kecamatan/nagari yang mengandung titik tsb.
4. Backend agregasi data dampak (JOIN ke tabel `data_dampak_bencana`) untuk wilayah tsb.
5. Response JSON dikirim ke frontend, panel samping React menampilkan hasil dengan animasi.

## Alur permintaan tipikal: "Evakuasi Sekarang"

1. Frontend minta lokasi user (`navigator.geolocation`).
2. `GET /api/posko/nearest?lat=..&lon=..&limit=3` → backend query PostGIS `ST_Distance`/`<->` operator (KNN index) untuk 3 posko terdekat.
3. Untuk tiap posko kandidat, backend panggil OSRM/Valhalla lokal untuk hitung rute aktual (bukan jarak garis lurus).
4. Backend cek tabel `jalan_terputus` aktif — bila ruas jalan pada rute melewati segmen yang ditandai putus, exclude dan hitung ulang.
5. Backend pilih rute dengan waktu tempuh tersingkat di antara kandidat, kirim ke frontend sebagai GeoJSON LineString + instruksi turn-by-turn.
6. Frontend render garis rute di MapLibre + panel instruksi navigasi.

## Keputusan teknologi & alasannya (ringkas — detail di masing-masing file)

| Keputusan | Alasan singkat |
|---|---|
| MapLibre GL JS | WebGL, gratis, kualitas visual dapat menyamai Google Maps, tanpa vendor lock-in |
| PMTiles self-hosted | Kontrol visual & data penuh, tanpa API key, tanpa kuota |
| PostgreSQL + PostGIS | Standar industri untuk data spasial, query ST_Contains/ST_Distance matang |
| FastAPI | Python (familiar untuk tim riset akademik), async native, dokumentasi OpenAPI otomatis |
| OSRM + Valhalla | OSRM untuk kecepatan default, Valhalla untuk skenario exclude-jalan-putus yang lebih fleksibel |
| React + Vite | Ekosistem besar, banyak contoh integrasi MapLibre, build cepat |
| Tanpa Docker (tahap ini) | Permintaan eksplisit — deployment manual via systemd, lihat `08-keamanan-deployment.md` |

## Skalabilitas — jalur upgrade di masa depan (tidak perlu dikerjakan sekarang)

Kalau nanti proyek naik ke tahap produksi dengan Diskominfotik:
- Reverse proxy (Nginx/Caddy) di depan backend, siap load balance multi-instance.
- Redis untuk cache & job queue bisa ditambahkan tanpa mengubah kontrak API.
- Docker/container bisa diperkenalkan belakangan untuk kemudahan deployment berulang — arsitektur di atas tidak bergantung pada Docker sehingga migrasinya tidak akan menyakitkan.
