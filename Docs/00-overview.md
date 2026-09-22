# 00 — Overview Proyek: GIS Kebencanaan Sumbar

> Baca file ini dulu, sebelum membuka file lain di folder ini. Ini adalah peta jalan seluruh dokumentasi teknis.

## Apa proyek ini

Modernisasi modul GIS/pemetaan pada dashboard kebencanaan Provinsi Sumatera Barat (referensi: `dashboardbencana.sumbarprov.go.id`), dikerjakan oleh Tim Riset LPPM UPI YPTK Padang. Ini **bukan** proyek membangun ulang seluruh dashboard — fokusnya sempit dan dalam: peta interaktif, visualisasi data dampak bencana, dan fitur evakuasi.

Tujuan akhir tahap ini: **demo/presentasi** ke BPBD Sumbar dan Diskominfotik, bukan langsung produksi di server pemerintah. Karena itu semua keputusan teknis di bawah dioptimalkan untuk *bisa dibangun oleh tim kecil (mahasiswa/dosen LPPM), tanpa Docker, dan menghasilkan hasil yang terlihat sangat profesional saat didemokan*.

## Keputusan yang tidak bisa diganggu gugat (non-negotiable)

Ini hasil evaluasi dua draf riset sebelumnya (satu dengan Claude, satu dengan ChatGPT) yang saling bertentangan di beberapa titik. Keputusan final:

1. **MapLibre GL JS**, bukan Leaflet. Titik. Tidak ada mode hybrid/fallback ke Leaflet.
2. **Basemap kustom self-hosted** (PMTiles/Protomaps), bukan sekadar pakai tile gratis pihak ketiga apa adanya — karena user secara eksplisit minta peta yang **"bagus dan bisa dikustomisasi"**.
3. **Tidak pakai Docker** untuk tahap ini (permintaan eksplisit user). Semua panduan deployment di `08-keamanan-deployment.md` disesuaikan untuk instalasi manual/systemd.
4. **UI/UX tidak boleh terlihat "AI slop"** — generik, template Bootstrap default, tanpa hierarki visual, tanpa personality. Lihat `04-frontend-ui-ux.md` untuk detail apa artinya ini secara konkret.
5. Fitur evakuasi harus terasa **seperti Google Maps** — turn-by-turn, bukan cuma garis rute statis di peta.

## Peta keterhubungan dokumen

```
00-overview.md  (kamu di sini)
   │
   ├── 01-arsitektur.md ────────────┐  Baca ini kedua — gambaran besar sistem
   │                                │
   ├── 02-database.md               │  Skema data — dipakai backend & GIS
   ├── 03-backend-api.md            │  Kontrak API — dipakai frontend
   ├── 04-frontend-ui-ux.md         │  Desain & komponen — hasil akhir yang dilihat user
   ├── 05-peta-gis.md               │  Teknis MapLibre — bagian dari frontend
   ├── 06-routing-evakuasi.md       │  Teknis OSRM/Valhalla — dipakai backend
   ├── 07-integrasi-data-eksternal.md │  BMKG/BNPB — penjelasan & contoh kode
   ├── 08-keamanan-deployment.md    │  Cara menjalankan semuanya di server
   ├── 09-agent-instructions.md ────┘  Kalau pakai AI coding agent, baca ini
   ├── 10-katalog-data-sumbar.md       Referensi cepat: endpoint, koordinat, kode wilayah siap tempel
   └── 11-optimasi-performa.md         WAJIB dibaca sebelum implementasi 05 & 03 — agar sistem ringan
```

## Siapa baca file apa

| Peran | Baca wajib | Baca sebagai referensi |
|---|---|---|
| Backend Developer | `01`, `02`, `03`, `06`, `07`, `10`, `11` | `08` |
| Frontend/GIS Developer | `01`, `04`, `05`, `11`, `03` (kontrak API saja) | `06` |
| UI/UX Designer | `04` | `01`, `05` |
| DevOps/Infra (rangkap) | `08`, `11` | `01` |
| AI coding agent | `09` (lalu ikuti instruksi di sana), `11` | semua |
| Siapa pun yang butuh endpoint/koordinat cepat tanpa baca narasi | `10-katalog-data-sumbar.md` langsung | — |

**Catatan khusus performa**: `11-optimasi-performa.md` berisi koreksi penting atas beberapa contoh kode di `05-peta-gis.md` dan `03-backend-api.md` — dibaca setelah keduanya, sebagai lapisan "cara melakukannya dengan benar agar ringan", bukan dokumen terpisah yang berdiri sendiri.

## Prinsip desain teknis (ringkas — detail penuh ada di `01-arsitektur.md`)

- Open-source 100%, gratis, tanpa API key untuk fungsi inti.
- Modular — tiap layer bisa diganti tanpa merombak semua.
- Offline-resilient — fungsi kritis tetap jalan minim internet (PWA).
- Sadar-konteks-bencana — routing menghindari jalan putus, bukan asumsi jalan selalu normal.

## Urutan kerja yang disarankan (tim kecil)

1. Setup database + import batas wilayah Sumbar (`02-database.md`)
2. Generate basemap PMTiles + style kustom (`05-peta-gis.md`) — ini yang paling "terlihat" saat demo pertama, kerjakan lebih dulu untuk motivasi tim
3. Backend API dasar (`03-backend-api.md`)
4. Frontend render peta + drill-down (`04`, `05`)
5. Routing evakuasi (`06-routing-evakuasi.md`)
6. Integrasi data eksternal (`07-integrasi-data-eksternal.md`)
7. Deployment demo (`08-keamanan-deployment.md`)

## Referensi ke dokumen lain

Dokumen naratif lengkap (untuk presentasi ke BPBD/Diskominfotik) ada di file terpisah: **`Dokumen_Final_GIS_Kebencanaan_Sumbar.docx`**. File-file `.md` di folder ini adalah versi kerja teknis dari dokumen tersebut — lebih rinci di sisi implementasi, lebih ringkas di sisi naratif/justifikasi.
