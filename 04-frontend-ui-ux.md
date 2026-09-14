# 04 — Frontend, Desain & UI/UX (Non-Generik)

## Kenapa file ini ditulis panjang dan tegas

User secara eksplisit tidak ingin hasil yang terlihat "AI slop" — yaitu: dashboard dengan kartu bulat generik warna biru-ungu gradient, ikon Font Awesome default ditempel sembarangan, layout tiga-kolom-simetris tanpa hierarki, dan tipografi default sistem tanpa karakter. Ini daftar aturan konkret untuk menghindarinya, bukan sekadar imbauan "buat yang bagus".

## Prinsip inti

1. **Peta adalah bintang utama, bukan dekorasi.** Di kebanyakan dashboard generik, peta jadi satu kotak kecil di antara banyak widget. Di sini, peta mengisi mayoritas viewport — panel data melayang di atasnya (overlay), bukan mendesak peta ke sudut.
2. **Setiap warna punya makna, tidak ada warna hiasan.** Merah = bahaya/kerusakan berat. Kuning/oranye = peringatan/sedang. Hijau = aman/rendah. Biru = infrastruktur/air. Jangan pakai palet ungu-gradient generik yang tidak berhubungan dengan konteks kebencanaan.
3. **Data density tinggi tapi tidak berantakan.** Petugas BPBD butuh melihat banyak angka sekaligus — jangan takut menampilkan tabel padat, tapi kelompokkan dengan spasi dan tipografi yang jelas, bukan kartu-kartu terpisah yang memakan ruang.
4. **Kontras terhadap peta.** Karena basemap punya banyak warna (jalan, air, vegetasi), UI panel/kontrol harus punya kontras tegas (biasanya latar solid, bukan transparan tipis ala "glassmorphism" default) agar tetap terbaca di atas peta apa pun.

## Design tokens (jangan pakai warna Tailwind default seperti `blue-500` mentah)

```css
:root {
  /* Warna dasar — netral gelap, bukan abu-abu Tailwind default */
  --color-bg-primary: #0F1720;        /* mode gelap: latar utama panel */
  --color-bg-surface: #1B2733;        /* mode gelap: kartu/panel */
  --color-bg-light: #FAFAF8;          /* mode terang: latar utama */
  --color-bg-light-surface: #FFFFFF;

  /* Warna semantik kebencanaan — INI YANG PALING PENTING, jangan diganti sembarangan */
  --color-danger: #C0392B;      /* kerusakan berat, gempa besar, tsunami */
  --color-warning: #D98E04;     /* kerusakan sedang, peringatan cuaca */
  --color-safe: #1E7A46;        /* aman, posko aktif, jalan lancar */
  --color-info: #2C6E8C;        /* informasi netral, air/sungai */

  /* Brand/identitas — navy khas kelembagaan, BUKAN biru Bootstrap generik */
  --color-brand: #1E3A5F;
  --color-brand-light: #3A5A82;

  /* Tipografi */
  --font-display: 'Space Grotesk', 'Inter', sans-serif;  /* untuk judul/angka besar — punya karakter */
  --font-body: 'Inter', sans-serif;                       /* untuk teks isi — sangat legible */
  --font-mono: 'JetBrains Mono', monospace;                /* untuk koordinat, kode, data teknis */
}
```

> Jangan pakai Arial/Helvetica/system-ui polos untuk judul — itu salah satu penanda paling jelas dari template generik. Space Grotesk atau Inter (keduanya open-source, gratis, di Google Fonts) memberi karakter tanpa terasi berlebihan untuk konteks pemerintahan.

## Layout utama (bukan tiga-kolom simetris generik)

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo BPBD]  Cari lokasi/desa...        [Mode▾] [Alert 🔔] [≡]│ ← header tipis, transparan di atas peta
├───────┬────────────────────────────────────────────────┬─────┤
│       │                                                 │     │
│ Filter│                                                 │Panel│ ← panel kanan MELAYANG (floating card),
│ (col- │                 PETA (MapLibre)                  │data │   muncul HANYA saat user klik wilayah/
│ lapse-│              mengisi seluruh area                │(saat│   fitur — bukan selalu tampil kosong
│ ible) │                                                  │aktif)│
│       │                                                  │     │
├───────┴────────────────────────────────────────────────┴─────┤
│  [Evakuasi Sekarang 🧭]              Legenda: ●gempa ●banjir…  │ ← bottom bar aksi utama, tombol besar & jelas
└──────────────────────────────────────────────────────────────┘
```

Poin kunci:
- Panel filter di kiri **collapsible** (bisa disembunyikan penuh) — bukan sidebar permanen yang memakan 25% layar terus-menerus.
- Panel data kanan **hanya muncul saat relevan** (setelah user drill-down), dengan animasi slide-in dari kanan — bukan panel kosong yang selalu terlihat "menunggu diisi".
- Tombol "Evakuasi Sekarang" adalah **call-to-action paling menonjol** di seluruh UI — besar, warna kontras (`--color-danger` atau `--color-brand` cerah), posisi mudah dijangkau ibu jari di mobile (bottom, bukan pojok atas).

## Mobile-first, bukan "responsive sebagai renungan"

Mayoritas masyarakat akan mengakses ini dari HP saat kondisi darurat, sering dengan sinyal lemah dan dalam keadaan panik. Desain untuk skenario itu:
- Tombol minimal 44×44px (standar aksesibilitas touch target).
- Kontras teks tinggi (rasio minimal 4.5:1) — kondisi cahaya matahari terik saat evakuasi luar ruangan itu nyata.
- Font ukuran dasar minimal 16px di mobile — jangan mengecilkan demi "muat semua di layar".
- Alur "Evakuasi Sekarang" harus bisa diselesaikan dalam **maksimal 2 tap** dari halaman awal: tap tombol → izinkan lokasi → rute langsung tampil. Tidak ada form rumit di tengah.

## Ikon — jangan pakai set ikon generik acak

Gunakan **satu set ikon konsisten** dari satu sumber (disarankan: [Lucide Icons](https://lucide.dev), open-source, konsisten gaya garis/outline, sudah dipakai luas di produk modern). Jangan campur Font Awesome + Material Icons + emoji dalam satu tampilan — itu ciri khas hasil tempelan cepat tanpa sistem desain.

Ikon kustom yang perlu dibuat khusus (SVG sederhana, bukan dari icon pack umum) karena kebutuhan domain spesifik:
- Ikon jenis bencana (gempa, banjir, longsor, tsunami, erupsi) — buat set piktogram sederhana bergaya konsisten, idealnya monoline sama seperti Lucide, supaya menyatu.
- Ikon posko/shelter — bedakan visual posko utama vs titik kumpul vs fasilitas kesehatan.

## Mode gelap sebagai kebutuhan fungsional, bukan gimmick estetika

Mode gelap di sini punya alasan fungsional nyata: petugas lapangan sering bekerja malam hari saat bencana, dan mode gelap mengurangi silau + hemat baterai di layar OLED. Pastikan:
- Basemap MapLibre punya style JSON terpisah untuk mode gelap (bukan cuma invert CSS di atas basemap terang — itu akan terlihat aneh dan tidak dikontrol dengan baik).
- Warna semantik (danger/warning/safe) tetap harus kontras tinggi di kedua mode — uji langsung, jangan asumsi.

## Animasi & micro-interaction (secukupnya, bukan berlebihan)

- Transisi panel: 200–250ms ease-out — cukup terasa halus tanpa terkesan lambat.
- Marker baru (kejadian bencana masuk real-time) muncul dengan animasi pulse singkat agar menarik perhatian tanpa mengganggu.
- **Hindari**: animasi loading skeleton generik yang berlebihan, parallax scroll, atau efek "wow" yang tidak menambah fungsi — ini dashboard operasional darurat, bukan landing page produk.

## Komponen React — struktur yang disarankan

```
src/
├── features/
│   ├── map/
│   │   ├── MapCanvas.tsx           # wrapper MapLibre inti
│   │   ├── LayerControl.tsx        # toggle basemap mode & layer data
│   │   └── layers/                 # satu file per jenis layer (choropleth, heatmap, cluster)
│   ├── telusuri-bencana/
│   │   ├── WilayahPanel.tsx        # panel drill-down kanan
│   │   └── StatistikChart.tsx      # grafik ECharts
│   ├── evakuasi/
│   │   ├── EvakuasiButton.tsx
│   │   ├── RouteInstructions.tsx   # panduan turn-by-turn
│   │   └── PoskoMarker.tsx
│   └── filter/
│       └── FilterPanel.tsx
├── components/         # komponen generik reusable (Button, Modal, Badge)
├── hooks/
│   ├── useGeolocation.ts
│   ├── useMapLibre.ts
│   └── useOfflineStatus.ts
└── lib/
    └── api-client.ts
```

## Checklist sebelum dianggap "selesai" (anti-AI-slop QA)

- [ ] Tidak ada teks placeholder Lorem Ipsum atau "Judul Card" generik tersisa
- [ ] Semua warna berasal dari design tokens di atas, tidak ada warna hex acak ditulis ulang di komponen
- [ ] Peta terlihat mengisi mayoritas layar di semua ukuran device, bukan kotak kecil
- [ ] Tombol "Evakuasi Sekarang" bisa ditemukan dalam < 2 detik oleh orang yang belum pernah lihat aplikasi ini
- [ ] Diuji dengan data asli (nama kecamatan Sumbar sungguhan), bukan data dummy "Kecamatan A, Kecamatan B"
- [ ] Dicoba di layar HP kecil (< 380px lebar) dan tidak ada elemen terpotong/tumpang tindih
- [ ] Mode gelap dan terang keduanya diuji langsung dengan mata, bukan diasumsikan otomatis benar
