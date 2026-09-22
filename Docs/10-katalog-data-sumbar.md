# 10 — Katalog Data Sumbar (Referensi Cepat, Siap Tempel)

> File ini adalah **referensi cepat** — kumpulan endpoint, kode, dan koordinat yang sudah diverifikasi bisa langsung dipakai untuk mulai coding, tanpa perlu membaca narasi panjang. Untuk penjelasan dan konteks integrasi, lihat `07-integrasi-data-eksternal.md`. Semua endpoint di sini dites 12 September 2026 kecuali disebutkan lain.

## A. Cakupan wilayah Provinsi Sumatera Barat (untuk bounding box & filter)

```
Jumlah wilayah   : 19 kabupaten/kota (12 kabupaten, 7 kota), 147 kecamatan, 877 kelurahan/desa/nagari
Luas             : ± 42.012,89 km²
Batas geografis  : 0°54' LU – 3°30' LS,  98°36' – 101°53' BT
Bounding box (untuk query/ekstrak data, format lon/lat):
  min_lon = 98.5,  min_lat = -3.6
  max_lon = 101.95, max_lat = 1.0
Kode provinsi (Kemendagri/BPS) : 13
```

Gunakan bounding box ini untuk:
- Parameter `maxBounds` di MapLibre (lihat `05-peta-gis.md`)
- Filter ekstrak OSM (`osmium extract -b 98.5,-3.6,101.95,1.0 ...`)
- Query spasial awal (`ST_MakeEnvelope(98.5, -3.6, 101.95, 1.0, 4326)`)

## B. Daftar 19 Kabupaten/Kota + titik koordinat indikatif

**Peringatan penting**: koordinat di bawah adalah **titik indikatif pusat kota/kabupaten** (untuk keperluan seperti center-map awal, label, atau seed data demo) — **BUKAN** geometri batas administratif resmi. Untuk poligon batas wilayah yang presisi dan resmi, wajib ambil dari BIG (`tanahair.indonesia.go.id`) atau BPS Geoportal sesuai `07-integrasi-data-eksternal.md` Bagian 4. Jangan gunakan titik-titik ini sebagai pengganti data batas wilayah asli.

| Kabupaten/Kota | Ibu Kota / Pusat | Lintang | Bujur |
|---|---|---|---|
| Kota Padang | Padang | -0.9471 | 100.4172 |
| Kota Bukittinggi | Bukittinggi | -0.3056 | 100.3692 |
| Kota Padang Panjang | Padang Panjang | -0.4600 | 100.4000 |
| Kota Payakumbuh | Payakumbuh | -0.2333 | 100.6333 |
| Kota Solok | Solok | -0.7900 | 100.6500 |
| Kota Sawahlunto | Sawahlunto | -0.6833 | 100.7833 |
| Kota Pariaman | Pariaman | -0.6167 | 100.1167 |
| Kab. Agam | Lubuk Basung | -0.3167 | 100.1000 |
| Kab. Tanah Datar | Batusangkar | -0.4500 | 100.5833 |
| Kab. Lima Puluh Kota | Sarilamak | -0.1667 | 100.6667 |
| Kab. Solok | Arosuka | -0.8000 | 100.7000 |
| Kab. Solok Selatan | Padang Aro | -1.4500 | 101.2667 |
| Kab. Sijunjung | Muaro Sijunjung | -0.6833 | 100.9500 |
| Kab. Dharmasraya | Pulau Punjung | -1.0500 | 101.5833 |
| Kab. Padang Pariaman | Parit Malintang | -0.5833 | 100.2000 |
| Kab. Pasaman | Lubuk Sikaping | -0.1167 | 100.0833 |
| Kab. Pasaman Barat | Simpang Ampek | 0.1333 | 99.8833 |
| Kab. Pesisir Selatan | Painan | -1.3667 | 100.5667 |
| Kab. Kepulauan Mentawai | Tuapejat | -1.8833 | 99.6667 |

**Karakteristik risiko regional (konteks umum, bukan data real-time)**: Sumbar dilalui Sesar Sumatra (Sumatran Fault) dan berhadapan langsung dengan zona subduksi di Samudera Hindia — menjadikan gempa dan potensi tsunami sebagai risiko dominan di wilayah pesisir barat (Padang, Pariaman, Pesisir Selatan, Mentawai), sementara wilayah berbukit/pegunungan (Agam, Tanah Datar, Lima Puluh Kota, Solok) lebih rawan longsor dan banjir bandang. Konteks ini berguna untuk prioritas layer default yang ditampilkan pertama kali berdasarkan wilayah yang sedang dilihat pengguna, namun **jangan dijadikan pengganti data InaRISK/BPBD resmi** — ini hanya gambaran umum geografis.

## C. Endpoint API — tabel ringkas siap panggil

| # | Sumber | Endpoint | Auth | Rate Limit |
|---|---|---|---|---|
| 1 | BMKG — gempa terbaru | `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json` | Tidak ada | Tidak didokumentasikan, gunakan wajar (≤ tiap 5 menit) |
| 2 | BMKG — 15 gempa M5+ | `https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json` | Tidak ada | sda |
| 3 | BMKG — gempa dirasakan | `https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json` | Tidak ada | sda |
| 4 | BMKG — prakiraan cuaca per kelurahan | `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode}` | Tidak ada | **60/menit/IP** (resmi) |
| 5 | BMKG — peringatan dini (CAP) | `https://www.bmkg.go.id/alerts/nowcast/id` | Tidak ada | **60/menit/IP** (resmi) |
| 6 | Kode wilayah — provinsi | `https://api.kodewilayah.web.id/provinces` | Tidak ada | Tidak dibatasi ketat |
| 7 | Kode wilayah — kab/kota Sumbar | `https://api.kodewilayah.web.id/regencies/13` | Tidak ada | sda |
| 8 | Kode wilayah — kecamatan | `https://api.kodewilayah.web.id/districts/{kode_kab}` | Tidak ada | sda |
| 9 | Kode wilayah — desa/nagari | `https://api.kodewilayah.web.id/villages/{kode_kec}` | Tidak ada | sda |
| 10 | Batas wilayah kabupaten (GeoJSON) | `https://geoportal.bps.go.id/server/rest/services/wilkerstat/kabupaten/MapServer/0/query?where=1%3D1&outFields=*&f=geojson` | Tidak ada | Tidak didokumentasikan |
| 11 | Batas wilayah presisi tinggi (Shapefile) | `https://tanahair.indonesia.go.id` (perlu login) | **Registrasi gratis** | — |
| 12 | InaRISK dashboard Sumbar | `https://inarisk.bnpb.go.id/dashboard_sumbar/` | Tidak ada (web view) | — |
| 13 | InaRISK tanggap darurat Sumbar | `https://inarisk.bnpb.go.id/tanggapdarurat_sumbar/` | Tidak ada (web view) | — |
| 14 | InaRISK GeoServer | `https://inarisk1.bnpb.go.id:8443/geoserver/ows` | Perlu verifikasi | — |
| 15 | InaRISK ArcGIS REST | `https://inarisk1.bnpb.go.id:6443/arcgis/rest/services` | Perlu verifikasi | — |
| 16 | Satu Data Sumbar (CKAN) | `https://data.sumbarprov.go.id/api/3/action/package_search?fq=organization:badan-penanggulangan-bencana-daerah` | Tidak ada | Standar CKAN, wajar |
| 17 | Satu Data Bencana Indonesia — harvest Sumbar | `https://data.bnpb.go.id/api/3/action/package_search?fq=organization:data-integrasi-provinsi-sumbar&rows=100` | Tidak ada | Standar CKAN, wajar |
| 18 | DIBI (historis time-series) | `https://dibi.bnpb.go.id/` | Web view; API perlu eksplorasi | — |

## D. 23 Dataset resmi BPBD Sumbar (via CKAN `data.sumbarprov.go.id`)

Daftar lengkap, dengan slug dataset untuk akses langsung (`https://data.sumbarprov.go.id/dataset/{slug}`):

```
buku-data-dan-informasi-bencana-tahun-2024
data-kejadian-bencana-dan-dampak-bencana-tahun-2024
indeks-risiko-bencana-sumatera-barat-tahun-2021-2024
nilai-indeks-ketangguhan-daerah-provinsi-sumatera-barat-2024
jumlah-sirine-tsunami-milik-provinsi-sumatera-barat
profil-bencana-sumatera-barat-2014-2024
jumlah-korban-perjenis-bencana-2024
jumlah-korban-per-kabkota-2024
jumlah-kejadian-bencana-perbulan-2024
jumlah-kejadian-bencana-per-kabkota-2024
jumlah-kejadian-bencana-2024
dampak-bencana-terhadap-pemukiman-per-kabkota-2024
dampak-bencana-terhadap-pemukiman-2024
dampak-bencana-terhadap-fasilitas-umum-per-kabkota-2024
dampak-bencana-terhadap-fasilitas-umum-2024
dampak-bencana-terhadap-masyarakat-per-kabupaten-kota          (tahun 2023)
dampak-bencana-terhadap-failitas-umum-tahun-2023
jumlah-gempa-yang-terjadi-sepanjang-tahun-2023
dampak-bencana-terhadap-pemukiman-masyarakat-per-kabupaten-kota-tahun-2023
dampak-bencana-terhadap-pemukiman-masyarakat-tahun-2023
```
(4 dataset sisanya berada di halaman 2 hasil pencarian — cek `https://data.sumbarprov.go.id/dataset/?organization=badan-penanggulangan-bencana-daerah&page=2`)

**Kontak resmi pemilik data**: BPBD Provinsi Sumatera Barat — `bpbd@sumbarprov.go.id`

**Cara mengunduh resource file secara terprogram** (2 langkah, pola umum CKAN):
```python
import httpx

# Langkah 1: dapatkan metadata dataset (termasuk URL resource file asli)
resp = httpx.get("https://data.sumbarprov.go.id/api/3/action/package_show",
                  params={"id": "jumlah-korban-per-kabkota-2024"})
resources = resp.json()["result"]["resources"]
file_url = resources[0]["url"]  # URL unduhan langsung XLSX/CSV/PDF

# Langkah 2: unduh file
file_resp = httpx.get(file_url)
with open("jumlah-korban-per-kabkota-2024.xlsx", "wb") as f:
    f.write(file_resp.content)
```

Setelah diunduh, parsing XLSX dengan `openpyxl`/`pandas` lalu masukkan ke tabel `data_dampak_bencana` (lihat skema di `02-database.md`) melalui script ETL — sesuaikan mapping kolom setelah melihat struktur asli file (struktur kolom tiap dataset BPBD kemungkinan tidak seragam, perlu dicek satu per satu).

## E. Dataset tambahan dari harvest `data.bnpb.go.id` (172 total, contoh yang sudah dikonfirmasi ada isinya)

| Dataset | Slug | Cakupan Riil (sudah diverifikasi) |
|---|---|---|
| Kawasan Rawan Bencana Banjir | `kawasan-rawan-bencana-banjir` | **Kabupaten Lima Puluh Kota saja** (411 titik) — bukan se-provinsi |
| Kawasan Rawan Bencana Longsor | `kawasan-rawan-bencana-longsor` | **Kabupaten Lima Puluh Kota saja** (223 titik) — bukan se-provinsi |
| Kejadian Bencana Kabupaten Agam 2021-2022 | `kejadian-bencana-di-kabupaten-agam-tahun-2021-2022` | Kabupaten Agam saja |
| Kabupaten Agam Dalam Angka 2024 | `kabupaten-agam-dalam-angka-2024` | Kabupaten Agam saja (statistik umum BPS) |
| API Wilayah Administratif Jorong Nagari | `dataset-api-wilayah-administratif-jorong-nagari-bukit-tandang` | Level jorong (di bawah nagari), contoh: Nagari Bukit Tandang |
| API Data Statistik per Nagari (jenis kelamin, umur, kehamilan, dll) | beragam, cari dengan kata kunci "nagari" | Granular per-nagari, tersebar per dataset — perlu API discovery manual |

**Kesimpulan penting**: dataset di `data.bnpb.go.id` untuk Sumbar **kebanyakan berasal dari kabupaten/kota tertentu yang portal open data-nya sudah matang** (terutama Lima Puluh Kota dan Agam), bukan liputan merata 19 kabupaten/kota. Untuk cakupan **provinsi-wide yang konsisten**, dataset di `data.sumbarprov.go.id` (poin D di atas) jauh lebih dapat diandalkan karena memang diterbitkan langsung oleh BPBD Provinsi.

## F. Data yang TIDAK tersedia publik — perlu diminta langsung ke BPBD

Jujur dan eksplisit, ini yang tidak bisa ditemukan sebagai data terbuka:

1. **Koordinat presisi & kapasitas riil posko evakuasi** per kabupaten/kota — kemungkinan besar data internal BPBD Kabupaten/Kota masing-masing (bukan provinsi), belum tentu terdigitalisasi dalam satu database terpadu.
2. **Status jalan real-time** (jalan putus/rusak akibat bencana terkini) — ini memang harus jadi fitur input manual Operator BPBD di sistem Anda sendiri (sesuai rancangan di `02-database.md` tabel `jalan_terputus`), tidak ada sumber API eksternal untuk ini.
3. **Data korban/kerugian real-time** (bukan rekap tahunan) — dataset CKAN yang ditemukan semuanya rekap **tahunan** (2023/2024), bukan live feed kejadian harian. Untuk data real-time, sistem Anda sendiri yang harus jadi sumber pencatatan (Operator BPBD input langsung saat kejadian).
4. **Data curah hujan aktual/observasi** (bukan prakiraan) per titik — BMKG punya untuk stasiun pengamatan tertentu tapi tidak dalam bentuk API publik granular per kelurahan yang ditemukan dalam riset ini; prakiraan cuaca (poin C-4) adalah proksi terdekat yang tersedia publik.

**Rekomendasi langkah nyata**: kirim email resmi ke `bpbd@sumbarprov.go.id` (dan/atau kontak person `dillaulfa24@gmail.com` yang tercatat sebagai maintainer beberapa dataset) memperkenalkan proyek riset LPPM UPI YPTK, dan tanyakan: (a) apakah ada akses data operasional real-time yang bisa diberikan untuk keperluan riset/demo, (b) apakah BPBD punya data koordinat posko evakuasi yang sudah terdigitalisasi, (c) kemungkinan kolaborasi lanjutan untuk integrasi ke `dashboardbencana.sumbarprov.go.id`.

## G. Quick-start: urutan pengambilan data pertama kali (untuk seed database demo)

```bash
# 1. Ambil daftar kabupaten/kota Sumbar (nama + kode)
curl https://api.kodewilayah.web.id/regencies/13

# 2. Ambil batas wilayah kabupaten (GeoJSON) dari BPS
curl "https://geoportal.bps.go.id/server/rest/services/wilkerstat/kabupaten/MapServer/0/query?where=1%3D1&outFields=*&f=geojson" -o batas_kabupaten.geojson

# 3. Ambil gempa terkini BMKG untuk uji integrasi real-time
curl https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json

# 4. Ambil metadata dataset dampak bencana BPBD Sumbar
curl "https://data.sumbarprov.go.id/api/3/action/package_show?id=jumlah-korban-per-kabkota-2024"

# 5. Unduh file XLSX aktual dari URL resource pada hasil langkah 4
# (ambil field resources[0].url dari JSON response, lalu curl -O <url>)
```

Lima langkah ini sudah cukup untuk mengisi database demo dengan **data batas wilayah asli + data dampak bencana resmi + integrasi real-time gempa** — fondasi untuk mulai membangun dan mendemokan fitur telusuri-bencana serta choropleth tanpa menunggu akses khusus apa pun.
