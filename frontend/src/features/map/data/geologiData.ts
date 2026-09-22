// Data Spasial Geologi & Tektonik Sumatera Barat:
// 1. Patahan Aktif Sesar Semangko (The Great Sumatran Fault) di Daratan Sumbar
// 2. Zona Subduksi Megathrust Mentawai di Samudera Hindia
// 3. Peta Zonasi Bahaya & Garis Evakuasi Aman Tsunami (Bypass Line)

export const sesarSemangkoGeoJSON: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'sesar-sianok',
        nama: 'Sesar Semangko — Segmen Sianok',
        tipe: 'Sesar Geser Mendatar Aktif (Dextral Strike-Slip)',
        panjang_km: 65,
        slip_rate: '11 mm/tahun',
        potensi_mag: 'M 6.8 – 7.2',
        kedalaman: 'Dangkal (5 – 15 km)',
        wilayah_lintasan: 'Ngarai Sianok, Bukittinggi, Agam, Danau Maninjau',
        riwayat_gempa: 'Gempa Singkarak/Bukittinggi 1926 (M6.7) & Gempa Padang Panjang 2007 (M6.4)',
        karakteristik: 'Membelah tebing terjal Ngarai Sianok. Menghasilkan guncangan lokal sangat kuat berdurasi singkat dan sering memicu tanah longsor masif di lereng perbukitan.',
        rekomendasi: 'Konstruksi bangunan tahan gempa bertulang (SNI 1726), hindari membangun di bibir lereng tebing rawan runtuh.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [100.15, -0.05],
          [100.22, -0.15],
          [100.32, -0.28],
          [100.365, -0.305], // Sianok Panorama Bukittinggi
          [100.41, -0.38],
          [100.46, -0.47]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'sesar-sumani',
        nama: 'Sesar Semangko — Segmen Sumani',
        tipe: 'Sesar Geser Mendatar Aktif (Dextral Strike-Slip)',
        panjang_km: 60,
        slip_rate: '12 – 14 mm/tahun',
        potensi_mag: 'M 7.0',
        kedalaman: 'Dangkal (8 – 14 km)',
        wilayah_lintasan: 'Danau Singkarak, Nagari Sumani, Kota Solok, Selayo',
        riwayat_gempa: 'Gempa Bumi Solok 1943 (M7.1) & Gempa Tektonik 2007 (M6.4)',
        karakteristik: 'Membentuk cekungan pull-apart basin yang menjadi Danau Singkarak. Gempa di segmen ini berisiko memicu gelombang seiche (tsunami danau) dan kerusakan infrastruktur di sepanjang cekungan Solok.',
        rekomendasi: 'Penetapan zona sempadan patahan aktif (minimum 50m dari garis sesar), edukasi simulasi evakuasi mandiri gempa darat.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [100.46, -0.47],
          [100.52, -0.55],
          [100.57, -0.63], // Singkarak
          [100.62, -0.72], // Sumani
          [100.65, -0.79], // Kota Solok
          [100.67, -0.88]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'sesar-suliti',
        nama: 'Sesar Semangko — Segmen Suliti',
        tipe: 'Sesar Geser Mendatar Aktif (Dextral Strike-Slip)',
        panjang_km: 95,
        slip_rate: '13 mm/tahun',
        potensi_mag: 'M 7.2',
        kedalaman: 'Dangkal (10 – 18 km)',
        wilayah_lintasan: 'Danau Diatas/Dibawah (Alahan Panjang), Surian, Solok Selatan',
        riwayat_gempa: 'Gempa Kerinci-Suliti 1909 (M7.6) & Gempa Solok Selatan 2019 (M5.3)',
        karakteristik: 'Membentang melewati lembah perkebunan teh Alahan Panjang hingga batas TNKS di Solok Selatan. Memiliki rekahan geser yang sangat jelas di morfologi bentang alam.',
        rekomendasi: 'Jalur pipa air bersih dan kelistrikan harus dipasangi sambungan fleksibel (flexible joint) yang tahan pergeseran horizontal tanah.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [100.67, -0.88],
          [100.72, -0.98],
          [100.78, -1.12], // Danau Kembar
          [100.86, -1.28], // Surian
          [100.98, -1.45], // Solok Selatan
          [101.12, -1.65]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'sesar-angkola',
        nama: 'Sesar Semangko — Segmen Angkola & Barumun (Utara Sumbar)',
        tipe: 'Sesar Geser Mendatar Aktif (Dextral Strike-Slip)',
        panjang_km: 110,
        slip_rate: '10 mm/tahun',
        potensi_mag: 'M 7.0',
        kedalaman: 'Dangkal (10 – 20 km)',
        wilayah_lintasan: 'Pasaman, Bonjol, perbatasan Tapanuli Selatan',
        riwayat_gempa: 'Gempa Pasaman Barat 2022 (M6.1 di Sesar Talamau/Angkola)',
        karakteristik: 'Melintasi lereng Gunung Talamau. Gempa pada Februari 2022 memicu likuefaksi dan longsor parah di Malampah.',
        rekomendasi: 'Pemantauan deformasi GPS kontinu dan rekayasa lereng di pemukiman kaki gunung.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [99.85, 0.45],
          [99.95, 0.30],
          [100.05, 0.15],
          [100.15, -0.05]
        ]
      }
    }
  ]
};

export const megathrustMentawaiGeoJSON: any = {
  type: 'FeatureCollection',
  features: [
    // 1. Garis Palung Laut / Trench Subduksi Lempeng (Sunda Trench)
    {
      type: 'Feature',
      properties: {
        id: 'megathrust-trench',
        nama: 'Garis Palung Megathrust Mentawai (Sunda Trench)',
        tipe: 'Zona Penunjaman Lempeng Samudera (Sunda Subduction Trench)',
        konvergensi: '52 – 60 mm/tahun (Lempeng Indo-Australia menunjam ke bawah Eurasia)',
        potensi_mag: 'M 8.8 – 8.9 SR',
        status_tektonik: 'SEISMIC GAP (Kunci Tektonik Energi Belum Terlepas Penuh Sejak 1797 & 1833)',
        potensi_tsunami: 'SANGAT TINGGI (Tinggi Gelombang Run-up 6 – 12 Meter di Garis Pantai)',
        golden_time_mentawai: '5 – 10 Menit (Kepulauan Mentawai: Siberut, Sipora, Pagai)',
        golden_time_daratan: '20 – 30 Menit (Daratan Pesisir: Padang, Pariaman, Pessel, Pasbar)',
        deskripsi: 'Palung samudera laut dalam di sebelah barat Kepulauan Mentawai. Merupakan generator gempa megathrust yang memicu tsunami katastropik jika terjadi patahan dislokasi dasar laut vertikal.',
        panduan_mentawai: 'Segera lari ke perbukitan / dataran tinggi terdekat (> 15 mdpl). JANGAN menunggu sirine atau konfirmasi BMKG!',
        panduan_daratan: 'Evakuasi vertikal ke Lantai 3+ Gedung Shelter TES atau evakuasi horizontal ke arah Timur melewati Jalur Bypass Padang.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [96.70, 0.80],   // Barat Laut Nias
          [97.30, 0.00],   // Palung Samudera Barat Kepulauan Batu
          [97.80, -0.80],  // Palung Samudera Barat Siberut Utara
          [98.30, -1.60],  // Palung Samudera Barat Siberut Selatan
          [98.80, -2.40],  // Palung Samudera Barat Sipora
          [99.40, -3.20],  // Palung Samudera Barat Kepulauan Pagai
          [100.20, -4.10]  // Palung Samudera Selatan Pagai
        ]
      }
    },
    // 2. Bidang Kuncian Seismik / Locked Patch (Poligon Wilayah Risiko Megathrust)
    {
      type: 'Feature',
      properties: {
        id: 'megathrust-locked-zone',
        nama: 'Zona Kuncian Seismik Megathrust Mentawai (Mentawai Locked Patch)',
        tipe: 'Bidang Kontak Lempeng Interplate (Seismic Gap Area)',
        kedalaman_bidang: '15 – 45 km di bawah dasar laut',
        wilayah_terancam: 'Kepulauan Mentawai (Siberut, Sipora, Pagai), Kota Padang, Pariaman, Pesisir Selatan, Pasaman Barat',
        riwayat_dahsyat: 'Gempa Megathrust 1797 (M8.7) & 1833 (M8.9) yang memicu tsunami katastropik di Mentawai dan pesisir barat daratan Sumbar',
        catatan: 'Area akumulasi regangan tektonik aktif yang terus dipantau jaringan stasiun GPS geodetik kontinu SuGAr (Sumatran GPS Array).',
        golden_time_mentawai: '5 – 10 Menit',
        golden_time_daratan: '20 – 30 Menit',
        panduan_mentawai: 'Segera lari ke perbukitan / dataran tinggi terdekat (> 15 mdpl). JANGAN menunggu sirine!',
        panduan_daratan: 'Lari ke Lantai 3+ Shelter TES atau evakuasi horizontal ke arah Timur melewati Jalur Bypass Padang.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [96.70, 0.80],
            [98.80, 0.80],
            [99.60, -0.60],
            [100.30, -1.80],
            [100.80, -3.20],
            [100.40, -4.10],
            [100.20, -4.10],
            [99.40, -3.20],
            [98.80, -2.40],
            [98.30, -1.60],
            [97.80, -0.80],
            [97.30, 0.00],
            [96.70, 0.80]
          ]
        ]
      }
    }
  ]
};

export const zonaTsunamiPadangGeoJSON: any = {
  type: 'FeatureCollection',
  features: [
    // 1. Zona Merah: Rendaman Bahaya Ekstrem Tsunami (Pesisir 0 - 1.5 km, Elevasi < 5m dpl)
    {
      type: 'Feature',
      properties: {
        id: 'tsunami-zona-merah',
        nama: 'Zona Merah: Bahaya Rendaman Tsunami Ekstrem (< 5m dpl)',
        kategori: 'Zona Bahaya Evakuasi Cepat',
        elevasi: '< 5 meter di atas permukaan laut (dpl)',
        waktu_evakuasi: 'Maksimum 20 menit setelah gempa berhenti',
        keterangan: 'Kawasan terdampak langsung gelombang pertama (run-up 6 - 10m). Seluruh warga di zona ini harus lari ke lantai 3+ Shelter TES terdekat atau melewati Jalur Bypass.',
        fasilitas_mitigasi: '7 Gedung Shelter TES Padang, 46 Titik Sirine EWS Tsunami BPBD'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            // Garis Pantai Alami Padang (Utara ke Selatan)
            [100.285, -0.782], // Muaro Batang Anai (Batas Padang Pariaman)
            [100.292, -0.798], // Muaro Kasang
            [100.303, -0.816], // Pasir Jambak
            [100.315, -0.835], // Muaro Penjalinan
            [100.324, -0.852], // Pantai Kalumpang / Lubuk Buaya
            [100.334, -0.870], // Pantai Tabing
            [100.342, -0.888], // Pantai Air Tawar / UNP
            [100.347, -0.905], // Ulak Karang
            [100.350, -0.920], // Lolong Belanti
            [100.352, -0.935], // Pantai Purus / Danau Cimpago
            [100.353, -0.948], // Pantai Olo / Muaro Lasak
            [100.356, -0.960], // Muaro Batang Arau / Jembatan Siti Nurbaya
            [100.352, -0.966], // Tanjung Karang Gunung Padang
            [100.362, -0.985], // Pantai Air Manis (Batu Malin Kundang)
            [100.370, -0.998], // Pantai Nirwana / Bukit Lampu
            // Batas Daratan Timur Berdasarkan Elevasi < 5m dpl
            [100.380, -0.995], // Gerbang Teluk Bayur
            [100.372, -0.975], // Seberang Padang
            [100.366, -0.955], // Sawahan Timur / Tarandam
            [100.365, -0.940], // Simpang Haru / Stasiun Padang
            [100.363, -0.920], // Koridor Jl. Khatib Sulaiman / GOR
            [100.358, -0.900], // Alai Parak Kopi
            [100.355, -0.880], // Tunggul Hitam / Rel Kereta Bandara
            [100.348, -0.855], // Simpang Tabing / Jl. Hamka
            [100.338, -0.830], // Lubuk Buaya / Jl. Adinegoro
            [100.320, -0.805], // Batang Kabung Ganting
            [100.300, -0.785], // Jembatan Batang Anai
            [100.285, -0.782]  // Menutup kembali di muara
          ]
        ]
      }
    },
    // 2. Garis Evakuasi Aman Tsunami (Garis Batas Bypass Padang)
    {
      type: 'Feature',
      properties: {
        id: 'tsunami-garis-bypass',
        nama: 'Garis Evakuasi Aman Tsunami (Jalur Bypass Padang)',
        kategori: 'Batas Garis Evakuasi Horizontal Resmi BPBD',
        karakteristik: 'Batas alamiah & infrastruktur jalan Bypass dari Teluk Bayur hingga Batang Anai (22 km). Wilayah di sebelah TIMUR garis ini memiliki elevasi > 15m dpl dan dinyatakan AMAN dari rendaman tsunami megathrust.',
        panduan: 'Jika melakukan evakuasi horizontal dengan kendaraan/sepeda, lewati garis Bypass ini sebelum Golden Time berakhir.'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [100.395, -1.002], // Pelabuhan Teluk Bayur
          [100.392, -0.975], // Gaung
          [100.390, -0.950], // Pengambiran
          [100.391, -0.925], // Simpang Lubuk Begalung / Pampangan
          [100.389, -0.905], // Pisang / Bypass Semen Padang
          [100.386, -0.880], // Kalumbuk / Kuranji Bypass
          [100.375, -0.845], // Simpang RSUD Padang / Sungai Sapih
          [100.360, -0.815], // Balai Baru Bypass
          [100.345, -0.785], // Lubuk Minturun Bypass
          [100.332, -0.765], // Koto Panjang Ikur Koto
          [100.318, -0.745]  // Flyover Duku / Batang Anai
        ]
      }
    }
  ]
};

// 4. Data Peringatan Dini Cuaca Ekstrem & Ancaman Galodo / Lahar Hujan Marapi-Singgalang (BMKG & PVMBG)
export const cuacaAlertZonesGeoJSON: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'cuaca-galodo-marapi',
        nama: 'Kawasan Peringatan Dini Lahar Hujan (Galodo) Marapi & Singgalang',
        tingkat_bahaya: 'SIAGA (LEVEL TINGGI)',
        warna: '#EF4444',
        curah_hujan: '78.5 mm/jam (Hujan Sangat Lebat)',
        kecepatan_angin: '24 knot (Barat Daya)',
        wilayah_terdampak: 'Kab. Tanah Datar (X Koto, Batipuh), Kab. Agam (Canduang, Sungai Pua), Lembah Anai',
        ancaman: 'Material piroklastik endapan erupsi Marapi tergerus hujan intensitas tinggi, memicu banjir bandang lahar dingin menuju hilir Batang Anai & Bukittinggi.',
        rekomendasi: 'Evakuasi warga di radius 500m dari sempadan sungai, tutup sementara jalan lintas Lembah Anai jika hujan deras berlangsung > 1 jam.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.41, -0.48],
            [100.47, -0.42],
            [100.52, -0.38],
            [100.51, -0.34],
            [100.45, -0.35],
            [100.37, -0.39],
            [100.34, -0.44],
            [100.36, -0.47],
            [100.41, -0.48]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'cuaca-pesisir-badai',
        nama: 'Kawasan Peringatan Hujan Badai & Gelombang Tinggi Pesisir Barat',
        tingkat_bahaya: 'WASPADA (LEVEL SEDANG)',
        warna: '#F59E0B',
        curah_hujan: '46.0 mm/jam (Hujan Lebat)',
        kecepatan_angin: '32 knot (Barat Daya)',
        tinggi_gelombang: '2.5 – 4.0 Meter',
        wilayah_terdampak: 'Kota Padang, Pariaman, Kab. Padang Pariaman, Pesisir Selatan',
        ancaman: 'Genangan banjir pasang rob di pesisir, pohon tumbang, serta risiko banjir genangan di kawasan drainase padat pemukiman kota.',
        rekomendasi: 'Nelayan dan kapal penyeberangan ke Mentawai diimbau menunda pelayaran, amankan baliho dan atap rumah dari terpaan angin kencang.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            // Koridor Perairan Lepas Pantai Barat Sumbar (12 Mil Laut)
            [99.95, -0.55], // Lepas pantai Pariaman Utara
            [100.08, -0.75], // Lepas pantai Batang Anai
            [100.15, -0.92], // Lepas pantai Padang Barat
            [100.22, -1.15], // Lepas pantai Teluk Kabung
            [100.35, -1.35], // Lepas pantai Pesisir Selatan / Tarusan
            // Mengikuti Garis Pesisir Daratan
            [100.55, -1.35],
            [100.48, -1.15],
            [100.38, -0.95],
            [100.30, -0.75],
            [100.15, -0.55],
            [99.95, -0.55]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'cuaca-titik-anai',
        nama: 'Sensor AWS & Pos Pantau Lahar Lembah Anai (Km 64)',
        tingkat_bahaya: 'SIAGA MERAH',
        warna: '#DC2626',
        curah_hujan: '82.0 mm/jam',
        kondisi: 'Debit Aliran Air Batang Anai Meningkat Kritis, Jalan Rawan Terputus',
        pemantau: 'Posko Siaga BPBD Sumbar & Balai Wilayah Sungai V'
      },
      geometry: {
        type: 'Point',
        coordinates: [100.385, -0.465]
      }
    }
  ]
};

// 5. Data Skenario Run-Up Tsunami (Zonasi Bahaya Inundasi Bertingkat KRB Tsunami BPBD / Skenario Mw 8.9)
// Prinsip Hidrodinamika Kebencanaan:
// - Pesisir Pantai (Ground Zero / KRB III): Rendaman paling ekstrem (> 3 - 8+ meter), arus destruktif kritis -> MERAH (#DC2626)
// - Pusat Kota / Intermediet (KRB II): Rendaman sedang-tinggi (1.5 - 3 meter), lantai 1 terendam penuh -> ORANYE (#EA580C)
// - Dataran Aluvial Mendekati Bypass (KRB I): Limpasan akhir run-up gelombang (0.2 - 1.5 meter), arus melemah -> KUNING (#EAB308)
export const tsunamiRunUpGeoJSON: any = {
  type: 'FeatureCollection',
  features: [
    // 1. ZONA MERAH EKSTREM (KRB III): Pesisir & Bibir Pantai (0 – 800m)
    {
      type: 'Feature',
      properties: {
        id: 'runup-zona-ekstrem-pesisir',
        krb_label: 'KRB III (SANGAT TINGGI)',
        tingkat_bahaya: 'BAHAYA EKSTREM',
        skenario: '🔴 Zona Merah Pesisir — Hantaman Langsung & Arus Kritis',
        kedalaman_rendaman: '> 3.0 – 8.0+ Meter di Garis Pantai (Run-Up 10–12m)',
        zona: 'Bibir Pantai: Jl. Samudera, Purus, Taplau, Pasir Jambak, Muaro Padang, Pantai Air Manis',
        dampak_fisik: 'Lantai 1 & 2 tenggelam total, kecepatan arus kritis > 8 m/s, daya hancur infrastruktur masif',
        protokol_evakuasi: 'Wajib evakuasi vertikal ke Lantai 3+ Shelter TES terdekat. Jangan gunakan mobil di zona ini.',
        warna: '#DC2626',
        warna_stroke: '#991B1B',
        opacity: 0.28
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            // Garis Pantai Alami Padang (Utara ke Selatan)
            [100.285, -0.782], // Muaro Batang Anai
            [100.292, -0.798], // Muaro Kasang
            [100.303, -0.816], // Pasir Jambak
            [100.315, -0.835], // Muaro Penjalinan
            [100.324, -0.852], // Pantai Kalumpang / Lubuk Buaya
            [100.334, -0.870], // Pantai Tabing
            [100.342, -0.888], // Pantai Air Tawar / UNP
            [100.347, -0.905], // Ulak Karang
            [100.350, -0.920], // Lolong Belanti
            [100.352, -0.935], // Pantai Purus / Danau Cimpago
            [100.353, -0.948], // Pantai Olo / Muaro Lasak
            [100.356, -0.960], // Muaro Batang Arau / Jembatan Siti Nurbaya
            [100.352, -0.966], // Tanjung Karang Gunung Padang
            [100.362, -0.985], // Pantai Air Manis
            [100.370, -0.998], // Pantai Nirwana / Bukit Lampu
            // Garis Batas Koridor Pesisir ~800m (Selatan ke Utara)
            [100.375, -0.995], // Bukit Lampu Barat
            [100.367, -0.970], // Seberang Padang Barat
            [100.361, -0.945], // Belakang Tangsi / Olo Ladang
            [100.357, -0.915], // Lolong Belanti Timur
            [100.353, -0.885], // Air Tawar Timur
            [100.345, -0.850], // Parupuk Tabing Barat
            [100.333, -0.820], // Lubuk Buaya Barat
            [100.311, -0.795], // Kasang Barat
            [100.291, -0.782], // Batang Anai Barat
            [100.285, -0.782]  // Menutup loop di Muaro Batang Anai
          ]
        ]
      }
    },
    // 2. ZONA ORANYE TINGGI (KRB II): Kawasan Pusat Kota & Permukiman Padat (800m – 2.0 km)
    {
      type: 'Feature',
      properties: {
        id: 'runup-zona-tinggi-kota',
        krb_label: 'KRB II (TINGGI)',
        tingkat_bahaya: 'BAHAYA TINGGI',
        skenario: '🟠 Zona Oranye Pusat Kota — Rendaman Masif & Puing Hanyut',
        kedalaman_rendaman: '1.5 – 3.0 Meter di Kawasan Kota',
        zona: 'Pusat Kota: Koridor Jl. Hamka, Jl. Khatib Sulaiman, Ulak Karang Timur, Lapai, Sawahan, Tarandam',
        dampak_fisik: 'Lantai 1 terendam penuh hingga plafon, kendaraan dan perabotan terseret arus deras',
        protokol_evakuasi: 'Bergerak cepat ke Timur menuju Jalan Bypass atau naik ke lantai 2+ gedung bertulang kokoh',
        warna: '#EA580C',
        warna_stroke: '#C2410C',
        opacity: 0.22
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            // Mengikuti Garis Batas Koridor Pesisir ~800m (Utara ke Selatan)
            [100.291, -0.782],
            [100.311, -0.795],
            [100.333, -0.820],
            [100.345, -0.850],
            [100.353, -0.885],
            [100.357, -0.915],
            [100.361, -0.945],
            [100.367, -0.970],
            [100.375, -0.995],
            // Garis Batas Koridor Tengah ~2.0km (Selatan ke Utara)
            [100.381, -0.995], // Rawang / Teluk Bayur
            [100.375, -0.970], // Seberang Padang Timur
            [100.369, -0.945], // Sawahan / Tarandam
            [100.365, -0.915], // Simpang Haru / Alai
            [100.359, -0.885], // Jl. Khatib Sulaiman / GOR H. Agus Salim
            [100.351, -0.850], // Koridor Tunggul Hitam
            [100.341, -0.820], // Simpang Tabing / Jl. Hamka
            [100.321, -0.795], // Lubuk Buaya Tengah / Jl. Adinegoro
            [100.296, -0.782], // Duku / Batang Anai Tengah
            [100.291, -0.782]  // Menutup loop
          ]
        ]
      }
    },
    // 3. ZONA KUNING WASPADA (KRB I): Dataran Aluvial Timur Mendekati Garis Bypass (2.0 km – 3.5 km)
    {
      type: 'Feature',
      properties: {
        id: 'runup-zona-waspada-aluvial',
        krb_label: 'KRB I (WASPADA)',
        tingkat_bahaya: 'BAHAYA WASPADA',
        skenario: '🟡 Zona Kuning Aluvial — Batas Limpasan Run-Up Ekstrem (Mw 8.9)',
        kedalaman_rendaman: '0.2 – 1.5 Meter (Genangan Limpasan Akhir)',
        zona: 'Dataran Aluvial Timur: Kuranji Barat, Sungai Sapih, Balai Baru barat, mendekati gerbang Bypass',
        dampak_fisik: 'Genangan limpasan akhir sisa energi tsunami sebelum surut, arus melemah di elevasi yang mulai naik',
        protokol_evakuasi: 'Sangat dekat zona aman! Lintasi garis Bypass menuju kawasan perbukitan timur (> 15m dpl)',
        warna: '#EAB308',
        warna_stroke: '#A16207',
        opacity: 0.16
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            // Mengikuti Garis Batas Koridor Tengah ~2.0km (Utara ke Selatan)
            [100.296, -0.782],
            [100.321, -0.795],
            [100.341, -0.820],
            [100.351, -0.850],
            [100.359, -0.885],
            [100.365, -0.915],
            [100.369, -0.945],
            [100.375, -0.970],
            [100.381, -0.995],
            // Garis Batas Penetrasi Maksimum Dataran Aluvial Mendekati Bypass (Selatan ke Utara)
            [100.389, -0.995], // Bukit Lampu / Bypass Selatan
            [100.386, -0.970], // Pengambiran / Pegambiran
            [100.383, -0.945], // Pampangan / Lubuk Begalung Barat
            [100.379, -0.915], // Pisang / Semen Padang Barat
            [100.373, -0.885], // Kalumbuk / Koridor Kuranji
            [100.366, -0.850], // Sungai Sapih / RSUD Padang Barat
            [100.353, -0.820], // Balai Baru Barat
            [100.336, -0.795], // Lubuk Minturun Barat
            [100.306, -0.782], // Duku Timur
            [100.296, -0.782]  // Menutup loop
          ]
        ]
      }
    }
  ]
};

// 6. Data Buffer Sempadan Aktif Sesar Semangko (Zona Penyangga 100m)
export const sesarBufferGeoJSON: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'buffer-sianok',
        nama: 'Zona Sempadan Patahan Sianok (Buffer 100m)',
        ketetapan: 'Permen PUPR: Dilarang mendirikan bangunan fasilitas vital & sekolah tanpa perkuatan seismik tahan geser',
        lebar: '100 Meter dari Poros Sesar'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.147, -0.05],
            [100.153, -0.05],
            [100.223, -0.15],
            [100.323, -0.28],
            [100.368, -0.305],
            [100.413, -0.38],
            [100.463, -0.47],
            [100.457, -0.47],
            [100.407, -0.38],
            [100.362, -0.305],
            [100.317, -0.28],
            [100.217, -0.15],
            [100.147, -0.05]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'buffer-sumani',
        nama: 'Zona Sempadan Patahan Sumani (Buffer 100m)',
        ketetapan: 'Zona Bahaya Deformasi Tanah Aktif & Rekahan Permukaan',
        lebar: '100 Meter dari Poros Sesar'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100.457, -0.47],
            [100.463, -0.47],
            [100.523, -0.55],
            [100.573, -0.63],
            [100.623, -0.72],
            [100.653, -0.79],
            [100.673, -0.88],
            [100.667, -0.88],
            [100.647, -0.79],
            [100.617, -0.72],
            [100.567, -0.63],
            [100.517, -0.55],
            [100.457, -0.47]
          ]
        ]
      }
    }
  ]
};

