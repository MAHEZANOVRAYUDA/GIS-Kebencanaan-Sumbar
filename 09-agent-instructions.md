# 09 — Instruksi untuk AI Coding Agent

> File ini ditujukan langsung untuk AI coding agent (mis. Claude Code, Antigravity, Cursor, atau agent lain) yang akan diberi tugas mengimplementasikan proyek ini. Jika kamu adalah agent yang sedang membaca ini: ikuti urutan dan batasan di bawah dengan disiplin. Jangan melompat ke implementasi sebelum membaca seluruh file `.md` yang relevan dengan tugas yang diberikan.

## Sebelum menulis kode apa pun

1. Baca `00-overview.md` untuk konteks proyek secara keseluruhan.
2. Baca `01-arsitektur.md` untuk memahami bagaimana komponen saling terhubung.
3. Baca file spesifik sesuai tugas yang diberikan (`02` untuk database, `03` untuk backend, `04`+`05` untuk frontend/peta, `06` untuk routing, `07` untuk integrasi eksternal, `08` untuk deployment).
4. Jangan berasumsi endpoint eksternal (BMKG/BNPB) di `07-integrasi-data-eksternal.md` 100% akurat — dokumen tersebut sudah eksplisit menyatakan perlu verifikasi ulang. Jika kamu punya kemampuan browsing/pencarian web, verifikasi dulu sebelum hardcode URL.

## Batasan keras tambahan soal performa

- **Jangan render poligon wilayah administratif sebagai GeoJSON mentah untuk versi yang dianggap "final/production".** Untuk prototipe cepat/demo awal, GeoJSON langsung boleh dipakai (lebih cepat ditulis), tapi beri komentar TODO jelas bahwa ini perlu diganti ke vector tile (`ST_AsMVT`) sebelum dianggap selesai — lihat `11-optimasi-performa.md` untuk pola dan contoh kode keduanya.
- **Jangan generate ulang data yang jarang berubah (choropleth, batas wilayah) pada setiap request API.** Data seperti ini harus di-generate berkala oleh job terjadwal dan disajikan sebagai hasil pre-build, bukan dihitung ulang tiap kali pengguna membuka peta.
- **Jangan pakai konfigurasi default Planetiler/tippecanoe untuk build basemap** tanpa membatasi layer (exclude building/POI) dan bahasa — baca `11-optimasi-performa.md` Bagian 1 untuk command yang benar sebelum menjalankan build basemap.

## Batasan keras (hard constraints) — jangan dilanggar tanpa konfirmasi eksplisit dari user

- **Jangan gunakan Leaflet** dalam bentuk apa pun, termasuk sebagai dependency tidak langsung. Engine peta adalah MapLibre GL JS, titik.
- **Jangan gunakan Docker/docker-compose** untuk setup deployment tahap ini, kecuali user secara eksplisit meminta perubahan arah ini di kemudian hari. Gunakan pendekatan manual/systemd sesuai `08-keamanan-deployment.md`.
- **Jangan pakai tile basemap pihak ketiga langsung tanpa styling kustom** (mis. jangan cuma pasang `https://api.maptiler.com/...` dengan style default) — tujuan proyek secara eksplisit adalah basemap yang bisa dikustomisasi penuh. Kalau untuk keperluan development cepat/prototyping awal terpaksa pakai basemap sementara, beri komentar jelas di kode bahwa ini **sementara** dan harus diganti dengan PMTiles self-hosted sebelum demo final.
- **Jangan hardcode kredensial** (password database, API key, JWT secret) di kode — selalu environment variable, dan selalu buat `.env.example` sebagai template tanpa nilai asli.
- **Jangan buat komponen UI generik/template** — baca `04-frontend-ui-ux.md` sampai selesai sebelum menulis satu baris komponen React. Kalau hasil kerjamu terlihat seperti dashboard admin template Bootstrap/Tailwind generik dengan kartu-kartu biru-ungu gradient, itu salah dan harus diulang.

## Cara kerja yang disarankan (agentic workflow)

1. **Kerjakan satu fase pada satu waktu** (lihat roadmap di dokumen final Bab 10 atau ringkasan di `00-overview.md`), jangan mencoba membangun semua fitur sekaligus dalam satu sesi besar.
2. **Setelah setiap unit kerja selesai** (misal: satu endpoint, satu komponen peta), jalankan/verifikasi secara lokal jika memungkinkan sebelum melanjutkan ke unit berikutnya.
3. **Tulis test dasar** untuk logika bisnis kritis (kalkulasi rute, agregasi data dampak) — tidak perlu coverage 100%, tapi jangan nol.
4. **Jika menemukan ambiguitas** antara dokumen ini dan permintaan langsung dari user dalam sesi kerja, prioritaskan permintaan langsung user saat ini, tapi beri tahu user secara eksplisit bahwa ini berbeda dari yang tertulis di dokumen perencanaan.
5. **Jangan generate data dummy yang terlihat palsu** ("Kecamatan A", "Posko 1", "Lorem Ipsum") untuk keperluan demo — jika perlu data contoh untuk testing, gunakan nama kecamatan/nagari asli Sumatera Barat (lihat data batas wilayah yang akan diimpor sesuai `02-database.md`) agar demo terlihat kredibel di depan BPBD/Diskominfotik.

## Definisi "selesai" untuk tiap jenis tugas

| Jenis Tugas | Kriteria Selesai |
|---|---|
| Endpoint backend baru | Berfungsi sesuai kontrak di `03-backend-api.md`, ada validasi input, ada error handling, response format konsisten (lihat contoh GeoJSON/error) |
| Komponen peta baru | Bekerja dengan basemap kustom (bukan basemap default polos), performa diuji tidak lag dengan data realistis (ratusan-ribuan titik), responsif di ukuran layar mobile |
| Style basemap | Ada minimal 2 varian (terang & gelap), warna jalan/air/vegetasi terlihat sengaja didesain (bukan warna default OSM mentah) |
| Fitur evakuasi | Rute muncul dari lokasi user ke posko terdekat, ada instruksi turn-by-turn, ada uji kasus dengan jalan ditandai terputus untuk pastikan exclude berfungsi |
| Integrasi data eksternal | Ada penanganan error jika API eksternal down/lambat, data disimpan ke database lokal (bukan dipanggil langsung tiap request), ada logging jelas |

## Jika ragu

Tanyakan ke user daripada berasumsi, khususnya untuk:
- Struktur data batas wilayah administratif aktual (apakah sudah tersedia dalam format tertentu atau perlu diunduh dari sumber resmi)
- Kredensial/akses ke server tempat deployment akan dilakukan
- Prioritas fitur mana yang harus didemokan lebih dulu jika waktu terbatas

Jangan berasumsi "yang penting jalan dulu" untuk hal-hal yang berkaitan dengan keamanan (kredensial, validasi input) atau keputusan arsitektur yang sudah eksplisit dikunci di file `00-overview.md` (MapLibre, tanpa Docker, dsb).
