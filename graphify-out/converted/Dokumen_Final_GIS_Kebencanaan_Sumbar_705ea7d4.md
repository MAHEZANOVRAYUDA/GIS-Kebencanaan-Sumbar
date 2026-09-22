<!-- converted from Dokumen_Final_GIS_Kebencanaan_Sumbar.docx -->

DOKUMEN PERENCANAAN TEKNIS FINAL
Modernisasi & Pengembangan Sistem GIS Kebencanaan
Provinsi Sumatera Barat
Studi lanjutan atas dashboardbencana.sumbarprov.go.id — fokus modul GIS/Pemetaan



# Daftar Isi
Ringkasan Eksekutif	3
2. Analisis Kondisi Saat Ini & Evaluasi Dokumen Sebelumnya	4
3. Tujuan & Sasaran Pengembangan	5
4. Arsitektur Teknologi	6
5. Sumber Data & Integrasi API	9
6. Fitur Utama & Spesifikasi Teknis	11
7. Pengguna & Hak Akses (RBAC)	13
8. Keamanan, Skalabilitas & Ketahanan Sistem	14
9. Analisis Biaya & Sumber Daya	15
10. Roadmap Implementasi	16
11. Kesimpulan & Rekomendasi	18
12. Paket Dokumentasi Teknis Pendamping	19
Catatan: penomoran halaman di atas bersifat indikatif mengikuti struktur bab; nomor aktual dapat bergeser 1–2 halaman tergantung ukuran layar/font saat dicetak.

# 1. Ringkasan Eksekutif
Dashboard kebencanaan Provinsi Sumatera Barat (dashboardbencana.sumbarprov.go.id) saat ini masih menggunakan Leaflet.js sebagai mesin peta, dengan basemap raster OpenStreetMap standar, tanpa fitur routing evakuasi, dan tanpa integrasi data real-time yang terstruktur. Dokumen ini merumuskan rencana modernisasi menyeluruh khusus pada modul GIS/pemetaan, tanpa mengubah arsitektur sistem existing secara keseluruhan.
Setelah meninjau dua draf riset sebelumnya (satu hasil kolaborasi dengan Claude yang sudah cukup matang secara teknis, satu lagi hasil riset ChatGPT yang masih merekomendasikan Leaflet sebagai pilihan utama), dokumen ini mengambil satu sikap teknis yang tegas dan final:

Lima pilar utama pengembangan:
- Engine peta modern: MapLibre GL JS + PMTiles self-hosted, dengan style kustom bergaya modern (mendekati kualitas visual Google Maps), mode terang/gelap, 3D terrain untuk simulasi longsor & genangan.
- Visualisasi data kebencanaan informatif: choropleth kerugian/kerusakan per kecamatan, heatmap densitas kejadian, clustering titik bencana, dan fitur "telusuri bencana" (klik wilayah → data lengkap kerugian, korban, kerusakan bangunan).
- Evakuasi cerdas ala navigasi Google Maps: routing turn-by-turn ke posko terdekat menggunakan OSRM/Valhalla self-hosted, dengan kemampuan menghindari jalan yang dilaporkan putus/rusak akibat bencana — bukan sekadar rute jarak terpendek statis.
- Integrasi data real-time & mitigasi: BMKG (gempa, peringatan dini cuaca), InaRISK/Geoportal BNPB (peta rawan bencana), Satu Data Bencana Indonesia, dengan notifikasi push untuk kejadian signifikan.
- Andal saat krisis: PWA dengan dukungan offline/cache, arsitektur yang tahan lonjakan trafik saat bencana besar (justru saat sistem paling dibutuhkan), dan rencana pemulihan bencana untuk sistem itu sendiri.

Seluruh teknologi yang direkomendasikan bersifat open-source dan gratis untuk digunakan tanpa batas — cocok untuk instansi pemerintah tanpa anggaran lisensi tahunan. Estimasi biaya operasional bulanan (VPS + storage) berkisar Rp 1,5 – 2,5 juta, jauh di bawah solusi komersial (Google Maps Platform / Mapbox / ArcGIS Online) yang dapat mencapai puluhan hingga ratusan juta rupiah per tahun.
# 2. Analisis Kondisi Saat Ini & Evaluasi Dokumen Sebelumnya
## 2.1 Kondisi Eksisting Dashboard
Dashboard Satu Data Bencana Sumbar merupakan hasil kolaborasi BNPB (program SIAP SIAGA), BPBD Sumbar, dan Diskominfotik Sumbar, dirilis akhir 2025 sebagai pusat informasi terintegrasi kebencanaan provinsi. Berdasarkan kajian terhadap kondisi saat ini, teridentifikasi sejumlah keterbatasan pada modul GIS/pemetaan:

## 2.2 Kebutuhan dari Pembahasan LPPM UPI YPTK & BPBD
Enam kebutuhan utama yang menjadi acuan pengembangan, dikonfirmasi dari hasil pertemuan sebelumnya:
- Tempat aman saat terjadi bencana — visualisasi lokasi aman dan titik kumpul
- Jarak posko terdekat melalui GIS — fitur pencarian dan routing ke posko
- Data kerugian, dampak kerusakan, dan bangunan per kecamatan — agregasi data spasial
- Fitur telusuri bencana — klik peta → batas wilayah → data kerugian, korban jiwa, penduduk
- Fitur evakuasi — lokasi posko evakuasi dan rute terdekat
- Peta yang interaktif dan informatif — tampilan setara Google Maps

## 2.3 Evaluasi Kritis Dua Dokumen Riset Sebelumnya
Sebagai bagian dari transparansi metodologis, berikut evaluasi objektif terhadap dua dokumen riset yang telah disusun sebelumnya (dengan bantuan Claude dan ChatGPT), yang menjadi dasar penyusunan dokumen final ini.
### 2.3.1 Dokumen Riset A (disusun bersama Claude)
Dokumen ini secara teknis lebih matang dan menjadi fondasi utama dokumen final ini. Kekuatannya:
- Sudah tepat merekomendasikan migrasi dari Leaflet ke MapLibre GL JS dengan alasan performa WebGL yang benar secara teknis.
- Struktur arsitektur berlapis (frontend, tile provider, backend, database spasial, integrasi data) sudah logis dan lengkap.
- Menyertakan contoh kode konkret (integrasi BMKG API, query PostGIS, routing OSRM) — bukan sekadar wacana.
Kekurangan yang diperbaiki di dokumen ini:
- Rekomendasi tile provider masih condong ke OpenFreeMap sebagai andalan utama — padahal untuk kontrol visual penuh dan independensi jangka panjang, self-hosted PMTiles (Protomaps) adalah pilihan yang lebih superior dan sudah matang secara industri per 2026.
- Belum membahas strategi PWA/offline, ketahanan routing saat jalan terputus akibat bencana, dan disaster-recovery untuk sistem itu sendiri.
- Detail integrasi Satu Data Bencana Indonesia dan Geoportal BNPB masih perlu diperjelas dengan alamat endpoint aktual.
### 2.3.2 Dokumen Riset B (disusun bersama ChatGPT)
Dokumen ini memiliki nilai pada sisi kelengkapan checklist UI/UX dan roadmap tahapan, namun dari sisi keputusan teknis kunci, dokumen ini tidak selaras dengan arah yang diinginkan:
- Rekomendasi engine peta bertentangan dengan permintaan proyek: dokumen ini menempatkan Leaflet sebagai pilihan utama dan MapLibre hanya sebagai "alternatif modern" opsional — arah ini tidak diadopsi.
- Beberapa klaim disertai kutipan bergaya riset otomatis yang tidak dapat diverifikasi sumbernya secara langsung (format sitasi non-standar), sehingga beberapa data (mis. angka korban spesifik) sebaiknya diperlakukan sebagai contoh ilustratif, bukan data resmi definitif, dan perlu diverifikasi ulang langsung ke Pusdalops BPBD Sumbar sebelum dipakai dalam presentasi resmi.
- Tidak menyertakan contoh implementasi teknis (kode, skema data, endpoint API) — levelnya masih strategi umum, belum actionable untuk tim developer.
- Poin positif yang tetap diadopsi ke dokumen final: penekanan pada mode gelap/terang, dukungan offline/cache untuk petugas lapangan, filter interaktif berdasarkan jenis bencana, dan keamanan (SSL/TLS + autentikasi).

# 3. Tujuan & Sasaran Pengembangan
## 3.1 Tujuan Umum
Meningkatkan kualitas dan kapabilitas modul GIS pada dashboard kebencanaan Sumatera Barat agar menyajikan informasi spasial yang informatif, modern, cepat, dan mudah dipahami oleh masyarakat umum, BPBD, dan pemangku kepentingan lainnya — setara secara pengalaman pengguna dengan aplikasi peta kelas dunia seperti Google Maps, namun sepenuhnya open-source dan dapat dikustomisasi bebas.
## 3.2 Sasaran Spesifik & Indikator Keberhasilan
# 4. Arsitektur Teknologi
## 4.1 Prinsip Desain
- Open-source first — seluruh komponen inti berlisensi open-source permisif (MIT/BSD/Apache-2.0)
- Independensi penuh — tidak bergantung pada API key/kuota pihak ketiga untuk fungsi inti (peta, routing, geocoding dapat 100% self-hosted)
- Biaya minimal — tanpa biaya lisensi per-tile, per-request, atau per-seat
- Siap produksi — arsitektur yang dapat diskalakan horizontal dan diandalkan saat beban puncak
- Modular — setiap komponen dapat diganti tanpa mengganggu keseluruhan sistem
- Standar terbuka — mendukung GeoJSON, PMTiles, Mapbox Vector Tile (MVT), dan REST API
- Offline-resilient — fungsi kritis (lihat peta, cari posko) tetap berjalan tanpa koneksi internet stabil
## 4.2 Gambaran Arsitektur (5 Lapisan)

Alur data: Frontend (MapLibre) memanggil Backend API → Backend melakukan query spasial ke PostGIS dan/atau meneruskan permintaan routing ke OSRM/Valhalla → data eksternal (BMKG, BNPB) ditarik secara terjadwal oleh worker backend dan disimpan ke database lokal agar dashboard tidak bergantung langsung pada ketersediaan API pihak ketiga saat diakses pengguna.
## 4.3 Mengapa Meninggalkan Leaflet Sepenuhnya

## 4.4 Basemap: PMTiles (Protomaps) Self-Hosted — Kustomisasi Penuh
Ini adalah jawaban langsung atas permintaan "peta yang bagus dan bisa dikustomisasi". Alih-alih bergantung pada tile provider gratis pihak ketiga yang membatasi kuota atau kontrol visual (OpenFreeMap, MapTiler free tier), pendekatan yang direkomendasikan adalah:
- Unduh ekstrak data OpenStreetMap wilayah Sumatera Barat (dapat diperkecil hanya area provinsi, ukuran file jauh lebih kecil dari basemap dunia).
- Generate file .pmtiles menggunakan tool open-source (Planetiler atau tippecanoe) — satu file statis berisi seluruh data vector tile.
- Hosting file .pmtiles di object storage (mis. MinIO self-hosted atau storage kompatibel S3) — tidak perlu tile server yang selalu menyala, cukup file statis yang diakses via HTTP range request.
- Desain style JSON kustom (mengikuti MapLibre Style Specification) dengan skema warna, tipografi, dan ikon khas identitas Sumbar/BPBD — dapat meniru estetika modern Google Maps sepenuhnya (jalan raya ditonjolkan gradual sesuai zoom, label kota proporsional, warna air/hutan/pemukiman yang enak dipandang).
- Sediakan 2–3 varian style: Terang (siang hari), Gelap (malam/kondisi darurat, mengurangi silau di lapangan), dan Satelit/Hybrid (menggunakan citra dari sumber terbuka seperti Sentinel-2/ESA untuk konteks medan).
## 4.5 Routing Evakuasi — Sadar Kondisi Bencana
Fitur evakuasi "seperti Google Maps" yang diminta perlu lebih dari sekadar rute jarak terpendek statis. Rekomendasi:

## 4.6 Tabel Ringkasan Teknologi Final
# 5. Sumber Data & Integrasi API
Bagian ini memetakan seluruh sumber data eksternal yang relevan untuk kebutuhan kebencanaan, mitigasi, dan evakuasi, beserta metode integrasinya. Alamat endpoint bersifat indikatif berdasarkan dokumentasi publik masing-masing instansi per September 2026 — tim implementasi wajib memverifikasi ulang endpoint aktif dan syarat akses (API key, rate limit) sebelum integrasi produksi, karena layanan pemerintah dapat berubah tanpa pemberitahuan formal.
## 5.1 Data Kegempaan & Cuaca — BMKG

Catatan teknis: Backend melakukan polling terjadwal (bukan client-side langsung) agar tidak terkena rate limit saat banyak pengguna mengakses dashboard bersamaan, dan agar data tetap tersedia meskipun API BMKG sedang lambat/down — backend menyimpan cache data terakhir di database lokal.
## 5.2 Peta Risiko & Data Kebencanaan Nasional — BNPB
## 5.3 Data Operasional Lokal — BPBD Sumbar & Instansi Provinsi
## 5.4 Data Dasar Peta — OpenStreetMap
Jaringan jalan, bangunan, sungai, dan penggunaan lahan menggunakan data OpenStreetMap sebagai fondasi basemap dan graf routing. Data ini diperbarui secara berkala (disarankan bulanan) melalui proses ekstrak-ulang region Sumatera Barat dan build ulang file PMTiles serta graf OSRM/Valhalla.
## 5.5 Contoh Implementasi: Sinkronisasi Data BMKG (Backend Worker)
Berikut contoh pendekatan backend (Python, FastAPI + APScheduler) untuk menarik data gempa BMKG secara terjadwal dan menyimpannya ke PostGIS, sehingga frontend selalu membaca dari database lokal — bukan langsung memanggil API pihak ketiga. Struktur field di bawah sudah diverifikasi terhadap respons nyata BMKG (bukan asumsi), termasuk detail bahwa field koordinat berformat "lon,lat" dan field potensi tsunami berupa teks bebas, bukan boolean — detail lengkap dan contoh respons JSON asli ada di file teknis 07-integrasi-data-eksternal.md.
# 6. Fitur Utama & Spesifikasi Teknis
Fitur dikelompokkan berdasarkan prioritas: Inti (harus ada untuk demo pertama), Penting (melengkapi pengalaman pengguna profesional), dan Lanjutan (nilai tambah kompetitif).
## 6.1 Kelompok Fitur INTI (Wajib untuk Demo)
### 6.1.1 Basemap Modern Multi-Mode
### 6.1.2 Telusuri Bencana (Drill-Down Wilayah)
### 6.1.3 Visualisasi Risiko: Choropleth, Heatmap, Clustering
### 6.1.4 Evakuasi ala Navigasi Google Maps
## 6.2 Kelompok Fitur PENTING
### 6.2.1 Panel Statistik & Grafik per Wilayah
Panel samping menampilkan grafik batang (kerugian per kecamatan), pie chart (proporsi jenis bencana), dan tabel data rinci menggunakan Apache ECharts, terhubung langsung dengan hasil drill-down wilayah.
### 6.2.2 Notifikasi & Peringatan Dini Real-Time
Alert popup dan badge notifikasi untuk gempa M ≥ 5.0, potensi tsunami, dan peringatan cuaca ekstrem BMKG untuk wilayah yang sedang dilihat pengguna. Untuk pengguna yang mengizinkan, dapat diperluas menjadi Web Push Notification (bekerja meski tab browser tertutup, didukung penuh oleh arsitektur PWA).
### 6.2.3 Pencarian & Filter Interaktif
- Pencarian alamat/desa/kecamatan (geocoding via Photon) untuk cepat mengarahkan peta.
- Filter berdasarkan jenis bencana (gempa, banjir, longsor, tsunami, erupsi), rentang tanggal kejadian, dan wilayah administratif.
- Hasil filter memperbarui seluruh layer peta dan panel statistik secara sinkron (satu sumber kebenaran/state).
### 6.2.4 Mode Offline / PWA (Progressive Web App)
Ini adalah fitur yang tidak dibahas mendalam pada kedua draf sebelumnya, padahal krusial untuk konteks kebencanaan: internet sering terputus justru saat paling dibutuhkan.
- Service Worker (Workbox) meng-cache basemap tile area yang pernah dilihat, data posko evakuasi, dan nomor kontak darurat.
- Dashboard dapat di-"install" ke home screen ponsel (Add to Home Screen) layaknya aplikasi native, tanpa perlu app store.
- Indikator jelas "Mode Offline — data terakhir diperbarui pukul XX:XX" agar pengguna tahu data mungkin tidak real-time.
### 6.2.5 3D Terrain untuk Simulasi Dampak
Visualisasi elevasi 3D (native MapLibre terrain) untuk membantu memahami arah aliran material longsor dan potensi jalur genangan banjir/tsunami secara lebih intuitif dibanding peta 2D datar — relevan khusus untuk topografi berbukit Sumatera Barat.
## 6.3 Kelompok Fitur LANJUTAN (Nilai Tambah)
- Pelaporan masyarakat (crowdsourced reporting): form sederhana bagi warga untuk melaporkan kejadian/kondisi jalan, dengan moderasi Operator BPBD sebelum tayang publik — mengurangi risiko informasi tidak terverifikasi.
- Simulasi skenario bencana: estimasi wilayah terdampak berdasarkan parameter (mis. magnitudo gempa, tinggi genangan) untuk keperluan perencanaan mitigasi — fitur riset lanjutan, bukan prioritas rilis awal.
- Ekspor data & laporan: unduh data dalam format CSV/GeoJSON/PDF untuk analisis lanjutan oleh pemangku kepentingan.
- Dashboard analitik untuk pimpinan: ringkasan tren multi-tahun, perbandingan antar-wilayah, proyeksi kebutuhan anggaran mitigasi.
# 7. Pengguna & Hak Akses (RBAC)
Sistem menerapkan Role-Based Access Control dengan empat peran utama, konsisten dengan kebutuhan yang dikonfirmasi sebelumnya.

## Matriks Hak Akses
# 8. Keamanan, Skalabilitas & Ketahanan Sistem
Bagian ini menjawab aspek yang luput dibahas mendalam pada kedua draf sebelumnya, padahal krusial: sistem kebencanaan justru mengalami beban tertinggi tepat saat kondisi paling kritis, dan harus tetap dipercaya (trustworthy) sebagai sumber informasi resmi.
## 8.1 Keamanan
- HTTPS/TLS wajib di seluruh endpoint, termasuk untuk tile server internal — tanpa pengecualian.
- Autentikasi berbasis JWT dengan access token berumur pendek + refresh token, khusus untuk peran Operator/Admin/Pimpinan.
- Rate limiting per-IP dan per-API-key pada seluruh endpoint publik untuk mencegah abuse dan memastikan ketersediaan layanan saat lonjakan trafik.
- Validasi input ketat pada seluruh form input data (Operator BPBD) untuk mencegah injection dan data kotor masuk ke database spasial.
- Audit log untuk setiap perubahan data kejadian/korban/kerugian oleh Operator dan Admin — penting untuk akuntabilitas data resmi pemerintah.
- Secrets (kredensial database, API key eksternal) disimpan di environment variable / secret manager, tidak pernah di-commit ke repository kode.
## 8.2 Skalabilitas Beban Puncak
Berbeda dari aplikasi web pada umumnya, trafik pada dashboard kebencanaan dapat melonjak drastis (5–20x normal) dalam hitungan menit saat terjadi bencana besar — justru saat sistem paling harus tetap hidup.
- Caching agresif di sisi backend (Redis) untuk data yang jarang berubah (basemap tile, batas wilayah administratif, daftar posko).
- CDN di depan aset statis (basemap PMTiles, sprite, font) agar beban tidak seluruhnya jatuh ke server aplikasi.
- Desain backend stateless agar dapat discale horizontal (menambah instance) dengan cepat saat load meningkat.
- Load testing berkala (mis. menggunakan k6 atau Locust, keduanya open-source) mensimulasikan skenario "bencana besar" sebelum go-live.
- Graceful degradation: jika backend kelebihan beban, frontend tetap dapat menampilkan basemap + data ter-cache terakhir (bukan error total).
## 8.3 Ketahanan & Pemulihan Bencana untuk Sistem Itu Sendiri
Ironis bila sistem kebencanaan sendiri tidak punya rencana pemulihan bencana. Rekomendasi minimal:
- Backup otomatis PostgreSQL/PostGIS harian, disimpan di lokasi terpisah dari server utama.
- Dokumentasi runbook pemulihan (langkah restore database, langkah rebuild tile/routing graph) agar tidak bergantung pada satu orang yang hafal proses manual.
- Monitoring uptime dan health check otomatis (mis. Uptime Kuma, open-source) dengan notifikasi ke tim jika layanan down.
- Kebijakan retensi data historis yang jelas di database (bukan hanya rotasi file log) agar ukuran database tetap terkelola dalam jangka panjang.

# 9. Analisis Biaya & Sumber Daya
## 9.1 Biaya Lisensi
Seluruh komponen inti bersifat open-source dan gratis digunakan tanpa batas, termasuk untuk keperluan instansi pemerintah.
Total Biaya Lisensi: Rp 0
## 9.2 Estimasi Biaya Infrastruktur Bulanan
Total Estimasi: Rp 1.500.000 – 2.350.000 per bulan
Catatan: bila sistem akhirnya di-hosting di infrastruktur milik Diskominfotik/Pemprov Sumbar (sesuai arah proyek saat ini), biaya VPS di atas dapat sepenuhnya dieliminasi — sisa biaya hanya domain/SSL bila belum tersedia.
## 9.3 Perbandingan dengan Solusi Komersial

Catatan: angka biaya solusi komersial di atas bersifat indikatif berdasarkan struktur harga umum per model pay-as-you-go masing-masing vendor, dan sangat bergantung pada volume trafik aktual. Sebaiknya disampaikan sebagai perkiraan kasar (bukan kutipan resmi price list vendor) saat presentasi.
## 9.4 Kebutuhan Sumber Daya Manusia (Estimasi)
Catatan: mengingat proyek ini berjalan dalam skema riset LPPM, peran-peran di atas dapat dirangkap oleh anggota tim mahasiswa/dosen sesuai kapasitas, dengan pembagian tugas rinci per bidang tersedia di paket file .md terpisah (lihat Bab 11).
# 10. Roadmap Implementasi
Roadmap difokuskan pada modul GIS saja sesuai arahan proyek saat ini, dengan pendekatan bertahap agar setiap fase menghasilkan output yang dapat didemokan.
## Fase 1 — Fondasi (Bulan 1–2)
## Fase 2 — Visualisasi Data (Bulan 3–4)
## Fase 3 — Evakuasi & Data Real-Time (Bulan 5–6)
## Fase 4 — Pengerasan Produksi & Peluncuran (Bulan 7–8)
# 11. Kesimpulan & Rekomendasi
## 11.1 Kesimpulan
- Leaflet.js resmi ditinggalkan. MapLibre GL JS (WebGL) adalah satu-satunya engine peta yang direkomendasikan — matang secara industri, gratis, dan mampu memberikan kualitas visual serta performa setara Google Maps.
- Kustomisasi peta penuh dicapai melalui basemap PMTiles self-hosted dengan style JSON kustom — bukan bergantung pada tile provider gratis pihak ketiga yang membatasi kontrol visual maupun kuota.
- Fitur evakuasi "seperti Google Maps" dapat diwujudkan dengan OSRM/Valhalla, dilengkapi mekanisme sadar-blokade agar rute yang dihasilkan realistis dengan kondisi pasca-bencana, bukan sekadar rute jarak terpendek statis.
- PostgreSQL + PostGIS menyediakan fondasi query spasial berjenjang yang kuat untuk kebutuhan drill-down wilayah dan agregasi data dampak bencana.
- Integrasi data BMKG, Geoportal BNPB, dan Satu Data Bencana Indonesia dapat dilakukan melalui API/REST resmi yang tersedia gratis, dengan pendekatan sinkronisasi terjadwal di sisi backend agar dashboard tetap tangguh meski API eksternal lambat/tidak tersedia.
- Aspek yang sebelumnya luput — PWA/offline-first, ketahanan beban puncak, dan rencana pemulihan bencana untuk sistem itu sendiri — kini menjadi bagian eksplisit dari arsitektur, mengingat sistem ini justru paling dibutuhkan saat kondisi paling kritis.
- Total biaya operasional dapat ditekan hingga mendekati Rp 0 (bila hosting memanfaatkan infrastruktur Diskominfotik/Pemprov Sumbar) hingga maksimal ±Rp 2,35 juta/bulan (bila menggunakan VPS independen) — jauh lebih hemat dibanding solusi komersial.
## 11.2 Rekomendasi & Prioritas
## 11.3 Langkah Selanjutnya
- Presentasi/demo dokumen dan (bila memungkinkan) prototipe awal kepada LPPM UPI YPTK, BPBD Sumbar, dan Diskominfotik Sumbar.
- Pembentukan tim implementasi internal (mahasiswa/dosen LPPM), dengan pembagian tugas mengikuti struktur file panduan teknis terpisah (lihat Bab 12).
- Mulai Fase 1 (fondasi basemap & database spasial) sebagai bukti konsep yang dapat didemokan cepat.
- Koordinasi lebih lanjut dengan Diskominfotik untuk kemungkinan akses/kolaborasi teknis ke backend dashboard existing, setelah modul GIS terbukti matang.
- Evaluasi berkala setiap akhir fase, dengan demo incremental ke pemangku kepentingan.
# 12. Paket Dokumentasi Teknis Pendamping
Untuk mendukung eksekusi langsung oleh tim (termasuk penggunaan AI coding agent), dokumen ini dilengkapi dengan satu set file Markdown (.md) terpisah per bidang tugas, dirancang agar setiap anggota tim atau agent dapat bekerja fokus pada area tanggung jawabnya tanpa kehilangan konteks keseluruhan proyek.

| Atribut | Keterangan |
| --- | --- |
| Disusun oleh | Tim Riset LPPM Universitas Putra Indonesia (UPI) YPTK Padang |
| Ditujukan kepada | BPBD Provinsi Sumatera Barat & Dinas Kominfotik Provinsi Sumatera Barat |
| Sifat dokumen | Konsolidasi & revisi menyeluruh atas 2 draf riset sebelumnya (analisis internal + eksternal) |
| Status | Final — siap presentasi/demo |
| Ruang lingkup | Modul GIS/pemetaan kebencanaan (peta interaktif, visualisasi data dampak, evakuasi, integrasi data real-time) |
| Prinsip teknologi | 100% open-source, gratis, dapat dikustomisasi penuh, tidak bergantung pada Leaflet |
| Tentang Dokumen Ini
Dokumen ini menggantikan dan mengonsolidasikan dua draf riset sebelumnya (satu berbasis analisis mendalam dengan referensi teknis terverifikasi, satu lagi berbasis riset literatur umum). Rekomendasi yang saling bertentangan pada kedua draf — terutama soal pemilihan engine peta — telah dievaluasi ulang di sini, diverifikasi terhadap dokumentasi resmi tiap teknologi per September 2026, dan disatukan menjadi satu arah teknis yang tegas dan dapat langsung dieksekusi. |
| --- |
| Keputusan Arsitektur Kunci
Leaflet ditinggalkan sepenuhnya. Engine peta baru: MapLibre GL JS (WebGL, open-source, BSD-3-Clause) dengan basemap vector tile kustom berbasis PMTiles/Protomaps yang di-hosting sendiri — bukan sekadar "alternatif", melainkan pilihan utama dan satu-satunya. Ini memberi kontrol penuh atas tampilan (warna, tipografi, ikon, mode gelap/terang, gaya ala Google Maps) tanpa bergantung pada API key pihak ketiga atau kuota gratis yang bisa habis. |
| --- |
| Aspek | Kondisi Saat Ini | Dampak |
| --- | --- | --- |
| Basemap | Leaflet + raster OSM standar | Tidak informatif untuk konteks bencana; tidak ada mode satelit/terrain/gelap |
| Rendering | DOM-based (SVG/HTML) | Performa menurun signifikan saat titik data mencapai ribuan–puluhan ribu |
| Visualisasi data | Marker/pin polos tanpa clustering | Sulit membaca pola sebaran bencana secara makro saat zoom out |
| Konteks wilayah | Batas administrasi tidak ditonjolkan | Masyarakat kesulitan menilai risiko wilayahnya sendiri |
| Interaktivitas | Tidak ada drill-down | Tidak mendukung "telusuri bencana" secara hierarkis (provinsi → kabupaten → kecamatan → nagari) |
| Evakuasi | Tidak tersedia sama sekali | Masyarakat tidak tahu posko terdekat maupun rute ke sana |
| Data real-time | Tidak terintegrasi API resmi | Info gempa/cuaca/kejadian tidak update otomatis |
| Mode akses saat krisis | Tidak ada dukungan offline | Saat internet terputus (kondisi umum pasca-bencana), dashboard tidak bisa diakses sama sekali |
| Kesimpulan Evaluasi
Dokumen final ini mengambil fondasi arsitektur dari Dokumen A, mengoreksi rekomendasi tile provider agar lebih independen jangka panjang, mengadopsi poin-poin UI/UX yang relevan dari Dokumen B, dan menambahkan seluruh gap yang tidak dibahas kedua dokumen: PWA/offline-first, routing sadar-blokade, notifikasi real-time, keamanan API, skalabilitas beban puncak, dan rencana pemulihan bencana untuk sistem itu sendiri. |
| --- |
| No | Sasaran | Indikator Keberhasilan |
| --- | --- | --- |
| 1 | Migrasi total dari Leaflet ke MapLibre GL JS (WebGL) | Waktu render < 2 detik untuk 10.000+ titik data; frame rate ≥ 45 FPS saat pan/zoom |
| 2 | Basemap kustom self-hosted (bukan bergantung pihak ketiga) | Tersedia mode terang, gelap, satelit/hybrid, dan terrain 3D |
| 3 | Fitur telusuri bencana (drill-down wilayah) | Klik peta → data kecamatan/nagari tampil < 3 detik |
| 4 | Routing evakuasi cerdas ke posko terdekat | Rute + estimasi waktu tempuh muncul < 5 detik, otomatis menghindari jalan yang dilaporkan terputus |
| 5 | Integrasi data real-time BMKG & BNPB | Data gempa terbaru ter-refresh ≤ 5 menit; notifikasi push untuk gempa M ≥ 5.0 |
| 6 | Visualisasi risiko (choropleth, heatmap, clustering) | Layer rawan gempa, longsor, banjir, tsunami tersedia dan dapat ditumpuk (overlay) |
| 7 | Akses tetap berfungsi minim/tanpa internet (PWA) | Peta dasar & data posko tetap dapat diakses dalam mode offline setelah kunjungan pertama |
| 8 | Akses berbasis peran (role-based access control) | Minimal 4 peran: Publik, Operator BPBD, Admin, Pimpinan |
| 9 | Ketahanan terhadap lonjakan trafik saat bencana besar | Sistem tetap responsif pada beban ≥ 5x trafik normal (load testing terverifikasi) |
| Lapisan | Komponen | Fungsi |
| --- | --- | --- |
| 1. Presentation | MapLibre GL JS, React (Vite), Tailwind CSS | Rendering peta WebGL, komponen UI, panel statistik, PWA shell |
| 2. Basemap/Tile | PMTiles (Protomaps) self-hosted di object storage, style JSON kustom | Menyajikan vector tile basemap tanpa API key, kontrol visual penuh |
| 3. Backend/API | FastAPI (Python) atau Node.js (Fastify), Redis untuk cache & job queue | Menjembatani frontend dengan database spasial dan layanan eksternal |
| 4. Routing & Geo-services | OSRM/Valhalla (self-host), Photon/Nominatim (geocoding) | Kalkulasi rute evakuasi, pencarian alamat, isochrone |
| 5. Data & Integrasi | PostgreSQL + PostGIS, integrasi BMKG/BNPB/Satu Data Bencana | Penyimpanan spasial persisten, sinkronisasi data eksternal terjadwal |
| Aspek | Leaflet.js | MapLibre GL JS |
| --- | --- | --- |
| Rendering | DOM (SVG/HTML), 1 elemen per fitur | WebGL, GPU-accelerated, ribuan fitur dalam 1 draw call |
| Kapasitas titik data praktis | Ratusan–low ribuan sebelum lag terasa | Puluhan ribu–jutaan titik tanpa penurunan performa berarti |
| Styling | CSS/inline style per marker, terbatas | Style-driven expression (data-driven styling), sangat fleksibel |
| 3D / terrain | Tidak didukung native | Native: 3D terrain, building extrusion, globe view |
| Kesan visual "Google Maps-grade" | Sulit dicapai — terlihat seperti peta OSM standar | Dapat dicapai penuh — MapLibre dipakai banyak produk komersial kelas atas (Snapchat Map, Meta, Amazon Location) |
| Ukuran ekosistem plugin | Sangat besar (kelebihan utama Leaflet) | Berkembang pesat, mencakup semua kebutuhan proyek ini |
| Keputusan Final
MapLibre GL JS dipilih sebagai satu-satunya engine peta. Tidak ada rencana mempertahankan Leaflet dalam bentuk apa pun, termasuk sebagai fallback — untuk menghindari kompleksitas pemeliharaan dua sistem peta sekaligus. |
| --- |
| Opsi | Kelebihan | Kekurangan | Keputusan |
| --- | --- | --- | --- |
| PMTiles/Protomaps (self-host) | Kontrol penuh, tanpa API key, tanpa batas kuota, tanpa biaya berulang, dapat custom style total | Perlu proses build ulang saat OSM data diperbarui (dapat dijadwalkan otomatis) | ✅ Utama & final |
| MapTiler (cloud) | Kualitas tinggi siap pakai | Free tier terbatas kuota, ketergantungan pihak ketiga | Cadangan development/staging saja |
| OpenFreeMap (cloud) | Gratis tanpa API key | Kontrol styling lebih terbatas, bergantung ketersediaan layanan pihak ketiga | Tidak direkomendasikan untuk produksi jangka panjang |
| Engine | Lisensi | Kelebihan | Kekurangan | Peran |
| --- | --- | --- | --- | --- |
| OSRM | BSD-2-Clause | Sangat cepat (~50–100ms), matang, banyak dipakai produksi | Update graf jalan butuh re-build data (tidak real-time secara native) | Mesin utama untuk kalkulasi rute cepat |
| Valhalla | MIT | Mendukung penalti/exclude dinamis per edge jalan (cocok untuk "hindari jalan rusak"), profil multi-moda (jalan kaki, motor, mobil) | Sedikit lebih berat resource dibanding OSRM | Direkomendasikan sebagai mesin utama jika kebutuhan "hindari blokade" menjadi prioritas tinggi |
| Mekanisme "Hindari Jalan Terputus"
Operator BPBD dapat menandai ruas jalan sebagai "terputus/tidak dapat dilalui" melalui panel admin saat terjadi longsor/banjir. Tabel jalan_terputus di PostGIS disinkronkan secara berkala ke graf routing (melalui exclude polygon di Valhalla atau exclude area di OSRM), sehingga rute yang dihasilkan otomatis menghindari segmen tersebut — bukan rute default yang mengasumsikan seluruh jaringan jalan dalam kondisi normal. |
| --- |
| Layer | Teknologi | Lisensi | Biaya |
| --- | --- | --- | --- |
| Peta/Rendering | MapLibre GL JS | BSD-3-Clause | Gratis |
| Basemap Tile | PMTiles (Protomaps) self-hosted | BSD-3-Clause / ODbL (data OSM) | Gratis (hanya biaya storage) |
| Data-viz layer | Deck.gl (opsional, untuk heatmap/3D lanjutan) | MIT | Gratis |
| Routing evakuasi | OSRM + Valhalla | BSD-2 / MIT | Gratis (self-host) |
| Geocoding/pencarian alamat | Photon (berbasis Nominatim/OSM) | Apache-2.0 | Gratis |
| Database spasial | PostgreSQL + PostGIS | PostgreSQL License / GPL-2 | Gratis |
| Backend API | FastAPI (Python) atau Fastify (Node.js) | MIT | Gratis |
| Cache & job queue | Redis | RSALv2/SSPLv1 (self-host tetap gratis) | Gratis |
| Frontend framework | React + Vite + TypeScript + Tailwind CSS | MIT | Gratis |
| Grafik statistik | Apache ECharts atau Recharts | Apache-2.0 / MIT | Gratis |
| PWA/offline | Workbox (Google, open-source) | MIT | Gratis |
| Object storage tile | MinIO (self-host, kompatibel S3) | AGPLv3 (self-host tetap gratis) | Gratis |
| Data | Sumber/Endpoint | Frekuensi Update | Pemanfaatan di GIS |
| --- | --- | --- | --- |
| Gempa dirasakan terkini | data.bmkg.go.id (feed resmi) — format XML/JSON, disajikan ulang komunitas sebagai wrapper REST | 5–10 menit / near real-time | Notifikasi + titik gempa di peta, filter M ≥ 5.0 memicu alert |
| Gempa berpotensi tsunami | Feed BMKG khusus tsunami warning | Real-time saat kejadian | Alert prioritas tertinggi + banner peringatan tsunami di seluruh dashboard |
| Prakiraan cuaca per wilayah (kelurahan/desa) | API BMKG prakiraan cuaca digital | 3 jam-an | Layer cuaca opsional, relevan untuk potensi banjir/longsor akibat curah hujan tinggi |
| Peringatan dini cuaca ekstrem | BMKG (siaran pers/API peringatan dini) | Sesuai rilis | Banner peringatan + push notification untuk wilayah terdampak |
| Data | Sumber/Endpoint | Frekuensi Update | Pemanfaatan di GIS |
| --- | --- | --- | --- |
| Peta rawan gempa, likuefaksi, longsor, banjir, tsunami (InaRISK) | gis.bnpb.go.id (Geoportal Data Bencana Indonesia) — layanan Esri REST/ArcGIS | Sesuai rilis resmi (biasanya tahunan/per kajian risiko) | Layer hazard dasar untuk choropleth risiko per wilayah |
| Dataset kejadian & dampak bencana historis | data.bnpb.go.id (Portal Satu Data Bencana Indonesia, berbasis CKAN, memiliki API Docs publik) | Berkala sesuai unggahan BNPB/BPBD | Analisis tren historis, dasar kalkulasi indeks risiko wilayah |
| Data agregat lintas-kementerian kebencanaan | katalog.satudata.go.id (Portal Satu Data Indonesia) | Bervariasi per dataset | Data pelengkap (populasi, infrastruktur terdampak) untuk konteks analisis |
| Data | Sumber & Metode | Frekuensi |
| --- | --- | --- |
| Titik kejadian bencana real-time | Input manual Operator BPBD melalui panel admin (form terstruktur) | Real-time saat kejadian dilaporkan |
| Korban jiwa, luka, hilang, pengungsian | Input Operator BPBD per kejadian & per wilayah | Real-time / harian |
| Kerugian ekonomi & kerusakan bangunan (rumah, fasum, faskes, sekolah) | Input Operator BPBD, kategori rusak berat/sedang/ringan | Berkala sesuai asesmen lapangan |
| Lokasi & kapasitas posko evakuasi | Data BPBD, dikelola melalui panel admin (CRUD posko) | Diperbarui saat ada perubahan status posko |
| Status ruas jalan (terputus/rusak/dapat dilalui) | Input Operator BPBD/Dishub saat asesmen pasca-bencana | Real-time — kritikal untuk fitur routing evakuasi |
| Fasilitas kesehatan (RS, puskesmas, klinik) | Dinas Kesehatan Provinsi Sumbar / data OpenStreetMap sebagai basis awal | Berkala |
| import httpx, re
from datetime import datetime
 
BMKG_AUTOGEMPA = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json"
 
async def sync_gempa_bmkg():
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(BMKG_AUTOGEMPA)
        g = resp.json()["Infogempa"]["gempa"]
 
    # PENTING: format BMKG adalah "lon,lat", bukan "lat,lon"
    lon_str, lat_str = g["Coordinates"].split(",")
    lon, lat = float(lon_str), float(lat_str)
 
    # "Potensi" adalah teks bebas, bukan boolean - deteksi via kata kunci
    potensi_tsunami = "tsunami" in g.get("Potensi", "").lower()
    external_id = f"{g['Tanggal']}_{g['Jam']}"  # kunci deduplikasi
 
    await upsert_gempa(
        external_id=external_id,
        magnitude=float(g["Magnitude"]),
        kedalaman_km=float(re.sub(r"[^\d.]", "", g["Kedalaman"])),
        lon=lon, lat=lat,
        wilayah_teks=g["Wilayah"],
        waktu_kejadian=datetime.fromisoformat(g["DateTime"]),
        potensi_tsunami=potensi_tsunami,
    )
 
    if float(g["Magnitude"]) >= 5.0 or potensi_tsunami:
        await kirim_notifikasi_push(f"Gempa M{g['Magnitude']} — {g['Wilayah']}") |
| --- |
| Spesifikasi | Detail |
| --- | --- |
| Deskripsi | Peta dasar dengan mode Terang, Gelap, dan Satelit/Hybrid, gaya visual setara Google Maps |
| Teknologi | MapLibre GL JS + style JSON kustom + PMTiles self-hosted |
| Interaksi | Toggle mode via tombol lapisan (layer switcher), transisi halus antar-mode |
| Target kinerja | Load awal < 2 detik, pergantian mode < 500ms |
| Spesifikasi | Detail |
| --- | --- |
| Deskripsi | Klik area di peta → identifikasi wilayah administratif → tampilkan panel data agregat kerugian/korban/kerusakan |
| Teknologi | PostGIS spatial query (ST_Contains) + panel samping React |
| Alur | Klik peta → koordinat dikirim ke backend → query wilayah → render panel dengan animasi slide-in |
| Data ditampilkan | Nama wilayah, jumlah korban (jiwa/luka/hilang), kerugian ekonomi (Rp), jumlah bangunan rusak per kategori, jumlah pengungsi |
| Target kinerja | Response < 3 detik |
| Jenis | Fungsi | Teknologi |
| --- | --- | --- |
| Choropleth | Pewarnaan wilayah berdasar tingkat risiko/kerugian (gradien, bukan warna acak) | MapLibre fill layer + data-driven expression |
| Heatmap | Visualisasi densitas kejadian bencana | MapLibre heatmap layer (native, tanpa perlu Deck.gl tambahan) |
| Clustering | Pengelompokan titik saat zoom out agar peta tidak penuh sesak | MapLibre GL clustering (native, built-in) |
| Spesifikasi | Detail |
| --- | --- |
| Deskripsi | Pengguna menekan tombol "Evakuasi Sekarang" → sistem mendeteksi/meminta lokasi pengguna → tampilkan 3 posko terdekat berikut rute turn-by-turn |
| Teknologi | OSRM/Valhalla + Geolocation API browser + MapLibre line layer untuk render rute |
| Fitur navigasi | Estimasi jarak & waktu tempuh, panduan belok per persimpangan (turn-by-turn text), highlight rute aktif dengan animasi |
| Kesadaran situasi darurat | Otomatis menghindari ruas jalan yang ditandai "terputus" oleh Operator BPBD |
| Target kinerja | Rute muncul < 5 detik |
| Peran | Akses | Fitur | Tujuan |
| --- | --- | --- | --- |
| Publik | Tanpa login | Lihat peta, cari posko terdekat, lihat rute evakuasi, lihat data bencana (read-only) | Masyarakat memahami risiko & jalur evakuasi tanpa hambatan |
| Operator BPBD | Login akun | Semua fitur publik + input data kejadian, update korban/kerugian, kelola posko, tandai jalan terputus | Update data real-time dari lapangan, terbatas pada wilayah tugasnya |
| Administrator | Login admin | Semua fitur operator + kelola user, kelola layer peta, konfigurasi sistem, tanpa batas wilayah | Manajemen sistem secara keseluruhan |
| Pimpinan/Pembuat Kebijakan | Login akun pimpinan | Dashboard ringkasan, laporan statistik, ekspor data, analitik tren (read-only) | Pengambilan keputusan berbasis data agregat |
| Fitur | Publik | Operator | Admin | Pimpinan |
| --- | --- | --- | --- | --- |
| Lihat peta & data bencana | ✅ | ✅ | ✅ | ✅ |
| Cari posko & routing evakuasi | ✅ | ✅ | ✅ | ✅ |
| Input/update data kejadian | ❌ | ✅ | ✅ | ❌ |
| Kelola posko evakuasi | ❌ | ✅ | ✅ | ❌ |
| Tandai jalan terputus | ❌ | ✅ | ✅ | ❌ |
| Kelola pengguna & role | ❌ | ❌ | ✅ | ❌ |
| Konfigurasi layer/style peta | ❌ | ❌ | ✅ | ❌ |
| Ekspor laporan & analitik | ❌ | ❌ | ✅ | ✅ |
| Catatan Implementasi
Karena tim memilih untuk belum menggunakan Docker pada tahap ini, deployment awal disarankan menggunakan proses manual terdokumentasi dengan baik (systemd service per komponen di Linux) plus script otomatisasi shell/Python untuk tugas berulang (backup, sinkronisasi data, rebuild tile). Detail lengkap ada di file arsitektur.md dan deployment.md pada paket dokumentasi teknis terpisah. |
| --- |
| Komponen | Lisensi | Biaya |
| --- | --- | --- |
| MapLibre GL JS | BSD-3-Clause | Gratis |
| PMTiles/Protomaps | BSD-3-Clause | Gratis |
| OSRM | BSD-2-Clause | Gratis |
| Valhalla | MIT | Gratis |
| Photon | Apache-2.0 | Gratis |
| PostgreSQL + PostGIS | PostgreSQL License / GPL-2 | Gratis |
| FastAPI | MIT | Gratis |
| React + Vite | MIT | Gratis |
| Komponen | Spesifikasi | Estimasi Biaya/Bulan |
| --- | --- | --- |
| VPS Application Server | 4 vCPU, 8 GB RAM | Rp 500.000 – 800.000 |
| VPS Database Server | 4 vCPU, 16 GB RAM, SSD | Rp 800.000 – 1.200.000 |
| Object Storage (PMTiles, backup) | 50–100 GB | Rp 100.000 – 250.000 |
| Domain & SSL | — | Rp 100.000 |
| Solusi | Estimasi Biaya Tahunan |
| --- | --- |
| Open-source (usulan ini) | Rp 0 – 28 juta/tahun (tergantung skema hosting) |
| Google Maps Platform | Rp 50 – 200 juta/tahun (indikatif, tergantung volume trafik) |
| Mapbox | Rp 30 – 150 juta/tahun (indikatif, tergantung volume trafik) |
| ArcGIS Online | Rp 80 – 300 juta/tahun (indikatif) |
| Peran | Jumlah | Estimasi Durasi |
| --- | --- | --- |
| Solution Architect / Tech Lead | 1 | 2 bulan (fase desain arsitektur) |
| Backend Developer | 1 | 4 bulan |
| Frontend Developer (fokus MapLibre/GIS) | 1 | 4 bulan |
| GIS Analyst (data spasial, kalibrasi) | 1 | 3 bulan |
| UI/UX Designer | 1 | 1–2 bulan |
| QA / Tester | 1 | 2 bulan |
| Aktivitas | Output |
| --- | --- |
| Setup PostgreSQL + PostGIS | Database spasial siap |
| Generate basemap PMTiles wilayah Sumbar + desain style kustom (terang/gelap) | Basemap modern berfungsi, dapat di-preview |
| Import batas administrasi 4 level (Provinsi → Kabupaten → Kecamatan → Nagari) | Data wilayah lengkap di PostGIS |
| Setup MapLibre GL JS di frontend, render basemap kustom | Peta dasar tampil, dapat pan/zoom/toggle mode |
| Setup backend API dasar (FastAPI/Fastify) | REST API untuk query wilayah berjalan |
| Aktivitas | Output |
| --- | --- |
| Implementasi choropleth risiko/kerugian per kecamatan | Peta tematik berwarna sesuai tingkat risiko |
| Implementasi heatmap & clustering titik bencana | Visualisasi densitas kejadian berfungsi |
| Fitur telusuri bencana (drill-down klik wilayah) | Panel data wilayah muncul saat klik peta |
| Panel statistik & grafik (ECharts) | Grafik kerugian/korban per wilayah tampil dinamis |
| Pencarian & filter interaktif | Filter jenis bencana, tanggal, wilayah berfungsi |
| Aktivitas | Output |
| --- | --- |
| Setup OSRM/Valhalla routing engine untuk wilayah Sumbar | Mesin routing berfungsi lokal |
| Fitur "Evakuasi Sekarang" — cari & rute ke posko terdekat | Navigasi turn-by-turn berfungsi end-to-end |
| Mekanisme tandai jalan terputus (Operator BPBD) | Rute otomatis menghindari jalan yang ditandai |
| Integrasi BMKG API (gempa + cuaca) via backend worker terjadwal | Data gempa real-time tampil di peta |
| Integrasi Geoportal BNPB / Satu Data Bencana | Layer risiko nasional tersinkron |
| Implementasi RBAC 4 peran | Login & hak akses berbeda per peran berfungsi |
| Aktivitas | Output |
| --- | --- |
| Implementasi PWA (offline shell + cache basemap/posko) | Dashboard dapat diakses minim koneksi internet |
| 3D terrain untuk visualisasi longsor/genangan | Mode terrain aktif, dapat toggle 2D/3D |
| Hardening keamanan (rate limit, audit log, HTTPS penuh) | Checklist keamanan produksi terpenuhi |
| Load testing skenario lonjakan trafik bencana besar | Sistem terverifikasi stabil pada beban ≥ 5x normal |
| Dokumentasi & pelatihan Operator BPBD | Panduan pengguna & admin tersedia |
| Demo/presentasi final ke BPBD & Diskominfotik | Sistem siap diajukan untuk tahap produksi |
| No | Rekomendasi | Prioritas |
| --- | --- | --- |
| 1 | Migrasi engine peta ke MapLibre GL JS + basemap PMTiles kustom | 🔴 Tinggi |
| 2 | Bangun spatial database PostgreSQL + PostGIS | 🔴 Tinggi |
| 3 | Implementasi fitur telusuri bencana (drill-down wilayah) | 🔴 Tinggi |
| 4 | Implementasi routing evakuasi dengan OSRM/Valhalla + kesadaran blokade jalan | 🔴 Tinggi |
| 5 | Integrasi data real-time BMKG & Geoportal BNPB | 🟡 Sedang |
| 6 | Implementasi RBAC 4 peran | 🟡 Sedang |
| 7 | PWA/offline-first | 🟡 Sedang |
| 8 | 3D terrain visualization | 🟢 Rendah |
| 9 | Fitur crowdsourced reporting & simulasi skenario bencana | 🟢 Rendah |
| File | Isi |
| --- | --- |
| 00-overview.md | Ringkasan proyek, prinsip desain, dan peta keterhubungan antar-dokumen — titik masuk pertama sebelum membaca file lain |
| 01-arsitektur.md | Arsitektur sistem detail, keputusan teknologi & alasannya, diagram alur data, struktur direktori proyek |
| 02-database.md | Skema PostgreSQL + PostGIS lengkap, indeks spasial, contoh query, strategi migrasi data |
| 03-backend-api.md | Spesifikasi REST API, kontrak endpoint, autentikasi, integrasi routing engine & data eksternal |
| 04-frontend-ui-ux.md | Prinsip desain UI/UX non-generik, sistem desain (design tokens), struktur komponen React, panduan agar hasil tidak terlihat "AI slop" |
| 05-peta-gis.md | Panduan teknis MapLibre GL JS, pembuatan basemap PMTiles kustom, style JSON, layer visualisasi data |
| 06-routing-evakuasi.md | Setup OSRM/Valhalla, mekanisme sadar-blokade jalan, kontrak API routing |
| 07-integrasi-data-eksternal.md | Detail integrasi BMKG, BNPB/InaRISK, Satu Data Bencana Indonesia — endpoint, jadwal sinkronisasi, format data |
| 08-keamanan-deployment.md | Checklist keamanan, strategi deployment tanpa Docker (systemd), monitoring, backup & disaster recovery |
| 09-agent-instructions.md | Instruksi khusus untuk AI coding agent (mis. Claude Code/Antigravity) agar bekerja bertahap dan konsisten dengan seluruh dokumen ini |
| 10-katalog-data-sumbar.md | Referensi cepat: endpoint API, koordinat, kode wilayah Sumbar yang siap dipakai langsung tanpa membaca narasi panjang |
| 11-optimasi-performa.md | WAJIB dibaca sebelum implementasi peta/backend — strategi agar sistem tetap ringan (pre-build tile, batasi ukuran basemap, caching berlapis, materialized view aman) |
| Cara Menggunakan Paket Ini
Mulai dari 00-overview.md untuk konteks umum, lalu buka file sesuai peran/tugas yang sedang dikerjakan. Setiap file dirancang mandiri (self-contained) namun saling merujuk silang. Untuk AI coding agent, arahkan agent membaca 09-agent-instructions.md terlebih dahulu sebelum memulai implementasi apa pun. |
| --- |