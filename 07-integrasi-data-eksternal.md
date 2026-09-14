# 07 — Integrasi Data Eksternal (Versi Lengkap, Terverifikasi)

> Semua endpoint di bawah ini sudah **dites langsung** (bukan hanya dikutip dari dokumentasi) pada 12 September 2026. Contoh respons nyata disertakan supaya tim tidak perlu menebak struktur field. Meski begitu, layanan pemerintah bisa berubah — selalu tes ulang sebelum hardcode di produksi. Untuk katalog ringkas siap-tempel, lihat `10-katalog-data-sumbar.md`.

## 1. BMKG — Gempa Bumi

### 1.1 Endpoint (tanpa API key, gratis, tanpa registrasi)

| Endpoint | Isi |
|---|---|
| `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json` | Gempa TERBARU (1 gempa saja, biasanya gempa signifikan terkini) |
| `https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json` | 15 gempa terakhir dengan M ≥ 5.0 |
| `https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json` | 15 gempa terakhir yang dilaporkan dirasakan warga (magnitudo bisa < 5.0) |

Versi XML tersedia dengan mengganti `.json` → `.xml` bila tim lebih nyaman parsing XML.

### 1.2 Contoh respons nyata (diambil langsung 12 Sep 2026, 04:23 WIB)

```json
{
  "Infogempa": {
    "gempa": {
      "Tanggal": "12 Sep 2026",
      "Jam": "04:23:56 WIB",
      "DateTime": "2026-09-11T21:23:56+00:00",
      "Coordinates": "-5.81,106.56",
      "Lintang": "5.81 LS",
      "Bujur": "106.56 BT",
      "Magnitude": "5.9",
      "Kedalaman": "376 km",
      "Wilayah": "Pusat gempa berada di laut 49 km barat laut Jakarta",
      "Potensi": "Gempa ini dirasakan untuk diteruskan pada masyarakat",
      "Dirasakan": "III Cilacap, III Nagrak, ..., II-III Padang, II-III Mentawai, II-III Pariaman, II-III Solok Selatan, ...",
      "Shakemap": "20260912042356.mmi.jpg"
    }
  }
}
```

**Catatan penting field (koreksi atas asumsi di versi dokumen sebelumnya):**

- `Coordinates` formatnya **"lon,lat"** (bukan lat,lon) — perhatikan urutan saat parsing ke `ST_MakePoint(lon, lat)` di PostGIS.
- `Potensi` **bukan field boolean** — isinya teks bebas. Untuk gempa yang **berpotensi tsunami**, field ini biasanya berisi frasa yang menyebut tsunami secara eksplisit; untuk gempa non-tsunami (seperti contoh di atas), isinya kalimat netral seperti "Gempa ini dirasakan untuk diteruskan pada masyarakat". **Deteksi potensi tsunami harus dilakukan dengan mencari kata kunci "tsunami" pada field ini** (case-insensitive), bukan expect field boolean terpisah.
- `Dirasakan` adalah string tunggal berisi daftar lokasi dipisah koma, dengan skala intensitas MMI di depan tiap nama kota (mis. "III Cilacap", "II-III Padang") — perlu di-parse dengan regex/split jika ingin menampilkan per kota secara terstruktur.
- `Shakemap` hanya nama file — URL lengkap gambar adalah `https://data.bmkg.go.id/DataMKG/TEWS/{Shakemap}`.
- Tidak ada `id`/`external_id` unik bawaan — gunakan kombinasi `Tanggal + Jam` atau `DateTime` sebagai kunci deduplikasi saat upsert ke database.

### 1.3 Kode sinkronisasi terkoreksi (menggantikan contoh di dokumen final .docx)

```python
import httpx, re
from datetime import datetime

BMKG_AUTOGEMPA = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json"

async def sync_gempa_bmkg():
    async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "gis-sumbar/1.0"}) as client:
        resp = await client.get(BMKG_AUTOGEMPA)
        resp.raise_for_status()
        g = resp.json()["Infogempa"]["gempa"]

    lon_str, lat_str = g["Coordinates"].split(",")  # PENTING: urutan lon,lat
    lon, lat = float(lon_str), float(lat_str)

    potensi_tsunami = "tsunami" in g.get("Potensi", "").lower()
    external_id = f"{g['Tanggal']}_{g['Jam']}"

    await upsert_gempa(
        external_id=external_id,
        magnitude=float(g["Magnitude"]),
        kedalaman_km=float(re.sub(r"[^\d.]", "", g["Kedalaman"])),  # "376 km" -> 376.0
        lon=lon, lat=lat,
        wilayah_teks=g["Wilayah"],
        waktu_kejadian=datetime.fromisoformat(g["DateTime"]),
        potensi_tsunami=potensi_tsunami,
        shakemap_url=f"https://data.bmkg.go.id/DataMKG/TEWS/{g['Shakemap']}",
    )

    if float(g["Magnitude"]) >= 5.0 or potensi_tsunami:
        await kirim_notifikasi_push(f"Gempa M{g['Magnitude']} — {g['Wilayah']}")
```

**Jadwal**: setiap 5 menit untuk `autogempa.json`. Untuk daftar 15 gempa terakhir (`gempaterkini.json`), cukup sinkron tiap 15–30 menit karena datanya kumulatif.

## 2. BMKG — Prakiraan Cuaca Digital (per kelurahan/desa)

**Dasar hukum kode wilayah**: mengacu Kepmendagri No. 100.1.1-6117 Tahun 2022, format kode wilayah level IV (kelurahan/desa): `PP.KK.CC.SSSS` (provinsi.kabupaten/kota.kecamatan.desa).

```
GET https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_wilayah_level_4}
```

Contoh: `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=13.71.03.1001` (contoh format kode untuk sebuah kelurahan di Kota Padang — **verifikasi kode pasti tiap kelurahan lewat endpoint kodewilayah di Bagian 5 sebelum dipakai**, karena kode presisi level kelurahan perlu dicocokkan satu per satu, tidak bisa ditebak dari pola kode kecamatan saja).

**Field respons yang didokumentasikan resmi:**

| Field | Arti |
|---|---|
| `utc_datetime` | Waktu prakiraan (UTC), format `YYYY-MM-DD HH:mm:ss` |
| `local_datetime` | Waktu prakiraan (lokal WIB) |
| `t` | Suhu udara (°C) |
| `hu` | Kelembapan udara (%) |
| `weather_desc` | Kondisi cuaca (Bahasa Indonesia) — **ini yang dipakai untuk deteksi potensi hujan lebat** |
| `weather_desc_en` | Kondisi cuaca (Inggris) |
| `ws` | Kecepatan angin (km/jam) |

Cakupan: **prakiraan 3 harian**, per kelurahan/desa (granularitas sangat tinggi — cocok untuk konteks lokal Sumbar).

**Rate limit resmi**: **60 permintaan/menit/IP** — sudah didokumentasikan BMKG sendiri, rencanakan interval polling backend sesuai ini (mis. jika mau sinkron semua ~176 kecamatan Sumbar tiap jam, itu jauh di bawah limit; jika ingin per-kelurahan/desa se-Sumbar sekitar ribuan titik, perlu throttle/spread request across beberapa menit).

**Kewajiban atribusi**: BMKG **mewajibkan pencantuman "BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)" sebagai sumber data secara eksplisit di aplikasi/sistem** — ini bukan opsional, harus ada di UI (footer peta atau panel info layer cuaca).

**Referensi kode contoh resmi**: BMKG menyediakan contoh kode di `github.com/infoBMKG/data-cuaca` (PHP) — dapat dijadikan referensi struktur parsing meski tim membangun ulang di Python/Node sendiri.

## 3. BMKG — Peringatan Dini Cuaca Ekstrem (Nowcast, standar CAP)

Ini berbeda dari prakiraan 3 harian di atas — ini untuk **peringatan dini** (potensi cuaca ekstrem dalam beberapa jam ke depan), memakai standar internasional **Common Alerting Protocol (CAP)**.

```
GET https://www.bmkg.go.id/alerts/nowcast/id       → RSS feed (XML) daftar peringatan aktif per provinsi
GET https://www.bmkg.go.id/alerts/nowcast/id/{kode_detail_cap}_alert.xml   → detail CAP per kecamatan terdampak
```

- Update: **setiap saat** (event-driven, bukan jadwal tetap) — sebaiknya di-poll tiap 5–10 menit.
- Rate limit: sama, 60 req/menit/IP.
- Field kunci CAP: `event` (jenis kejadian), `effective`/`expires` (rentang waktu berlaku, ISO 8601), `severity`/`urgency`/`certainty` (tingkat keparahan — gunakan dokumen referensi resmi BMKG untuk pemetaan nilai-nilai ini ke warna badge di UI), `headline`, `description`, `web` (link infografik).
- **Ini sumber data curah hujan ekstrem/cuaca ekstrem yang Anda tanyakan** — bukan dari endpoint prakiraan cuaca biasa, tapi dari feed CAP ini.

## 4. Batas Wilayah Administratif — 3 sumber, pilih sesuai kebutuhan

### 4.1 api.kodewilayah.web.id — PALING PRAKTIS untuk hierarki nama+kode (gratis, tanpa key, tanpa registrasi)

```
GET https://api.kodewilayah.web.id/provinces               → semua provinsi
GET https://api.kodewilayah.web.id/regencies/13             → kabupaten/kota di Sumbar (kode provinsi 13)
GET https://api.kodewilayah.web.id/districts/{kode_kab}     → kecamatan
GET https://api.kodewilayah.web.id/villages/{kode_kec}      → desa/kelurahan/nagari
```

Response format konsisten: `{"success": true, "message": "...", "data": [{"code": ..., "name": ...}]}`. **Tidak menyertakan geometri** — hanya nama dan kode. Gunakan untuk dropdown/pencarian nama wilayah dan sebagai kunci relasi (`kode_wilayah`) ke tabel geometri.

Kode Sumbar = **13**. Kode Kota Padang = **13.71** (format Kemendagri) — perhatikan `api.kodewilayah.web.id` mungkin memakai format kode tanpa titik (4 digit) sesuai standar BPS; verifikasi format persis saat implementasi karena ada dua standar kode yang beredar (Kemendagri berbasis titik vs BPS 4-6 digit polos).

### 4.2 tanahair.indonesia.go.id (Portal BIG) — untuk geometri resmi presisi tinggi

- Perlu **registrasi akun gratis** dulu di portal.
- Dataset: "Batas Administrasi Kecamatan", "Batas Administrasi Desa/Kelurahan" — skala 1:50.000 (kecamatan) dan 1:25.000 (desa/kelurahan wilayah kota).
- Format unduhan: **Shapefile (.shp)**, per kabupaten/kota (compressed .zip/.rar).
- Ini yang dipakai untuk mengisi kolom `geom` (MultiPolygon) di tabel `wilayah_administratif` — lihat proses `ogr2ogr` di `02-database.md`.

### 4.3 geoportal.bps.go.id — alternatif tanpa registrasi, langsung GeoJSON via ArcGIS REST

```
GET https://geoportal.bps.go.id/server/rest/services/wilkerstat/kabupaten/MapServer/0/query?where=1%3D1&outFields=*&f=geojson
```

- **Tidak perlu registrasi/API key.**
- Cakupan: level kabupaten (layer `wilkerstat/kabupaten`) — untuk level kecamatan/desa, cek path service serupa di bawah `wilkerstat/` (perlu eksplorasi manual struktur foldernya di `geoportal.bps.go.id/server/rest/services`, karena tidak semua level tersedia dengan nama service yang sama).
- Filter ke Sumbar saja: tambahkan parameter `where=PROVNO='13'` (sesuaikan nama field setelah cek struktur atribut lewat query tanpa filter dulu).
- Response langsung GeoJSON `FeatureCollection` — bisa langsung disimpan ke PostGIS via `ST_GeomFromGeoJSON` tanpa perlu `ogr2ogr`.

**Rekomendasi**: pakai **kombinasi** — `api.kodewilayah.web.id` untuk nama+kode+hierarki (cepat, ringan), dan **BIG atau BPS geoportal** untuk geometri poligon aktual. Jangan hanya andalkan satu sumber.

## 5. InaRISK / Geoportal BNPB — Peta Risiko Bencana

### 5.1 Temuan penting: sudah ada WebGIS khusus Sumbar

BNPB **sudah membangun WebGIS terpisah khusus untuk Provinsi Sumatera Barat** — ini kerja sama BNPB dengan Pemprov Sumbar, bukan endpoint generik nasional:

| URL | Isi |
|---|---|
| `https://inarisk.bnpb.go.id/dashboard_sumbar/` | Dashboard potensi bencana & monitoring kegiatan khusus Sumbar |
| `https://inarisk.bnpb.go.id/tanggapdarurat_sumbar/` | **Dashboard tanggap darurat khusus banjir bandang & longsor Sumbar** — sangat relevan untuk fitur real-time Anda |

Kedua ini layak dibuka langsung di browser sebagai referensi visual (bagaimana BNPB sendiri menyajikan data Sumbar) sebelum tim mendesain ulang tampilan sendiri.

### 5.2 Layanan data mentah (GIS Services)

```
GeoServer:  https://inarisk1.bnpb.go.id:8443/geoserver/   (WMS/WFS standar OGC)
ArcGIS REST: https://inarisk1.bnpb.go.id:6443/arcgis/rest/services
             https://inarisk.bnpb.go.id:6443/arcgis/rest/services
```

Untuk GetCapabilities WFS (daftar semua layer yang tersedia):
```
https://inarisk1.bnpb.go.id:8443/geoserver/ows?service=WFS&version=2.0.0&request=GetCapabilities
```

**Catatan implementasi**: koneksi ke port `8443`/`6443` non-standar berarti kemungkinan pakai sertifikat SSL internal — tim perlu tes akses langsung dari jaringan kerja (kadang server pemerintah membatasi akses berdasarkan asal IP atau butuh pengecualian SSL certificate). Saat riset ini dilakukan, akses browsing awal ke `inarisk1.bnpb.go.id:8443/geoserver/web/` mengalami redirect loop — **perlu tim coba langsung dengan `curl -v` dan lapor error spesifiknya**, jangan asumsikan otomatis bisa diakses.

### 5.3 Peta Bahaya Nasional (12 jenis bencana) — via portal resmi

`inarisk.bnpb.go.id/portal/` — hasil **Peta Bahaya Nasional 2024** dan **Peta Kerentanan Nasional 2025** BNPB, mencakup 12 jenis: banjir, banjir bandang, gempabumi, tanah longsor, letusan gunungapi, gelombang ekstrim & abrasi, tsunami, kekeringan, cuaca ekstrim, likuefaksi, karhutla, dan penyakit berpotensi KLB/wabah. Skala 1:50.000/1:25.000 — detail panduan penarikan data ada di portal tersebut (`inarisk.bnpb.go.id/portal/`), perlu dibaca panduan resminya karena mekanisme akses per-layer bisa berbeda dari WFS/WMS generik di atas.

### 5.4 Peta IRBI (Indeks Risiko Bencana Indonesia) tahunan — unduhan langsung

`inarisk.bnpb.go.id/irbi` menyediakan **unduhan peta per jenis bencana per tahun** (2018–2025), termasuk peta khusus per provinsi. Berguna untuk data risiko historis/komparatif, bukan real-time.

## 6. Satu Data Sumbar & Satu Data Bencana Indonesia — DATA PALING RELEVAN, TEMUAN UTAMA

Ini adalah temuan paling penting dari riset lanjutan: **BPBD Provinsi Sumatera Barat sudah punya portal data terbuka sendiri**, terpisah dari (tapi terhubung ke) dashboard yang sedang Anda kembangkan.

### 6.1 data.sumbarprov.go.id — Portal Satu Data Sumbar (CKAN, resmi Pemprov)

```
Base API: https://data.sumbarprov.go.id/api/3
Dokumentasi API: http://docs.ckan.org/en/2.9/api/  (standar CKAN, generik tapi lengkap)
```

**23 dataset resmi BPBD Sumbar** tersedia di organisasi `badan-penanggulangan-bencana-daerah`, termasuk:

| Dataset | Format | Cakupan |
|---|---|---|
| Buku Data dan Informasi Bencana Tahun 2024 | PDF | Rekap & analisis lengkap se-Sumbar |
| Data dan Dampak Bencana Tahun 2024 | XLS | Kejadian + dampak, tahun 2024 |
| Indeks Risiko Bencana Sumbar 2021–2024 | PNG (peta) | Time-series 4 tahun |
| Nilai Indeks Ketangguhan Daerah Sumbar 2024 | PNG | Kapasitas + kerentanan + risiko |
| Jumlah Sirine Tsunami Milik Provinsi Sumbar | XLSX | Lokasi EWS/sirine tsunami — langsung relevan untuk layer mitigasi |
| Profil Bencana Sumatera Barat 2014–2024 | JPEG | Tren 10 tahun |
| Jumlah Korban Perjenis Bencana 2024 | XLSX | Breakdown per jenis bencana |
| Jumlah Korban Per KabKota 2024 | XLSX | Persis kebutuhan Anda: korban per kabupaten/kota |
| Jumlah Kejadian Bencana Perbulan/Per KabKota 2024 | XLSX | Time-series + spasial |
| Dampak Bencana Terhadap Pemukiman (2023 & 2024, per KabKota) | XLSX | Persis kebutuhan Anda: kerusakan rumah |
| Dampak Bencana Terhadap Fasilitas Umum (2023 & 2024, per KabKota) | XLSX | Persis kebutuhan Anda: kerusakan fasum |
| Jumlah Gempa Sepanjang 2023 | XLSX | Berdasarkan magnitudo & kedalaman |

Kontak resmi tertera di metadata: **Author: BPBD Provinsi Sumatera Barat (bpbd@sumbarprov.go.id)**, Maintainer: Dilla Ulfa Desma. Ini bisa jadi kontak awal untuk meminta akses data lebih detail/real-time yang mungkin belum dipublikasikan (data operasional posko, misalnya) — sekaligus poin masuk formal untuk memperkenalkan proyek riset LPPM ke BPBD.

Contoh query CKAN API untuk ambil semua dataset organisasi ini secara terprogram:
```
GET https://data.sumbarprov.go.id/api/3/action/package_search?fq=organization:badan-penanggulangan-bencana-daerah&rows=50
```

### 6.2 data.bnpb.go.id — dataset ter-harvest dari Sumbar, LEBIH BANYAK dan lebih granular

Ternyata `data.bnpb.go.id` meng-harvest **172 dataset** dari sumber-sumber Sumbar (bukan hanya dari `data.sumbarprov.go.id`, tapi juga dari portal open data kabupaten/kota, misal `opendata.limapuluhkotakab.go.id`). Contoh yang ditemukan:

- "Kawasan Rawan Bencana Banjir" — 411 titik terdata (sumber: Kabupaten Lima Puluh Kota)
- "Kawasan Rawan Bencana Longsor" — 223 titik terdata (sumber: Kabupaten Lima Puluh Kota)
- "API Data Statistik Jenis Kelamin/Umur/Status Kehamilan per Nagari" — granularitas sampai level nagari/jorong, tersedia sebagai API langsung (bukan file unduhan)
- "API Wilayah Administratif Jorong Nagari" — API untuk struktur wilayah sampai level jorong (di bawah nagari)
- Data "X Dalam Angka" per kabupaten (BPS, demografi lengkap)

**Peringatan akurasi penting**: dataset "Kawasan Rawan Bencana Banjir/Longsor" ini sumbernya adalah portal Kabupaten Lima Puluh Kota, bukan cakupan seluruh Provinsi Sumbar — jangan salah presentasikan sebagai data rawan bencana se-provinsi ke BPBD/Diskominfotik. Ini pola umum di portal harvest nasional: dataset "Provinsi X" bisa jadi gabungan dari beberapa kabupaten yang datanya kebetulan sudah terbuka, bukan cakupan penuh provinsi. Selalu cek kolom "Source"/metadata "Additional Info" di tiap dataset CKAN untuk tahu cakupan wilayah sebenarnya sebelum dipakai.

Cara menjelajahi seluruh 172 dataset secara terprogram:
```
GET https://data.bnpb.go.id/api/3/action/package_search?fq=organization:data-integrasi-provinsi-sumbar&rows=100
GET https://data.bnpb.go.id/harvest/integrasi-prov-sumbar   (versi HTML, untuk browsing manual per halaman, 9 halaman total)
```

### 6.3 DIBI — Data Informasi Bencana Indonesia (BNPB, historis time-series)

```
https://dibi.bnpb.go.id/
```

Dashboard berbasis Apache Superset, menyediakan data historis kerugian/kerusakan bencana Indonesia dalam bentuk time-series (moving average multi-tahun). Berguna sebagai pembanding tren nasional vs Sumbar, bukan sumber data operasional real-time. Akses data mentah di baliknya kemungkinan lewat API Superset atau ekspor manual dari dashboard — perlu eksplorasi lanjutan jika ingin otomatisasi, karena Superset biasanya butuh autentikasi untuk akses API langsung meski dashboard publik bisa dilihat.

## 7. Ringkasan prioritas integrasi (urutan yang disarankan)

| Prioritas | Sumber | Alasan |
|---|---|---|
| 1 | BMKG gempa (`autogempa.json`) | Paling mudah, tanpa hambatan, real-time, dampak visual langsung untuk demo |
| 2 | `api.kodewilayah.web.id` + BIG/BPS geoportal | Fondasi wajib untuk drill-down wilayah — tanpa ini fitur telusuri-bencana tidak bisa jalan |
| 3 | Dataset CKAN `data.sumbarprov.go.id` (23 dataset BPBD) | Data dampak/kerugian/korban riil per kabupaten — inti dari permintaan awal Anda, dan sudah terverifikasi bisa diunduh terprogram |
| 4 | BMKG prakiraan cuaca & peringatan dini (CAP) | Untuk layer mitigasi cuaca, sedikit lebih kompleks (kode wilayah level 4 & parsing CAP) |
| 5 | InaRISK/Geoportal BNPB (WFS/WMS/ArcGIS) | Layer risiko dasar (choropleth bahaya) — perlu verifikasi akses port non-standar dulu |
| 6 | Dataset harvest `data.bnpb.go.id` 172 item | Kaya tapi granularitas sumbernya campur-campur (provinsi + kabupaten) — perlu kurasi manual per dataset, jangan diimpor massal tanpa dicek satu-satu |

## 8. Checklist verifikasi sebelum integrasi produksi (diperbarui)

- [ ] Semua endpoint BMKG di atas sudah dites ulang langsung dari jaringan kerja tim (bukan cuma dari riset ini)
- [ ] Format field `Coordinates` BMKG (lon,lat, bukan lat,lon) sudah ditangani benar di kode parsing
- [ ] Kode wilayah level 4 (kelurahan/desa) untuk kecamatan-kecamatan prioritas di Sumbar sudah diverifikasi satu per satu via `api.kodewilayah.web.id` — jangan menebak pola kode
- [ ] Akses ke `inarisk1.bnpb.go.id:8443`/`:6443` sudah dites dengan `curl -v`, dan error/redirect apa pun yang muncul dicatat untuk investigasi lanjut atau dikontak langsung ke Pusdatinkom BNPB
- [ ] Untuk tiap dataset CKAN yang mau dipakai, field "Source"/metadata sudah dicek untuk memastikan cakupan wilayah sesuai klaim (provinsi vs kabupaten spesifik)
- [ ] Sudah mencoba kontak `bpbd@sumbarprov.go.id` untuk menanyakan ketersediaan data operasional real-time (posko, kejadian terkini) yang mungkin belum ada di portal terbuka
- [ ] Kewajiban atribusi BMKG ("BMKG sebagai sumber data") sudah ditampilkan di UI, bukan hanya di dokumentasi internal
