# 11 — Optimasi Performa & Audit Kritis (Agar Sistem Ringan)

> File ini ditulis sebagai jawaban langsung atas pertanyaan "apakah sistem bisa ringan dan tidak berat" — dan sebagai koreksi jujur atas beberapa asumsi yang kurang presisi di file-file sebelumnya. Baca ini **setelah** `01-arsitektur.md` dan **sebelum** mulai implementasi `05-peta-gis.md`, karena beberapa keputusan di sini mengubah cara kode di sana seharusnya ditulis.

## Koreksi atas klaim sebelumnya (transparansi penuh)

Dokumen-dokumen sebelumnya menyatakan MapLibre GL JS "lebih cepat dari Leaflet" secara umum. Setelah verifikasi lebih dalam terhadap riset akademik (perbandingan Leaflet/OpenLayers/Mapbox GL/MapLibre GL, ICC 2025) dan dokumentasi resmi MapLibre sendiri, klaim itu **perlu diperhalus**:

- Untuk **poligon** di bawah ~10.000 fitur (persis kasus choropleth 147 kecamatan Sumbar), Leaflet/OpenLayers justru bisa **sama cepat atau lebih cepat** dari MapLibre GL JS **jika** MapLibre diberi GeoJSON mentah tanpa optimasi.
- MapLibre unggul telak justru pada: (a) basemap vector tile skala besar (jutaan fitur jalan/bangunan), (b) 3D terrain, (c) styling kustom mendalam, (d) titik dalam jumlah sangat besar (puluhan ribu+) dengan clustering aktif.
- **Kesimpulan**: keputusan pindah ke MapLibre tetap benar dan tidak berubah — tapi alasannya adalah **kustomisasi visual & kapabilitas 3D/basemap**, bukan "otomatis lebih cepat untuk semua hal". Untuk performa nyata, **cara data disajikan ke MapLibre yang jauh lebih menentukan** daripada pemilihan library itu sendiri. Sisa dokumen ini menjelaskan caranya.

## Prinsip inti: "apakah pembaca akan sadar datanya basi 5 menit?"

Ini prinsip tunggal paling penting untuk performa seluruh sistem. Untuk setiap jenis data, tanyakan: **kalau datanya telat 5 menit, apakah ada yang sadar/terganggu?**

- **Tidak** (batas wilayah, choropleth kerugian bulanan, heatmap historis) → **generate di muka (pre-build), sajikan sebagai file statis/tile cache.** Tidak ada query database saat pengguna mengakses peta — jauh lebih ringan bagi server maupun browser.
- **Ya** (gempa terbaru, status jalan terputus, posko aktif) → boleh query database langsung, tapi datanya kecil (titik, bukan poligon kompleks), sehingga tetap ringan meski real-time.

Ini mengubah rancangan endpoint di `03-backend-api.md`: `/api/wilayah/choropleth` **seharusnya tidak** menjalankan query PostGIS+agregasi setiap kali dipanggil — seharusnya membaca **file vector tile hasil pre-build**, yang dijadwalkan diperbarui ulang (mis. tiap malam) oleh worker terpisah, sama seperti prinsip sinkronisasi BMKG.

## 1. Basemap — batasi ukuran sejak awal, jangan default

**Masalah**: basemap PMTiles untuk area seluas Sumbar (~42.000 km², mirip luas Belanda) bisa mencapai ratusan MB kalau memakai konfigurasi default Planetiler (semua bangunan, semua POI, semua bahasa) — sebagai patokan, basemap Belanda ukuran serupa mencapai ~683 MB pada konfigurasi penuh zoom 0–15.

**Perbaikan konkret** — batasi sejak command build:

```bash
java -jar planetiler.jar --area=sumbar --download \
  --osm-path=sumbar.osm.pbf \
  --output=sumbar-basemap.pmtiles \
  --exclude-layers=building,poi,housenumber,mountain_peak \
  --languages=id \
  --maxzoom=14
```

- `--exclude-layers=building,poi,housenumber` — dashboard kebencanaan **tidak butuh** footprint tiap bangunan individual atau titik POI seperti minimarket/ATM. Ini pemangkas ukuran terbesar (bangunan & POI biasanya porsi terbesar basemap kota).
- `--languages=id` — jangan simpan label nama tempat dalam puluhan bahasa, cukup Indonesia.
- `--maxzoom=14` (bukan 15) — cukup untuk level jalan kabupaten/kota; zoom 15+ hanya relevan untuk navigasi jalan kaki detail yang bukan fokus utama dashboard ini. Jika nanti fitur evakuasi pejalan kaki butuh lebih detail, naikkan khusus untuk area kota, bukan seluruh provinsi.

**Target realistis**: dengan pemangkasan ini, basemap Sumbar semestinya berada di kisaran **puluhan MB, bukan ratusan MB** — meski angka pasti baru bisa dipastikan setelah build pertama kali (ukuran akhir bergantung kepadatan data OSM riil di Sumbar, yang untuk sebagian wilayah pedesaan mungkin lebih jarang dipetakan dibanding kota Eropa).

**Kenapa ini tidak terlalu mengkhawatirkan meski beberapa puluh MB**: PMTiles memakai HTTP range request — browser **tidak mengunduh seluruh file**, hanya byte yang relevan dengan tile yang sedang dilihat pengguna (biasanya puluhan-ratusan KB per sesi pertama, bertambah saat pan/zoom ke area baru). File besar di server bukan berarti transfer besar ke tiap pengguna.

## 2. Data spasial dinamis — jangan kirim GeoJSON poligon mentah

**Perbaikan atas endpoint choropleth di `03-backend-api.md`**:

```python
# SEBELUM (berat): query + agregasi + serialize GeoJSON tiap request
@app.get("/api/wilayah/choropleth")
async def choropleth(level: str):
    # JOIN + GROUP BY + ST_AsGeoJSON dieksekusi tiap kali dipanggil pengguna
    ...

# SESUDAH (ringan): baca file vector tile hasil pre-build
@app.get("/api/tiles/choropleth/{z}/{x}/{y}.mvt")
async def choropleth_tile(z: int, x: int, y: int):
    # Baca dari file .mvt yang sudah di-generate worker terjadwal,
    # atau dari materialized view + ST_AsMVT dengan cache Redis di depannya
    return FileResponse(f"/data/tiles/choropleth/{z}/{x}/{y}.mvt",
                         media_type="application/x-protobuf")
```

**Job generate ulang berkala** (mirip pola sinkronisasi BMKG di `07-integrasi-data-eksternal.md`):

```python
# Dijalankan tiap malam (cron), bukan tiap request pengguna
async def regenerate_choropleth_tiles():
    query = """
        SELECT w.id, w.nama, ST_AsMVTGeom(w.geom, ST_TileEnvelope(:z, :x, :y)) AS geom,
               COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian
        FROM wilayah_administratif w
        LEFT JOIN data_dampak_bencana d ON d.wilayah_id = w.id
        WHERE w.level = 'kecamatan'
        GROUP BY w.id, w.nama, w.geom
    """
    # generate per Z/X/Y yang relevan (zoom 6-12 cukup untuk choropleth provinsi),
    # simpan sebagai file .mvt statis atau di tabel cache
```

Prinsip sama seperti temuan riset: gunakan `ST_AsMVT`/`ST_AsMVTGeom` (fungsi native PostGIS, sudah dioptimalkan sejak PostGIS 3.0 dengan clipping & simplifikasi otomatis per zoom level), bukan `ST_AsGeoJSON` mentah — MVT jauh lebih ringkas (delta-encoded, terkuantisasi ke grid tile) dibanding GeoJSON teks biasa.

## 3. Simplifikasi geometri — wajib, bukan opsional

Data batas wilayah dari BIG (skala 1:50.000/1:25.000) jauh lebih detail dari yang dibutuhkan untuk ditampilkan saat pengguna melihat peta level provinsi/kabupaten. Poligon kecamatan dengan ribuan vertex akan berat dirender di zoom rendah padahal tidak terlihat detailnya.

```sql
-- Simplifikasi untuk level tampilan zoom rendah (provinsi/kabupaten)
-- Simpan sebagai kolom terpisah, JANGAN timpa data asli
ALTER TABLE wilayah_administratif ADD COLUMN geom_simplified GEOMETRY(MultiPolygon, 4326);

UPDATE wilayah_administratif
SET geom_simplified = ST_SimplifyPreserveTopology(geom, 0.001)  -- toleransi ~100m, sesuaikan
WHERE level IN ('provinsi', 'kabupaten');
```

Gunakan `geom` asli hanya saat zoom tinggi (level kecamatan/nagari terlihat detail), dan `geom_simplified` saat zoom rendah (provinsi/kabupaten terlihat dari jauh) — ini pola "level of detail" standar di semua sistem peta profesional.

## 4. Backend — hindari N+1 query dan query tanpa index

Poin yang belum ditekankan cukup di `02-database.md`: pastikan **setiap** query yang dipakai endpoint publik (terutama `/api/posko/nearest` dan `/api/wilayah/lookup` yang dipanggil sangat sering) benar-benar memakai index GIST yang sudah didefinisikan — verifikasi dengan `EXPLAIN ANALYZE`, jangan asumsi index otomatis terpakai:

```sql
EXPLAIN ANALYZE
SELECT * FROM posko_evakuasi
WHERE status = 'aktif'
ORDER BY lokasi <-> ST_SetSRID(ST_MakePoint(100.35, -0.95), 4326)
LIMIT 3;
-- Pastikan output menunjukkan "Index Scan using idx_posko_lokasi", BUKAN "Seq Scan"
```

Jika muncul `Seq Scan` (artinya index tidak terpakai, biasanya karena tipe data tidak cocok atau operator query salah), ini pertanda performa akan menurun drastis seiring data bertambah — harus diperbaiki sebelum go-live, bukan setelah pengguna mengeluh lambat.

## 4.5 Materialized view untuk agregasi berat — gunakan CONCURRENTLY, jangan REFRESH biasa

Skema lengkap `mv_dampak_per_kecamatan` sudah didefinisikan resmi di `02-database.md` (bagian setelah tabel `audit_log`). Bagian ini menjelaskan **kenapa** cara refresh-nya penting, bukan mengulang skemanya.

**Kenapa `CONCURRENTLY` penting**: `REFRESH MATERIALIZED VIEW` biasa (tanpa `CONCURRENTLY`) mengunci view tersebut dengan `ACCESS EXCLUSIVE` — artinya **semua pembacaan diblokir sampai refresh selesai**. Untuk dashboard publik yang bisa diakses ribuan orang bersamaan saat bencana besar, ini berarti dashboard bisa terlihat "nge-hang"/blank tepat di saat data sedang di-refresh — momen paling buruk untuk itu terjadi.

```sql
-- WAJIB pakai CONCURRENTLY, agar pembaca tetap bisa akses selama refresh berjalan
-- (unique index pada wilayah_id, sudah didefinisikan di 02-database.md, adalah prasyaratnya)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan;
```

Jadwalkan via `pg_cron` atau APScheduler backend setiap 15 menit — materialized view tidak dirancang untuk real-time sedetik-detik (untuk itu gunakan tabel biasa dengan index, seperti `gempa_bmkg`, bukan matview). Kolom `terakhir_refresh` pada view ini ditampilkan di UI sebagai "Data per pukul XX:XX" agar pengguna tahu tingkat kesegaran data, bukan mengira semuanya real-time detik-per-detik.

## 5. Caching berlapis — jangan andalkan satu lapisan saja

| Lapisan | Apa yang di-cache | TTL/Strategi |
|---|---|---|
| Browser (Service Worker/PWA) | Basemap tile yang pernah dilihat, daftar posko, style JSON | Cache-first, invalidasi manual saat basemap di-rebuild |
| CDN/reverse proxy (Nginx/Caddy) | File statis (.pmtiles, .mvt, sprite, font) | Cache lama (hari/minggu) — aset ini jarang berubah |
| Redis (backend) | Hasil query wilayah, daftar posko aktif, hasil choropleth terbaru | TTL menit-jam sesuai kebutuhan kesegaran data |
| Database (materialized view) | Agregasi berat (total kerugian per wilayah per bulan) | Refresh terjadwal (`REFRESH MATERIALIZED VIEW`), bukan dihitung ulang tiap query |

Tanpa Redis pun sistem tetap bisa jalan (untuk skala demo/awal, cache di level file statis + browser saja sudah cukup) — tapi rancang kode agar Redis mudah ditambahkan belakangan tanpa mengubah kontrak API (gunakan pola "cache-aside" di service layer sejak awal, meski implementasi cache-nya masih kosong/no-op di versi awal).

## 6. Ukuran payload API — pangkas properti yang tidak perlu

Kesalahan umum: mengirim seluruh kolom database di response API meski frontend hanya pakai sebagian.

```python
# HINDARI: mengirim semua kolom termasuk yang tidak dipakai peta
return {"id": w.id, "nama": w.nama, "kode_wilayah": w.kode_wilayah,
        "created_at": w.created_at, "updated_at": w.updated_at, "populasi": w.populasi, ...}

# LEBIH BAIK: kirim hanya yang dipakai untuk render + interaksi saat ini
return {"id": w.id, "nama": w.nama, "total_kerugian": agregat.kerugian}
```

Gunakan Pydantic `response_model` dengan skema spesifik per endpoint (bukan skema database mentah) — ini juga best practice keamanan (tidak bocor kolom internal secara tidak sengaja).

## 7. Frontend — batasi apa yang dirender sekaligus

- **Jangan render semua layer sekaligus secara default.** Saat dashboard pertama dibuka, tampilkan basemap + 1-2 layer paling penting (misal titik gempa terbaru). Layer lain (choropleth historis, semua jenis bencana) diaktifkan lewat toggle, bukan otomatis semua menyala — ini juga sejalan dengan prinsip UI/UX di `04-frontend-ui-ux.md` (data density tinggi tapi tidak berantakan).
- **Debounce interaksi peta yang memicu request API** (pan/zoom/klik) — jangan panggil API di setiap event `move`, gunakan `moveend` dan tambahkan debounce ~300ms agar tidak membanjiri backend saat pengguna menggeser peta cepat.
- **Lazy-load komponen berat** (panel grafik ECharts, modul 3D terrain) — muat hanya saat benar-benar dibuka pengguna (code splitting via Vite), bukan di bundle awal yang harus diunduh semua pengguna termasuk yang tidak memakai fitur tersebut.

## 8. Uji performa dengan device & jaringan realistis, bukan laptop developer

Ini poin yang sering terlewat: developer menguji di laptop kencang dengan WiFi kantor, padahal target pengguna sesungguhnya sering mengakses dari **HP kelas menengah-bawah dengan sinyal 3G/4G lemah saat kondisi darurat**.

- Uji dengan **Chrome DevTools → Network throttling → "Slow 4G"** dan **CPU throttling 4x-6x slowdown** — ini mensimulasikan kondisi realistis, bukan kondisi ideal.
- Target yang masuk akal untuk kondisi tersebut: basemap awal tampil < 5 detik (bukan < 2 detik seperti target di kondisi ideal), interaksi (pan/zoom) tetap terasa responsif meski data tambahan masih memuat di background.
- Uji nyata di HP fisik kelas menengah-bawah (bukan hanya emulator), khususnya untuk memvalidasi 3D terrain — fitur ini yang paling berat secara GPU, dan sebaiknya **bisa dimatikan** (toggle "Mode Hemat Daya" yang menonaktifkan 3D terrain + animasi) untuk perangkat yang tidak sanggup.

## 9. Hal lain di luar performa murni — agar proyek ini "layak jadi besar", bukan sekadar demo

Pertanyaan "apakah layak jadi proyek besar" itu lebih luas dari sekadar kecepatan render peta. Beberapa hal struktural yang perlu dipikirkan sejak sekarang meski implementasinya bertahap:

### 9.1 Realita skala tim vs ambisi fitur — jujur soal ini

Dokumen final `.docx` mencantumkan roadmap 4 fase / 8 bulan dengan asumsi peran-peran spesialis (Solution Architect, Backend Dev, Frontend Dev, GIS Analyst, dst). Untuk tim riset LPPM yang kemungkinan besar anggotanya mahasiswa/dosen yang merangkap banyak peran, **realistis untuk memperlambat roadmap atau mempersempit fitur Fase 1**, bukan memaksakan linimasa dengan tim yang lebih kecil dari asumsi. Proyek yang "layak dan besar" bukan berarti harus membangun semua fitur di dokumen sekaligus — justru **Fase 1 yang benar-benar solid (basemap + database + drill-down wilayah) jauh lebih meyakinkan untuk didemokan ke BPBD/Diskominfotik** dibanding banyak fitur setengah jadi.

### 9.2 Versioning skema database sejak hari pertama

Untuk proyek yang berambisi jadi besar, perubahan skema database yang tidak terlacak adalah sumber masalah nomor satu jangka panjang. Gunakan **Alembic** (sudah disebut di `02-database.md`) sejak commit pertama, bukan ditambahkan belakangan setelah skema sudah berubah beberapa kali secara manual — migrasi yang tertata membuat proyek ini bisa diserahterimakan ke tim/mahasiswa baru tanpa kebingungan "skema mana yang benar".

### 9.3 Dokumentasi API otomatis sebagai bagian dari "layak produksi"

FastAPI sudah otomatis menghasilkan dokumentasi OpenAPI di `/docs` — pastikan setiap endpoint diberi docstring dan contoh `response_model` yang jelas (bukan dibiarkan default tanpa deskripsi). Ini kecil tapi sangat menentukan kesan "proyek serius" saat didemokan ke pihak Diskominfotik yang mungkin ingin melihat detail teknis.

### 9.4 Pertimbangkan skema lisensi data terbuka untuk sistem Anda sendiri

Jika sistem ini nantinya dipublikasikan (bahkan sebelum diserahkan ke Diskominfotik), pertimbangkan menerbitkan sebagian data non-sensitif (misal: lokasi posko yang sudah dikonfirmasi publik) sebagai dataset terbuka di `data.sumbarprov.go.id` sendiri — ini menaikkan kredibilitas proyek riset LPPM sebagai kontribusi nyata ke ekosistem data terbuka daerah, bukan hanya alat internal.

### 9.5 Rencana "exit strategy" dari fase riset ke fase adopsi resmi

Karena arah akhir proyek adalah diserahkan/diadopsi Diskominfotik, pikirkan dari awal: **kode dan data harus mudah diserahterimakan** — dokumentasi setup yang bisa diikuti orang yang belum pernah terlibat proyek (bukan hanya paham lewat percakapan tim), README di root proyek yang merangkum cara menjalankan dari nol, dan lisensi kode yang jelas (open-source, misal MIT) sehingga tidak ada ambiguitas kepemilikan saat diserahkan.

## 10. Ringkasan: sistem ini SANGAT BISA ringan, dengan syarat

Jawaban langsung atas pertanyaan Anda: **ya, bisa ringan** — tapi bukan otomatis dari pemilihan teknologi saja. Tiga syarat yang menentukan:

1. **Data statis di-pre-build, data dinamis kecil ukurannya.** Ini yang paling menentukan — jauh lebih berpengaruh daripada pilihan MapLibre vs Leaflet.
2. **Basemap dipangkas sejak awal** (exclude building/POI, batasi zoom, satu bahasa) — jangan pakai konfigurasi default yang ditujukan untuk peta serba-guna dunia.
3. **Diuji dengan kondisi realistis** (jaringan lambat, HP biasa) sebelum diklaim "sudah ringan", bukan hanya diuji di lingkungan development yang serba ideal.

Tanpa ketiga hal ini, sistem **berisiko terasa berat** meski memakai teknologi yang tepat — teknologi yang bagus bisa tetap terasa lambat kalau dipakai dengan pola yang salah (GeoJSON mentah, semua layer menyala sekaligus, tanpa cache).
