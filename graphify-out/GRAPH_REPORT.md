# Graph Report - GIS-Kebencanaan-Sumbar  (2026-09-18)

## Corpus Check
- 124 files · ~115,153 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 932 nodes · 1295 edges · 95 communities (61 shown, 18 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5eadfa05`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Pengguna
- frontend/package.json
- fix_sumbar_boundaries_accurate.py
- routers/cascading_wilayah.py
- kalkulasi_evakuasi_darurat
- models/__init__.py
- routers/posko.py
- eksternal.py
- Dokumen_Final_GIS_Kebencanaan_Sumbar_705ea7d4.md
- compilerOptions
- auth.py
- compilerOptions
- test_api_fase5.py
- test_api_crud.py
- test_api_phases.py
- FastAPI
- get_async_db
- datetime
- global_exception_handler
- conftest.py
- test_api_chatbot.py
- include_object
- .oxlintrc.json
- Settings
- ingest_wilayah_kodewilayah.py
- MapCanvas.tsx
- seed_tes_shelter_padang.py
- setup_fase4.py
- test_all_phases.py
- 🌐 GIS Kebencanaan Sumatera Barat — Platform Geospasial Terpadu BPBD
- test_crud_and_decision.py
- tsconfig.json
- build_basemap.sh script
- backup_database.sh script
- load-test.js
- 07 — Integrasi Data Eksternal (Versi Lengkap, Terverifikasi)
- 11 — Optimasi Performa & Audit Kritis (Agar Sistem Ringan)
- Skema inti
- 03 — Backend & API
- 05 — Peta & GIS Teknis (MapLibre GL JS)
- 6.1 Kelompok Fitur INTI (Wajib untuk Demo)
- 04 — Frontend, Desain & UI/UX (Non-Generik)
- 00 — Overview Proyek: GIS Kebencanaan Sumbar
- 01 — Arsitektur Sistem
- 06 — Routing Evakuasi (OSRM & Valhalla)
- 08 — Keamanan & Deployment (Tanpa Docker)
- 10 — Katalog Data Sumbar (Referensi Cepat, Siap Tempel)
- 09 — Instruksi untuk AI Coding Agent
- etl_ckan_sumbar.py
- React + TypeScript + Vite
- seed_kantor_camat_padang.py
- rules/graphify.md
- workflows/graphify.md
- test_evakuasi_alur.py
- test_cascading_wilayah.py
- 4. Arsitektur Teknologi
- App.tsx
- 2. Analisis Kondisi Saat Ini & Evaluasi Dokumen Sebelumnya
- 5. Sumber Data & Integrasi API
- 6.2 Kelompok Fitur PENTING
- FilterPanel.tsx
- react
- LayerControlPanel.tsx
- CuacaAlertModal.tsx
- 10. Roadmap Implementasi
- 9. Analisis Biaya & Sumber Daya
- SitrepModal.tsx
- main.tsx
- 11. Kesimpulan & Rekomendasi
- 8. Keamanan, Skalabilitas & Ketahanan Sistem
- seed_zonasi_tsunami.py
- sync_cascading_wilayah.py
- seed_fase3.py
- chat_disaster_assistant
- test_fase5_data.py
- get_choropleth_tile
- EvakuasiModal.tsx
- deps/package.json
- ingest_sumbar_kecamatan_polygons.py

## God Nodes (most connected - your core abstractions)
1. `Pengguna` - 29 edges
2. `record_audit()` - 21 edges
3. `compilerOptions` - 18 edges
4. `get_async_db()` - 17 edges
5. `kalkulasi_evakuasi_darurat()` - 17 edges
6. `react` - 17 edges
7. `lucide-react` - 15 edges
8. `compilerOptions` - 15 edges
9. `11 — Optimasi Performa & Audit Kritis (Agar Sistem Ringan)` - 14 edges
10. `🌐 GIS Kebencanaan Sumatera Barat — Platform Geospasial Terpadu BPBD` - 13 edges

## Surprising Connections (you probably didn't know these)
- `get_my_profile()` --uses--> `Pengguna`  [INFERRED]
  backend/app/routers/auth.py → backend/app/models/pengguna.py
- `login()` --uses--> `Pengguna`  [INFERRED]
  backend/app/routers/auth.py → backend/app/models/pengguna.py
- `create_posko()` --uses--> `Pengguna`  [INFERRED]
  backend/app/routers/posko.py → backend/app/models/pengguna.py
- `delete_posko()` --uses--> `Pengguna`  [INFERRED]
  backend/app/routers/posko.py → backend/app/models/pengguna.py
- `update_posko()` --uses--> `Pengguna`  [INFERRED]
  backend/app/routers/posko.py → backend/app/models/pengguna.py

## Import Cycles
- None detected.

## Communities (95 total, 18 thin omitted)

### Community 0 - "Pengguna"
Cohesion: 0.05
Nodes (74): get_current_user(), get_current_user_optional(), AsyncSession, Request, require_role(), decode_token(), Pengguna, Base (+66 more)

### Community 1 - "frontend/package.json"
Cohesion: 0.05
Nodes (42): dependencies, echarts, lucide-react, maplibre-gl, pmtiles, react, react-dom, devDependencies (+34 more)

### Community 2 - "fix_sumbar_boundaries_accurate.py"
Cohesion: 0.50
Nodes (4): normalize_name(), Script: fix_sumbar_boundaries_accurate.py Membersihkan dan memetakan secara…, Normalisasi string nama wilayah untuk pencocokan ketat., run_fix()

### Community 3 - "routers/cascading_wilayah.py"
Cohesion: 0.19
Nodes (17): Kecamatan, Kota, Provinsi, Base, list_kecamatan(), list_kota(), list_provinsi(), AsyncSession (+9 more)

### Community 4 - "kalkulasi_evakuasi_darurat"
Cohesion: 0.09
Nodes (41): cek_status_bencana_aktif(), evakuasi_darurat(), EvakuasiRequest, EvakuasiResponse, InstruksiLangkah, PoskoInfo, AsyncSession, BaseModel (+33 more)

### Community 5 - "models/__init__.py"
Cohesion: 0.06
Nodes (44): get_sync_db(), Dependency generator session database synchronous., AuditLog, Base, DataDampakBencana, KejadianBencana, Base, PeringatanCuacaBMKG (+36 more)

### Community 6 - "routers/posko.py"
Cohesion: 0.13
Nodes (26): create_posko(), delete_posko(), detail_posko(), list_semua_posko(), nearest_posko_endpoint(), PoskoCreateRequest, PoskoStatusRequest, PoskoUpdateRequest (+18 more)

### Community 7 - "eksternal.py"
Cohesion: 0.15
Nodes (14): get_gempa_terkini(), get_peringatan_cuaca(), AsyncSession, get, post, Admin/Operator: Memicu sinkronisasi ulang data terbuka BPBD Sumbar dari portal…, Endpoint Publik: Mengembalikan gempa bumi terbaru dari cache lokal (hasil sync…, Memicu sinkronisasi gempa BMKG secara manual. (+6 more)

### Community 8 - "Dokumen_Final_GIS_Kebencanaan_Sumbar_705ea7d4.md"
Cohesion: 0.22
Nodes (8): 12. Paket Dokumentasi Teknis Pendamping, 1. Ringkasan Eksekutif, 3.1 Tujuan Umum, 3.2 Sasaran Spesifik & Indikator Keberhasilan, 3. Tujuan & Sasaran Pengembangan, 7. Pengguna & Hak Akses (RBAC), Daftar Isi, Matriks Hak Akses

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "auth.py"
Cohesion: 0.19
Nodes (16): create_access_token(), create_refresh_token(), Any, verify_password(), get_my_profile(), login(), LoginRequest, LoginResponse (+8 more)

### Community 11 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 12 - "test_api_fase5.py"
Cohesion: 0.23
Nodes (14): AsyncClient, asyncio, Test 7 TES vertical tsunami shelters in Padang., Test 46 BPBD tsunami warning sirens., Test automated SITREP BNPB and WhatsApp digest formatting., Test BMKG extreme weather alerts endpoint., Test emergency walking evacuation routing towards shelter., Test posko active and total counts. (+6 more)

### Community 13 - "test_api_crud.py"
Cohesion: 0.20
Nodes (13): AsyncClient, Test road blockade reporting and resolution lifecycle., Test audit trail recording for mutation actions., Test full lifecycle of Posko Evakuasi: create, detail, update, delete., Test login for operator and admin., Test EWS Tsunami Siren network status endpoint., Test incident reporting by operator and approval by supervisor/admin., test_audit_logs_recorded() (+5 more)

### Community 14 - "test_api_phases.py"
Cohesion: 0.26
Nodes (12): AsyncClient, asyncio, Test choropleth GeoJSON features for 19 regencies/cities., Test spatial ST_Contains point-in-polygon lookup for Padang coordinates., Test aggregated disaster impact statistics., Test BMKG autogempa TEWS real-time sensor endpoint., Test health check telemetries (DB and uptime)., test_bmkg_gempa_terkini() (+4 more)

### Community 15 - "FastAPI"
Cohesion: 0.22
Nodes (11): lifespan(), get, root(), post, Trigger manual refresh materialized view CONCURRENTLY untuk admin/petugas., Me-refresh Materialized View mv_dampak_per_kecamatan secara CONCURRENTLY sesuai…, Background worker terjadwal untuk refresh MV mv_dampak_per_kecamatan setiap 15…, refresh_mv_dampak_concurrently() (+3 more)

### Community 16 - "get_async_db"
Cohesion: 0.15
Nodes (11): get_async_db(), AsyncSession, Dependency injection session database async untuk FastAPI endpoint., check_health(), AsyncSession, get, Health check komprehensif untuk Uptime Kuma / monitoring otomatis. Memeriksa…, get_situation_report() (+3 more)

### Community 17 - "datetime"
Cohesion: 0.29
Nodes (8): Menjalankan scheduler background APScheduler untuk sinkronisasi BMKG setiap 5…, Sinkronisasi Gempa BMKG Real-Time (sesuai spesifikasi 07-integrasi-data-…, start_bmkg_scheduler(), sync_gempa_bmkg(), upsert_gempa_sync(), Script Seeding Data Realistis Kecamatan, Kejadian Bencana, & Dampak Bencana…, seed_data(), datetime

### Community 18 - "global_exception_handler"
Cohesion: 0.24
Nodes (10): add_security_headers(), global_exception_handler(), Request, rate_limit_handler(), validation_exception_handler(), Exception, exception_handler, middleware (+2 more)

### Community 19 - "conftest.py"
Cohesion: 0.31
Nodes (8): admin_headers(), client(), operator_headers(), AsyncClient, Fixture to obtain valid JWT token for field operator., Fixture to obtain valid JWT token for Pusdalops admin., Async client fixture using in-process ASGITransport., fixture

### Community 20 - "test_api_chatbot.py"
Cohesion: 0.26
Nodes (12): AsyncClient, asyncio, Test rekomendasi shelter/posko terdekat berdasarkan koordinat pengguna., Test asisten AI merespons kondisi cuaca ekstrem BMKG Minangkabau., Test penyediaan kontak darurat BPBD, Basarnas, Ambulans., Test asisten AI merespons pertanyaan gempa bumi dengan data sensor BMKG., Test pesan pembuka default jika pengguna menyapa secara umum., test_chatbot_cuaca_alert() (+4 more)

### Community 21 - "include_object"
Cohesion: 0.38
Nodes (6): include_object(), Jalankan migrasi dalam mode 'offline'., Jangan hapus/ubah tabel internal PostGIS., Jalankan migrasi dalam mode 'online'., run_migrations_offline(), run_migrations_online()

### Community 22 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 24 - "ingest_wilayah_kodewilayah.py"
Cohesion: 0.50
Nodes (4): create_bounding_box_geom(), ingest_wilayah(), Script Ingestion Hierarki Wilayah Administratif Resmi Provinsi Sumatera Barat…, Membuat MultiPolygon WGS84 di sekitar centroid wilayah.

### Community 25 - "MapCanvas.tsx"
Cohesion: 0.14
Nodes (18): registerCartoIcons(), SVG_FASKES_PENGUNGSI, SVG_POSKO_PENGUNGSI, SVG_SHELTER_TES, SVG_SIRINE_AKTIF, SVG_SIRINE_MAINT, cuacaAlertZonesGeoJSON, megathrustMentawaiGeoJSON (+10 more)

### Community 31 - "🌐 GIS Kebencanaan Sumatera Barat — Platform Geospasial Terpadu BPBD"
Cohesion: 0.07
Nodes (27): 10. Peta Pengetahuan Graf AI (Graphify Knowledge Graph), 11. Hak Cipta & Lisensi, 1. 11 Kantor Camat se-Kota Padang (Posko Pengungsi Resmi BPBD), 1. Tentang Platform, 2. 1 Fasilitas Kesehatan Rujukan Pengungsi Utama, 2. Arsitektur Sistem & Spesifikasi Teknologi, 3. 6 Posko Pengungsian Lapangan & Pusat Logistik (Kapasitas: 12.000 Jiwa), 3. Inventarisasi Detail Data yang Digunakan dan Dipakai (+19 more)

### Community 43 - "07 — Integrasi Data Eksternal (Versi Lengkap, Terverifikasi)"
Cohesion: 0.09
Nodes (22): 07 — Integrasi Data Eksternal (Versi Lengkap, Terverifikasi), 1.1 Endpoint (tanpa API key, gratis, tanpa registrasi), 1.2 Contoh respons nyata (diambil langsung 12 Sep 2026, 04:23 WIB), 1.3 Kode sinkronisasi terkoreksi (menggantikan contoh di dokumen final .docx), 1. BMKG — Gempa Bumi, 2. BMKG — Prakiraan Cuaca Digital (per kelurahan/desa), 3. BMKG — Peringatan Dini Cuaca Ekstrem (Nowcast, standar CAP), 4.1 api.kodewilayah.web.id — PALING PRAKTIS untuk hierarki nama+kode (gratis, tanpa key, tanpa registrasi) (+14 more)

### Community 44 - "11 — Optimasi Performa & Audit Kritis (Agar Sistem Ringan)"
Cohesion: 0.10
Nodes (19): 10. Ringkasan: sistem ini SANGAT BISA ringan, dengan syarat, 11 — Optimasi Performa & Audit Kritis (Agar Sistem Ringan), 1. Basemap — batasi ukuran sejak awal, jangan default, 2. Data spasial dinamis — jangan kirim GeoJSON poligon mentah, 3. Simplifikasi geometri — wajib, bukan opsional, 4.5 Materialized view untuk agregasi berat — gunakan CONCURRENTLY, jangan REFRESH biasa, 4. Backend — hindari N+1 query dan query tanpa index, 5. Caching berlapis — jangan andalkan satu lapisan saja (+11 more)

### Community 45 - "Skema inti"
Cohesion: 0.11
Nodes (18): 02 — Database (PostgreSQL + PostGIS), `audit_log`, Choropleth risiko per kecamatan (agregat untuk render layer fill), Contoh query kunci, `data_dampak_bencana`, Drill-down wilayah (klik peta → data agregat), `gempa_bmkg` — cache data eksternal, `jalan_terputus` — kritikal untuk fitur routing sadar-blokade (+10 more)

### Community 46 - "03 — Backend & API"
Cohesion: 0.12
Nodes (16): 03 — Backend & API, Admin (`/api/admin`), Autentikasi (`/api/auth`), Autentikasi & otorisasi, Bencana (`/api/bencana`), Contoh kontrak response — GeoJSON, Data eksternal (`/api/eksternal`), Error handling standar (+8 more)

### Community 47 - "05 — Peta & GIS Teknis (MapLibre GL JS)"
Cohesion: 0.12
Nodes (15): 05 — Peta & GIS Teknis (MapLibre GL JS), 3D Terrain (untuk simulasi longsor/genangan), Choropleth (fill layer dengan data-driven color), Clustering (native, built-in di GeoJSON source), Heatmap (native MapLibre, tidak perlu library tambahan), Instalasi, Langkah 1 — Ekstrak data OpenStreetMap wilayah Sumbar, Langkah 2 — Build file .pmtiles menggunakan Planetiler (jauh lebih cepat dari tippecanoe untuk area sebesar ini) (+7 more)

### Community 48 - "6.1 Kelompok Fitur INTI (Wajib untuk Demo)"
Cohesion: 0.29
Nodes (7): 6.1.1 Basemap Modern Multi-Mode, 6.1.2 Telusuri Bencana (Drill-Down Wilayah), 6.1.3 Visualisasi Risiko: Choropleth, Heatmap, Clustering, 6.1.4 Evakuasi ala Navigasi Google Maps, 6.1 Kelompok Fitur INTI (Wajib untuk Demo), 6.3 Kelompok Fitur LANJUTAN (Nilai Tambah), 6. Fitur Utama & Spesifikasi Teknis

### Community 49 - "04 — Frontend, Desain & UI/UX (Non-Generik)"
Cohesion: 0.17
Nodes (11): 04 — Frontend, Desain & UI/UX (Non-Generik), Animasi & micro-interaction (secukupnya, bukan berlebihan), Checklist sebelum dianggap "selesai" (anti-AI-slop QA), Design tokens (jangan pakai warna Tailwind default seperti `blue-500` mentah), Ikon — jangan pakai set ikon generik acak, Kenapa file ini ditulis panjang dan tegas, Komponen React — struktur yang disarankan, Layout utama (bukan tiga-kolom simetris generik) (+3 more)

### Community 50 - "00 — Overview Proyek: GIS Kebencanaan Sumbar"
Cohesion: 0.22
Nodes (8): 00 — Overview Proyek: GIS Kebencanaan Sumbar, Apa proyek ini, Keputusan yang tidak bisa diganggu gugat (non-negotiable), Peta keterhubungan dokumen, Prinsip desain teknis (ringkas — detail penuh ada di `01-arsitektur.md`), Referensi ke dokumen lain, Siapa baca file apa, Urutan kerja yang disarankan (tim kecil)

### Community 51 - "01 — Arsitektur Sistem"
Cohesion: 0.22
Nodes (8): 01 — Arsitektur Sistem, Alur permintaan tipikal: "Evakuasi Sekarang", Alur permintaan tipikal: "Telusuri Bencana", Diagram alur data, Kenapa struktur ini (bukan yang lain), Keputusan teknologi & alasannya (ringkas — detail di masing-masing file), Skalabilitas — jalur upgrade di masa depan (tidak perlu dikerjakan sekarang), Struktur direktori proyek yang disarankan

### Community 52 - "06 — Routing Evakuasi (OSRM & Valhalla)"
Cohesion: 0.22
Nodes (8): 06 — Routing Evakuasi (OSRM & Valhalla), Geocoding — pencarian alamat/desa (Photon), Kenapa dua engine, bukan satu, Kontrak API internal: `/api/routing/evakuasi`, Mekanisme exclude jalan terputus (Valhalla), Setup OSRM (tanpa Docker, sesuai keputusan proyek), Setup Valhalla (tanpa Docker), Update graph rutin

### Community 53 - "08 — Keamanan & Deployment (Tanpa Docker)"
Cohesion: 0.22
Nodes (8): 08 — Keamanan & Deployment (Tanpa Docker), Backup & Disaster Recovery, Checklist keamanan wajib, Kenapa tanpa Docker untuk tahap ini, Load testing sebelum demo/go-live, Monitoring & health check, Reverse proxy — Nginx atau Caddy, Struktur service systemd

### Community 54 - "10 — Katalog Data Sumbar (Referensi Cepat, Siap Tempel)"
Cohesion: 0.22
Nodes (8): 10 — Katalog Data Sumbar (Referensi Cepat, Siap Tempel), A. Cakupan wilayah Provinsi Sumatera Barat (untuk bounding box & filter), B. Daftar 19 Kabupaten/Kota + titik koordinat indikatif, C. Endpoint API — tabel ringkas siap panggil, D. 23 Dataset resmi BPBD Sumbar (via CKAN `data.sumbarprov.go.id`), E. Dataset tambahan dari harvest `data.bnpb.go.id` (172 total, contoh yang sudah dikonfirmasi ada isinya), F. Data yang TIDAK tersedia publik — perlu diminta langsung ke BPBD, G. Quick-start: urutan pengambilan data pertama kali (untuk seed database demo)

### Community 55 - "09 — Instruksi untuk AI Coding Agent"
Cohesion: 0.25
Nodes (7): 09 — Instruksi untuk AI Coding Agent, Batasan keras (hard constraints) — jangan dilanggar tanpa konfirmasi eksplisit dari user, Batasan keras tambahan soal performa, Cara kerja yang disarankan (agentic workflow), Definisi "selesai" untuk tiap jenis tugas, Jika ragu, Sebelum menulis kode apa pun

### Community 56 - "etl_ckan_sumbar.py"
Cohesion: 0.52
Nodes (6): etl_korban_per_kabkota(), etl_sirine_tsunami(), fetch_dataset_resources(), ETL Pipeline Satu Data BPBD Sumatera Barat (CKAN API data.sumbarprov.go.id)…, refresh_materialized_views(), run_ckan_pipeline()

### Community 57 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 62 - "test_evakuasi_alur.py"
Cohesion: 0.50
Nodes (8): AsyncClient, asyncio, test_api_bencana_aktif(), test_api_evakuasi_alur_a_tsunami(), test_api_evakuasi_alur_b_fallback_data_kosong(), test_api_evakuasi_alur_b_kecamatan_sama(), test_api_wilayah_cascading(), test_api_zonasi_tsunami_geojson()

### Community 63 - "test_cascading_wilayah.py"
Cohesion: 0.54
Nodes (7): AsyncClient, asyncio, test_evakuasi_with_string_kecamatan_id(), test_get_kecamatan_cascading(), test_get_kota_cascading(), test_get_provinsi(), test_posko_filter_by_id_kecamatan()

### Community 64 - "4. Arsitektur Teknologi"
Cohesion: 0.29
Nodes (7): 4.1 Prinsip Desain, 4.2 Gambaran Arsitektur (5 Lapisan), 4.3 Mengapa Meninggalkan Leaflet Sepenuhnya, 4.4 Basemap: PMTiles (Protomaps) Self-Hosted — Kustomisasi Penuh, 4.5 Routing Evakuasi — Sadar Kondisi Bencana, 4.6 Tabel Ringkasan Teknologi Final, 4. Arsitektur Teknologi

### Community 65 - "App.tsx"
Cohesion: 0.12
Nodes (20): HealthStatus, EvakuasiRouteData, RouteInstructionItem, RouteInstructions(), RouteInstructionsProps, OperatorModal(), OperatorModalProps, UserSession (+12 more)

### Community 66 - "2. Analisis Kondisi Saat Ini & Evaluasi Dokumen Sebelumnya"
Cohesion: 0.33
Nodes (6): 2.1 Kondisi Eksisting Dashboard, 2.2 Kebutuhan dari Pembahasan LPPM UPI YPTK & BPBD, 2.3.1 Dokumen Riset A (disusun bersama Claude), 2.3.2 Dokumen Riset B (disusun bersama ChatGPT), 2.3 Evaluasi Kritis Dua Dokumen Riset Sebelumnya, 2. Analisis Kondisi Saat Ini & Evaluasi Dokumen Sebelumnya

### Community 67 - "5. Sumber Data & Integrasi API"
Cohesion: 0.33
Nodes (6): 5.1 Data Kegempaan & Cuaca — BMKG, 5.2 Peta Risiko & Data Kebencanaan Nasional — BNPB, 5.3 Data Operasional Lokal — BPBD Sumbar & Instansi Provinsi, 5.4 Data Dasar Peta — OpenStreetMap, 5.5 Contoh Implementasi: Sinkronisasi Data BMKG (Backend Worker), 5. Sumber Data & Integrasi API

### Community 68 - "6.2 Kelompok Fitur PENTING"
Cohesion: 0.33
Nodes (6): 6.2.1 Panel Statistik & Grafik per Wilayah, 6.2.2 Notifikasi & Peringatan Dini Real-Time, 6.2.3 Pencarian & Filter Interaktif, 6.2.4 Mode Offline / PWA (Progressive Web App), 6.2.5 3D Terrain untuk Simulasi Dampak, 6.2 Kelompok Fitur PENTING

### Community 69 - "FilterPanel.tsx"
Cohesion: 0.40
Nodes (4): DAFTAR_KOTA_KABUPATEN_SUMBAR, FilterPanel(), FilterPanelProps, KotaKabupatenItem

### Community 70 - "react"
Cohesion: 0.29
Nodes (7): CascadingLocationFilterProps, DEFAULT_PROVINSI, SelectedLocationResult, ComboboxOption, SearchableCombobox(), SearchableComboboxProps, react

### Community 71 - "LayerControlPanel.tsx"
Cohesion: 0.40
Nodes (4): LayerCategory, LayerControlPanel(), LayerControlPanelProps, LayerItem

### Community 72 - "CuacaAlertModal.tsx"
Cohesion: 0.40
Nodes (4): CuacaAlertItem, CuacaAlertModal(), CuacaAlertModalProps, WILAYAH_COORDS

### Community 73 - "10. Roadmap Implementasi"
Cohesion: 0.40
Nodes (5): 10. Roadmap Implementasi, Fase 1 — Fondasi (Bulan 1–2), Fase 2 — Visualisasi Data (Bulan 3–4), Fase 3 — Evakuasi & Data Real-Time (Bulan 5–6), Fase 4 — Pengerasan Produksi & Peluncuran (Bulan 7–8)

### Community 74 - "9. Analisis Biaya & Sumber Daya"
Cohesion: 0.40
Nodes (5): 9.1 Biaya Lisensi, 9.2 Estimasi Biaya Infrastruktur Bulanan, 9.3 Perbandingan dengan Solusi Komersial, 9.4 Kebutuhan Sumber Daya Manusia (Estimasi), 9. Analisis Biaya & Sumber Daya

### Community 75 - "SitrepModal.tsx"
Cohesion: 0.50
Nodes (3): SitrepData, SitrepModal(), SitrepModalProps

### Community 77 - "11. Kesimpulan & Rekomendasi"
Cohesion: 0.50
Nodes (4): 11.1 Kesimpulan, 11.2 Rekomendasi & Prioritas, 11.3 Langkah Selanjutnya, 11. Kesimpulan & Rekomendasi

### Community 78 - "8. Keamanan, Skalabilitas & Ketahanan Sistem"
Cohesion: 0.50
Nodes (4): 8.1 Keamanan, 8.2 Skalabilitas Beban Puncak, 8.3 Ketahanan & Pemulihan Bencana untuk Sistem Itu Sendiri, 8. Keamanan, Skalabilitas & Ketahanan Sistem

### Community 83 - "seed_fase3.py"
Cohesion: 0.67
Nodes (3): hash_password(), Script Seeding Data Fase 3: Posko Evakuasi Realistis & Akun RBAC Awal Sistem…, seed_fase3()

### Community 84 - "chat_disaster_assistant"
Cohesion: 0.36
Nodes (8): chat_disaster_assistant(), ChatRequest, ChatResponse, LocationRecommendation, AsyncSession, BaseModel, post, Endpoint Asisten Virtual Siaga Bencana Sumatera Barat. Menjawab pertanyaan…

### Community 87 - "get_choropleth_tile"
Cohesion: 0.50
Nodes (4): get_choropleth_tile(), AsyncSession, get, Menyajikan Vector Tile (MVT) poligon kabupaten/kecamatan beserta data agregasi…

### Community 88 - "EvakuasiModal.tsx"
Cohesion: 0.25
Nodes (7): ChatMessage, DisasterChatbot(), DisasterChatbotProps, QUICK_PROMPTS, EvakuasiModal(), EvakuasiModalProps, EvakuasiStartParams

## Knowledge Gaps
- **307 isolated node(s):** `type`, `Config`, `$schema`, `plugins`, `react/rules-of-hooks` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 518 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_async_db()` connect `get_async_db` to `Pengguna`, `routers/cascading_wilayah.py`, `kalkulasi_evakuasi_darurat`, `models/__init__.py`, `routers/posko.py`, `eksternal.py`, `auth.py`, `FastAPI`, `chat_disaster_assistant`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `Pengguna` connect `Pengguna` to `auth.py`, `models/__init__.py`, `routers/posko.py`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 20 inferred relationships involving `Pengguna` (e.g. with `get_current_user()` and `get_current_user_optional()`) actually correct?**
  _`Pengguna` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `type`, `Config`, `$schema` to the rest of the system?**
  _307 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Pengguna` be split into smaller, more focused modules?**
  _Cohesion score 0.050616050616050616 - nodes in this community are weakly interconnected._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.047474747474747475 - nodes in this community are weakly interconnected._
- **Should `kalkulasi_evakuasi_darurat` be split into smaller, more focused modules?**
  _Cohesion score 0.08748615725359911 - nodes in this community are weakly interconnected._