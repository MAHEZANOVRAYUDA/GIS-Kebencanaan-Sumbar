import { useState, useEffect, useMemo } from 'react';
import { MapCanvas, type GempaInfo } from './features/map/MapCanvas';
import { WilayahPanel, type WilayahDampakData } from './features/telusuri-bencana/WilayahPanel';
import { StatistikChart, type KecamatanStatItem } from './features/telusuri-bencana/StatistikChart';
import { FilterPanel, type KotaKabupatenItem } from './features/filter/FilterPanel';
import { RouteInstructions, type EvakuasiRouteData } from './features/evakuasi/RouteInstructions';
import { EvakuasiModal, type EvakuasiStartParams } from './features/evakuasi/EvakuasiModal';
import { OperatorModal, type UserSession } from './features/operator/OperatorModal';
import { OfflineBanner } from './features/pwa/OfflineBanner';
import { LayerControlPanel, type LayerVisibilityState } from './features/map/LayerControlPanel';
import { SitrepModal } from './features/sitrep/SitrepModal';
import { CuacaAlertModal } from './features/cuaca/CuacaAlertModal';
import { 
  Compass, 
  Info, 
  Server,
  Layers,
  Radio,
  Navigation,
  UserCheck,
  RefreshCw,
  Moon,
  Globe,
  Map as MapIcon,
  Mountain,
  FileText,
  CloudLightning,
  Crosshair,
  ChevronUp
} from 'lucide-react';

interface HealthStatus {
  status: string;
  database: string;
  version?: string;
}

export function App() {
  // Koordinat Kursor & Telemetri Peta
  const [coords, setCoords] = useState({ lng: 100.4172, lat: -0.85, zoom: 8.4 });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  
  // State Fase 4: Style Basemap Kustom (Default: Satelit Hibrida Rill Gambar 2) & Mode 3D
  const [styleVariant, setStyleVariant] = useState<'satelit' | 'terang' | 'gelap'>('satelit');
  const [is3DTerrain, setIs3DTerrain] = useState<boolean>(false);

  // State Filter Interaktif
  const [selectedJenis, setSelectedJenis] = useState('semua');
  const [selectedTahun, setSelectedTahun] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // State Garis Batas Kabupaten/Kota & Kecamatan Terpilih
  const [selectedKotaBoundaries, setSelectedKotaBoundaries] = useState<any | null>(null);
  const [activeKotaInfo, setActiveKotaInfo] = useState<KotaKabupatenItem | null>(null);
  const [activeKecamatanInfo, setActiveKecamatanInfo] = useState<{ id: number | string; nama: string } | null>(null);

  // State Data Wilayah Terpilih (Drill-Down "Telusuri Bencana")
  const [selectedWilayahId, setSelectedWilayahId] = useState<number | null>(null);
  const [wilayahDampak, setWilayahDampak] = useState<WilayahDampakData | null>(null);
  const [loadingDampak, setLoadingDampak] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // State Daftar Kecamatan & Data Statistik Choropleth
  const [choroplethFeatures, setChoroplethFeatures] = useState<any[]>([]);
  // FIX: Dataset komprehensif 181 kecamatan se-Sumbar untuk fitur "Cari Cepat"
  const [allKecamatanFeatures, setAllKecamatanFeatures] = useState<any[]>([]);

  // ==========================================
  // STATE FASE 3: Evakuasi, BMKG, RBAC Operator
  // ==========================================
  const [routeData, setRouteData] = useState<EvakuasiRouteData | null>(null);
  const [loadingEvakuasi, setLoadingEvakuasi] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [poskoCoords, setPoskoCoords] = useState<{ lat: number; lng: number; nama?: string } | null>(null);
  const [jalanVersion, setJalanVersion] = useState(0);
  const [poskoVersion, setPoskoVersion] = useState(0);
  const [bencanaVersion, setBencanaVersion] = useState(0);

  // Gempa Real-Time BMKG
  const [gempaData, setGempaData] = useState<GempaInfo | null>(null);

  // RBAC Petugas/Operator & Integrasi Spasial
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const savedUser = localStorage.getItem('gis_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const [pickingTarget, setPickingTarget] = useState<'evakuasi' | 'posko' | 'bencana' | null>(null);
  const [pickedOperatorCoords, setPickedOperatorCoords] = useState<{ lat: number; lng: number } | null>(null);

  // ==========================================
  // STATE FASE 5: Mitigasi, SITREP, Cuaca, Layer Kontrol
  // ==========================================
  const [isSitrepModalOpen, setIsSitrepModalOpen] = useState(false);
  const [isLayerControlOpen, setIsLayerControlOpen] = useState(false);
  const [isCuacaModalOpen, setIsCuacaModalOpen] = useState(false);
  const [isPickingLocationOnMap, setIsPickingLocationOnMap] = useState(false);
  const [isEvakuasiMenuOpen, setIsEvakuasiMenuOpen] = useState(false);
  const [isEvakuasiModalOpen, setIsEvakuasiModalOpen] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibilityState>({
    choropleth: true,
    poskoEvakuasi: true,
    shelterTes: true,
    sirineTsunami: true,
    jalanTerputus: true,
    gempa: true,
    cuaca: true,
    sesarSemangko: true,
    sesarBuffer: false,
    megathrust: true,
    zonaTsunami: true,
    tsunamiRunup: false,
  });
  const [evakuasiModa, setEvakuasiModa] = useState<'mobil' | 'jalan_kaki'>('mobil');
  const [cuacaAlerts, setCuacaAlerts] = useState<any[]>([]);

  // State Ringkasan Fasilitas Dinamis (SITREP & Layer Control)
  const [facilityCounts, setFacilityCounts] = useState<{
    posko: number;
    tes: number;
    sirine: number;
    faskes: number;
    total: number;
  }>({
    posko: 18,
    tes: 7,
    sirine: 46,
    faskes: 1,
    total: 26,
  });

  // 1. Cek Koneksi Backend API & Database
  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'offline', database: 'disconnected' }));
  }, []);

  // 1b. Fetch Data Fasilitas SITREP untuk Sinkronisasi Presisi Layer & Tab Evaluasi
  useEffect(() => {
    fetch('/api/admin/sitrep')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.fasilitas) {
          setFacilityCounts({
            posko: data.fasilitas.posko_pengungsi_count ?? 18,
            tes: data.fasilitas.shelter_tes_count ?? 7,
            sirine: data.fasilitas.total_sirine ?? 46,
            faskes: data.fasilitas.faskes_count ?? 1,
            total: data.fasilitas.total_titik_evakuasi ?? 26,
          });
        }
      })
      .catch((err) => console.debug('Gagal mengambil ringkasan fasilitas sitrep:', err));
  }, [poskoVersion]);

  // 2. Fetch Data Gempa BMKG Real-Time (Setiap 60 Detik)
  useEffect(() => {
    const fetchGempa = () => {
      fetch('/api/eksternal/gempa-terkini')
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => {
          if (res && res.data) {
            setGempaData(res.data);
          }
        })
        .catch((err) => console.debug('Gagal mengambil data gempa BMKG:', err));
    };

    fetchGempa();
    const interval = setInterval(fetchGempa, 60000);
    return () => clearInterval(interval);
  }, []);

  // 2b. Fetch Peringatan Cuaca Ekstrem BMKG (Fase 5)
  useEffect(() => {
    const fetchCuaca = () => {
      fetch('/api/eksternal/cuaca-peringatan')
        .then((res) => (res.ok ? res.json() : null))
        .then((res) => {
          if (res && res.data) {
            setCuacaAlerts(res.data);
          }
        })
        .catch((err) => console.debug('Gagal mengambil cuaca BMKG:', err));
    };

    fetchCuaca();
    const interval = setInterval(fetchCuaca, 300000); // 5 Menit
    return () => clearInterval(interval);
  }, []);

  // 3. Bangun URL Choropleth Berdasarkan Filter (Default: Kabupaten/Kota Resmi Sumbar)
  const choroplethUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.append('level', 'kabupaten');
    if (selectedJenis && selectedJenis !== 'semua') {
      params.append('jenis_bencana', selectedJenis);
    }
    if (selectedTahun && selectedTahun !== 'semua') {
      params.append('tahun', selectedTahun);
    }
    return `/api/wilayah/choropleth?${params.toString()}`;
  }, [selectedJenis, selectedTahun]);

  // 4. Muat Data Fitur Choropleth untuk ECharts & Pencarian (Otomatis Refresh saat data bencana termutasi)
  useEffect(() => {
    fetch(choroplethUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((geojson) => {
        if (geojson && geojson.features) {
          setChoroplethFeatures(geojson.features);
        }
      })
      .catch((err) => {
        console.error('Gagal mengambil data choropleth:', err);
      });
  }, [choroplethUrl, bencanaVersion]);

  // 4b. Muat komprehensif 181 kecamatan se-Sumbar dari static GeoJSON untuk fitur "Cari Cepat"
  // Dilakukan sekali saat startup agar pencarian kecamatan menemukan seluruh 181 kecamatan instan
  useEffect(() => {
    fetch('/data/sumbar_kecamatan.geojson')
      .then((res) => (res.ok ? res.json() : null))
      .then((geojson) => {
        if (geojson && geojson.features && geojson.features.length > 0) {
          setAllKecamatanFeatures(geojson.features);
          console.info(`[Cari Cepat] Loaded ${geojson.features.length} kecamatan dari static GeoJSON.`);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat static sumbar_kecamatan.geojson:', err);
      });
  }, []);

  // Ekstrak Data Statistik untuk ECharts
  const chartData: KecamatanStatItem[] = useMemo(() => {
    return choroplethFeatures.map((f: any) => ({
      id: f.properties.id,
      nama: f.properties.nama,
      parent_nama: f.properties.parent_nama,
      total_kerugian: f.properties.total_kerugian || 0,
      total_meninggal: f.properties.total_meninggal || 0,
      total_luka: f.properties.total_luka || 0,
      jumlah_kejadian: f.properties.jumlah_kejadian || 0,
      tingkat_risiko: f.properties.tingkat_risiko || 'rendah',
    }));
  }, [choroplethFeatures]);

  // Ekstrak Daftar Kecamatan untuk Dropdown Pencarian
  // FIX: Gunakan allKecamatanFeatures (181 kecamatan) jika sudah dimuat, bukan hanya choropleth level kabupaten (19 entitas)
  const kecamatanList = useMemo(() => {
    const source = allKecamatanFeatures.length > 0 ? allKecamatanFeatures : choroplethFeatures;
    return source.map((f: any) => ({
      id: f.properties.id,
      nama: f.properties.nama,
      parent_nama: f.properties.parent_nama || f.properties.kabupaten,
      lat: f.properties.lat || f.properties.center_lat || f.properties.y,
      lon: f.properties.lon || f.properties.center_lon || f.properties.x,
    }));
  }, [choroplethFeatures, allKecamatanFeatures]);

  // 5. Handler Pemilihan Wilayah (Klik Peta / Klik Grafik / Hasil Pencarian)
  const handleSelectWilayah = (wilayahId: number, properties?: any) => {
    setSelectedWilayahId(wilayahId);
    setIsLayerControlOpen(false); // Cegah tumpang-tindih panel di sisi kanan
    setLoadingDampak(true);

    // FIX: Jika properties sudah mengandung koordinat, flyTo langsung sebelum fetch selesai
    if (properties?.lat && properties?.lon) {
      setFlyToCoords({ 
        lat: Number(properties.lat), 
        lng: Number(properties.lon), 
        zoom: properties.zoom || 12.5 
      });
      // Load batas kecamatan jika ada info kabupaten induk
      const parentNama = properties.parent_nama || properties.kabupaten;
      const parentId = properties.parent_id;
      if (parentNama || parentId) {
        loadKotaBoundaries(parentNama || '', parentId);
      }
    }

    fetch(`/api/wilayah/${wilayahId}/dampak`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WilayahDampakData | null) => {
        if (data && data.nama) {
          setWilayahDampak(data);
          // FIX: Gunakan koordinat center dari response API jika tersedia (lebih akurat)
          if (data.center && data.center.lat && data.center.lng) {
            setFlyToCoords({ lat: data.center.lat, lng: data.center.lng, zoom: 12.5 });
          }
        } else {
          // Fallback data tangguh agar tidak memicu blank panel
          setWilayahDampak({
            wilayah_id: properties?.id || wilayahId,
            nama: properties?.nama || properties?.name || 'Kecamatan Terpilih',
            parent_nama: properties?.parent_nama || properties?.kabupaten || 'Sumatera Barat',
            total_kerugian: Number(properties?.total_kerugian || 0),
            total_meninggal: Number(properties?.total_meninggal || 0),
            total_luka: Number(properties?.total_luka || 0),
            total_terdampak: Number(properties?.total_terdampak || 0),
            jumlah_pengungsi: Number(properties?.jumlah_pengungsi || 0),
            jumlah_kejadian: Number(properties?.jumlah_kejadian || 0),
            rumah_rusak_berat: 0,
            rumah_rusak_sedang: 0,
            rumah_rusak_ringan: 0,
            fasilitas_umum_rusak: 0,
            fasilitas_kesehatan_rusak: 0,
            sekolah_rusak: 0,
            tingkat_risiko: properties?.tingkat_risiko || 'rendah',
            kejadian_terbaru: []
          });
        }
      })
      .catch(() => {
        setWilayahDampak({
          wilayah_id: properties?.id || wilayahId,
          nama: properties?.nama || properties?.name || 'Kecamatan Terpilih',
          parent_nama: properties?.parent_nama || properties?.kabupaten || 'Sumatera Barat',
          total_kerugian: Number(properties?.total_kerugian || 0),
          total_meninggal: Number(properties?.total_meninggal || 0),
          total_luka: Number(properties?.total_luka || 0),
          total_terdampak: Number(properties?.total_terdampak || 0),
          jumlah_pengungsi: 0,
          jumlah_kejadian: Number(properties?.jumlah_kejadian || 0),
          rumah_rusak_berat: 0,
          rumah_rusak_sedang: 0,
          rumah_rusak_ringan: 0,
          fasilitas_umum_rusak: 0,
          fasilitas_kesehatan_rusak: 0,
          sekolah_rusak: 0,
          tingkat_risiko: properties?.tingkat_risiko || 'rendah',
          kejadian_terbaru: []
        });
      })
      .finally(() => {
        setLoadingDampak(false);
      });
  };

  // Helper memuat garis batas kecamatan di dalam suatu kota/kabupaten terpilih
  const loadKotaBoundaries = async (kotaNama: string, kotaId?: number) => {
    try {
      // 1. Panggil API backend GeoJSON batas kecamatan
      const queryParam = kotaId ? `parent_id=${kotaId}` : `search=${encodeURIComponent(kotaNama)}`;
      const res = await fetch(`/api/wilayah/geojson?level=kecamatan&${queryParam}`);
      if (res.ok) {
        const geojson = await res.json();
        if (geojson && geojson.features && geojson.features.length > 0) {
          setSelectedKotaBoundaries(geojson);
          return;
        }
      }

      // 2. Fallback tangguh ke dataset statis 181 kecamatan Sumatera Barat
      const staticRes = await fetch('/data/sumbar_kecamatan.geojson');
      if (staticRes.ok) {
        const allKec = await staticRes.json();
        const cleanKota = kotaNama.toLowerCase().replace('kota ', '').replace('kabupaten ', '').trim();
        const filtered = (allKec.features || []).filter((f: any) => {
          const kab = String(f.properties?.kabupaten || f.properties?.adm2 || '').toLowerCase();
          return kab.includes(cleanKota) || cleanKota.includes(kab);
        });
        if (filtered.length > 0) {
          setSelectedKotaBoundaries({ type: 'FeatureCollection', features: filtered });
          return;
        }
      }
    } catch (err) {
      console.warn('Gagal memuat batas kecamatan:', err);
    }
  };

  // 5b. Handler Pemilihan Kota / Kabupaten (Direct flyTo & Munculkan Garis Batas Seluruh Kecamatannya)
  const handleSelectKota = (kota: KotaKabupatenItem) => {
    setActiveKotaInfo(kota);
    setActiveKecamatanInfo(null);
    setIsLayerControlOpen(false);

    // 1. Direct flyTo ke lokasi Kota/Kabupaten
    setFlyToCoords({ lat: kota.lat, lng: kota.lon, zoom: 11.5 });

    // 2. Memuat batas seluruh kecamatan di dalam kabupaten/kota tersebut (Garis tempat lain di-hide)
    loadKotaBoundaries(kota.nama, kota.id);

    // 3. Tampilkan ringkasan data kota di WilayahPanel
    setSelectedWilayahId(kota.id);
    setLoadingDampak(true);
    fetch(`/api/wilayah/${kota.id}/dampak`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WilayahDampakData) => {
        setWilayahDampak(data);
      })
      .catch(() => {
        setWilayahDampak({
          wilayah_id: kota.id,
          nama: kota.nama,
          parent_nama: 'Provinsi Sumatera Barat',
          total_kerugian: 0,
          total_meninggal: 0,
          total_luka: 0,
          total_terdampak: 0,
          jumlah_pengungsi: 0,
          jumlah_kejadian: 0,
          rumah_rusak_berat: 0,
          rumah_rusak_sedang: 0,
          rumah_rusak_ringan: 0,
          fasilitas_umum_rusak: 0,
          fasilitas_kesehatan_rusak: 0,
          sekolah_rusak: 0,
          tingkat_risiko: 'sedang',
          kejadian_terbaru: []
        });
      })
      .finally(() => setLoadingDampak(false));
  };

  // 5c. Handler Pemilihan Kecamatan Spesifik (Direct flyTo & Highlight Batas Kecamatan)
  const handleSelectKecamatan = (id: number, nama: string, properties?: any) => {
    setActiveKecamatanInfo({ id, nama });

    // FIX: Selalu arahkan kamera ke kecamatan dengan zoom presisi (12.5-13.5)
    const lat = properties?.lat || properties?.center_lat || properties?.y;
    const lon = properties?.lon || properties?.center_lon || properties?.x;
    if (lat && lon) {
      setFlyToCoords({ lat: Number(lat), lng: Number(lon), zoom: 13.0 });
    }

    // FIX: Load batas kecamatan dari kabupaten induk
    // Coba gunakan id_kota atau parent_id jika tersedia (lebih presisi daripada string nama)
    const parentId = properties?.parent_id;
    const parentNama = properties?.parent_nama || properties?.kabupaten;
    if (parentId || parentNama) {
      loadKotaBoundaries(parentNama || '', parentId);
    } else {
      // Fallback: cari di allKecamatanFeatures berdasarkan id kecamatan
      const found = allKecamatanFeatures.find((f: any) => String(f.properties.id) === String(id));
      if (found) {
        const kab = found.properties.parent_nama || found.properties.kabupaten;
        const kabId = found.properties.parent_id;
        if (kab || kabId) {
          loadKotaBoundaries(kab || '', kabId);
        }
      }
    }

    // Panggil lookup dampak kecamatan
    handleSelectWilayah(id, {
      ...properties,
      lat: lat || properties?.lat,
      lon: lon || properties?.lon,
    });
  };

  // Handler Reset Seluruh Filter Wilayah & Peta
  const handleResetAllFilters = () => {
    setSelectedJenis('semua');
    setSelectedTahun('semua');
    setSearchQuery('');
    setSelectedKotaBoundaries(null);
    setActiveKotaInfo(null);
    setActiveKecamatanInfo(null);
    setSelectedWilayahId(null);
    setWilayahDampak(null);
    setFlyToCoords({ lat: -0.85, lng: 100.4172, zoom: 8.4 });
  };

  // Handler Tutup Panel Wilayah
  const handleCloseWilayahPanel = () => {
    setSelectedWilayahId(null);
    setWilayahDampak(null);
    setActiveKecamatanInfo(null);
  };

  // ==========================================
  // FITUR UTAMA: EVAKUASI MULTI-ALUR (ALUR A TSUNAMI vs ALUR B NON-TSUNAMI)
  // ==========================================
  const hitungRute = (
    lat?: number, 
    lon?: number, 
    targetModa: 'mobil' | 'jalan_kaki' = evakuasiModa,
    kecamatanId?: number | string,
    targetJenisBencana?: string
  ) => {
    setLoadingEvakuasi(true);
    if (lat !== undefined && lon !== undefined) {
      setUserCoords({ lat, lng: lon });
    }
    if (targetModa) {
      setEvakuasiModa(targetModa);
    }

    const jenisToUse = targetJenisBencana || (selectedJenis === 'semua' ? 'gempa' : selectedJenis);

    const payload: any = {
      moda: targetModa,
      jenis_bencana: jenisToUse,
    };
    if (lat !== undefined && lon !== undefined) {
      payload.lat = lat;
      payload.lon = lon;
    }
    if (kecamatanId !== undefined) {
      payload.kecamatan_id = kecamatanId;
    }

    fetch('/api/routing/evakuasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gagal menghitung rute evakuasi');
        return res.json();
      })
      .then((data: EvakuasiRouteData) => {
        setRouteData(data);
        if (data.posko) {
          setPoskoCoords({
            lat: data.posko.lat,
            lng: data.posko.lon,
            nama: data.posko.nama
          });
        }
        // Jika koordinat rute tersedia dan userCoords belum ada, set userCoords dari koordinat awal geometri
        if ((lat === undefined || lon === undefined) && data.geometry?.coordinates?.length > 0) {
          const firstCoord = data.geometry.coordinates[0];
          setUserCoords({ lat: firstCoord[1], lng: firstCoord[0] });
        }
        // Tutup panel drill-down dan modal evakuasi agar peta dan rute fokus
        setSelectedWilayahId(null);
        setWilayahDampak(null);
        setIsEvakuasiModalOpen(false);

        // Arahkan kamera peta ke lokasi posko/shelter tujuan
        if (data.posko) {
          setFlyToCoords({ lat: data.posko.lat, lng: data.posko.lon, zoom: 14 });
        }
      })
      .catch((err) => {
        alert(`Peringatan Navigasi Evakuasi: ${err.message || 'Server routing sedang sibuk.'}`);
      })
      .finally(() => {
        setLoadingEvakuasi(false);
      });
  };

  const handleStartEvakuasiFromModal = (params: EvakuasiStartParams) => {
    hitungRute(params.lat, params.lon, params.moda, params.kecamatan_id, params.jenis_bencana);
  };

  const handleEvakuasiSekarang = (targetModa: 'mobil' | 'jalan_kaki' = evakuasiModa) => {
    // Minta koordinat GPS pengguna via Geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          hitungRute(pos.coords.latitude, pos.coords.longitude, targetModa);
        },
        (err) => {
          console.warn('Izin GPS ditolak atau tidak tersedia, menggunakan koordinat pusat Padang Barat (Simulasi):', err.message);
          // Fallback realistis: Padang Barat (-0.9471, 100.3543)
          hitungRute(-0.9471, 100.3543, targetModa);
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      hitungRute(-0.9471, 100.3543, targetModa);
    }
  };

  const handleLocationPicked = (c: { lat: number; lng: number }) => {
    setIsPickingLocationOnMap(false);
    if (pickingTarget === 'posko' || pickingTarget === 'bencana') {
      setPickedOperatorCoords(c);
      setIsOperatorModalOpen(true);
    } else {
      hitungRute(c.lat, c.lng, evakuasiModa);
    }
    setPickingTarget(null);
  };

  // Batalkan penentuan titik atau tutup menu jika menekan Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEvakuasiMenuOpen) {
          setIsEvakuasiMenuOpen(false);
        }
        if (isPickingLocationOnMap) {
          setIsPickingLocationOnMap(false);
          if (pickingTarget === 'posko' || pickingTarget === 'bencana') {
            setIsOperatorModalOpen(true);
          }
          setPickingTarget(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPickingLocationOnMap, pickingTarget, isEvakuasiMenuOpen]);

  const handleToggleModa = (moda: 'mobil' | 'jalan_kaki') => {
    setEvakuasiModa(moda);
    if (routeData && userCoords) {
      hitungRute(userCoords.lat, userCoords.lng, moda);
    }
  };

  const handleLoginSuccess = (user: UserSession, token: string) => {
    setCurrentUser(user);
    localStorage.setItem('gis_user', JSON.stringify(user));
    localStorage.setItem('gis_auth_token', token);
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('gis_user');
    localStorage.removeItem('gis_auth_token');
    setIsOperatorModalOpen(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0F1720] font-body text-slate-100 select-none">
      {/* PWA Indikator Status Offline (Fase 4) */}
      <OfflineBanner />

      {/* 1. HEADER UTAMA (Overlay Tipis Elegan di Atas Peta) */}
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-2 sm:p-3 md:p-4 flex items-center justify-between gap-2">
        {/* Identitas Kolaborasi Resmi: BNPB, Pemprov Sumbar, & LPPM UPI YPTK */}
        <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3.5 bg-[#0B131D]/95 backdrop-blur-2xl px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-[#2B3E52] shadow-2xl transition-all shrink-0">
          {/* Trio Logo Resmi Instansi dengan Base Card Putih Kontras Tinggi */}
          <div className="flex items-center gap-1.5 sm:gap-2 pr-2.5 sm:pr-3.5 border-r border-[#243444] shrink-0">
            {/* Logo BNPB */}
            <div 
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-white shadow-sm border border-white/90 p-1 hover:scale-105 transition-transform" 
              title="Badan Nasional Penanggulangan Bencana (BNPB)"
            >
              <img
                src="/logos/bnpb.png"
                alt="Logo BNPB"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
            {/* Logo Pemprov Sumbar */}
            <div 
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-white shadow-sm border border-white/90 p-1 overflow-hidden hover:scale-105 transition-transform" 
              title="Pemerintah Provinsi Sumatera Barat (BPBD Sumbar)"
            >
              <img
                src="/logos/pemprov-sumbar.jpg"
                alt="Logo Pemprov Sumbar"
                className="w-full h-full object-contain rounded filter drop-shadow-xs"
              />
            </div>
            {/* Logo UPI YPTK Padang */}
            <div 
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-white shadow-sm border border-white/90 p-1 hover:scale-105 transition-transform" 
              title="Universitas Putra Indonesia YPTK Padang (Riset LPPM)"
            >
              <img
                src="/logos/upi-yptk.png"
                alt="Logo UPI YPTK"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
          </div>

          {/* Teks Identitas & Kredensial Resmi */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight text-white font-display uppercase truncate">
                GIS Kebencanaan
              </h1>
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                PROV. SUMBAR
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 hidden sm:inline-block" />
              <p className="text-[9px] sm:text-[10px] text-slate-300 font-mono tracking-tight hidden sm:block truncate max-w-[280px] md:max-w-none">
                BPBD Prov. Sumbar & Riset LPPM UPI YPTK
              </p>
            </div>
          </div>
        </div>

        {/* Ticker Informasi Gempa Terkini BMKG (Jika Tersedia) */}
        {gempaData && (
          <div 
            onClick={() => {
              if (gempaData.lat && gempaData.lon) {
                setLayerVisibility((prev) => ({ ...prev, gempa: true }));
                setFlyToCoords({ lat: gempaData.lat, lng: gempaData.lon, zoom: 7.5 });
              }
            }}
            className="pointer-events-auto hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0F1720]/90 backdrop-blur-md border border-rose-500/40 shadow-xl cursor-pointer hover:border-rose-400 transition-all group shrink-0"
            title="Klik untuk menerbangkan kamera ke titik pusat gempa BMKG"
          >
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute w-full h-full rounded-full bg-rose-500 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-rose-600" />
            </div>
            <div className="text-xs flex items-center">
              <span className="font-bold text-rose-400 font-display shrink-0">
                M{gempaData.magnitude}
              </span>
              <span className="text-slate-300 ml-1.5 font-sans truncate max-w-[180px] 2xl:max-w-[280px]" title={gempaData.wilayah_teks}>
                {gempaData.wilayah_teks}
              </span>
              {gempaData.potensi_tsunami && (
                <span className="ml-2 px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[9px] uppercase animate-pulse shrink-0">
                  TSUNAMI
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notifikasi Cepat: Jika Kamera Sedang Melihat Gempa di Luar Sumbar */}
        {flyToCoords && gempaData && flyToCoords.lat === gempaData.lat && (gempaData.lon > 102.5 || gempaData.lon < 98 || gempaData.lat < -3.5 || gempaData.lat > 0.8) && (
          <div className="pointer-events-auto hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131D27]/95 border border-amber-500/60 shadow-xl text-xs text-amber-200 animate-in fade-in">
            <span className="text-[11px]">Pusat gempa berada di luar Sumbar</span>
            <button
              onClick={() => setFlyToCoords({ lat: -0.85, lng: 100.4172, zoom: 8.4 })}
              className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition-colors"
            >
              Kembali ke Sumbar
            </button>
          </div>
        )}

        {/* Ticker Peringatan Cuaca Ekstrem BMKG & Galodo (Fase 5) */}
        {cuacaAlerts.length > 0 && (
          <div 
            onClick={() => setIsCuacaModalOpen(true)}
            className="pointer-events-auto hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1720]/90 backdrop-blur-md border border-amber-500/40 shadow-xl cursor-pointer hover:border-amber-400 hover:bg-amber-950/30 transition-all text-xs group shrink-0"
            title="Klik untuk melihat Detail Peringatan Cuaca Ekstrem & Potensi Banjir/Galodo"
          >
            <CloudLightning className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <div className="flex items-center gap-1.5 font-sans">
              <span className="font-bold text-amber-400 group-hover:text-amber-300">
                {cuacaAlerts[0].event || 'Cuaca Ekstrem'}
              </span>
              <span className="text-slate-300 text-[11px]">
                ({cuacaAlerts.length} Wilayah)
              </span>
            </div>
            <span className="ml-1 text-[10px] text-amber-400 font-mono underline opacity-80 group-hover:opacity-100">
              Detail &raquo;
            </span>
          </div>
        )}

        {/* Kontrol Kanan (Basemap Switcher, 3D Toggle, Layer Control, SITREP, Petugas RBAC, Server Status, Legenda) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Tombol Layer Control Panel (Fase 5) */}
          <button
            onClick={() => {
              setIsLayerControlOpen((prev) => {
                if (!prev) {
                  setSelectedWilayahId(null);
                  setWilayahDampak(null);
                }
                return !prev;
              });
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-semibold shadow-lg transition-all ${
              isLayerControlOpen
                ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                : 'bg-[#0F1720]/80 border-[#243444] text-slate-300 hover:text-white hover:bg-[#1B2733]'
            }`}
            title="Kontrol Lapisan Peta (Choropleth, Posko Pengungsi, TES Tsunami, Sirine, Cuaca BMKG)"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline font-mono">Layer</span>
          </button>

          {/* Tombol SITREP BNPB (Fase 5) */}
          <button
            onClick={() => setIsSitrepModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 backdrop-blur-md border border-rose-500/40 text-rose-200 text-xs font-semibold shadow-lg transition-all"
            title="Laporan Situasi Eksekutif (SITREP BNPB) & Ringkasan WhatsApp"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline font-mono">SITREP</span>
          </button>
          {/* Basemap Switcher: Satelit Rill (Gambar 2), Topografi, Gelap */}
          <div className="flex items-center bg-[#0F1720]/85 backdrop-blur-md rounded-xl p-1 border border-[#243444] shadow-xl">
            <button
              onClick={() => setStyleVariant('satelit')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                styleVariant === 'satelit'
                  ? 'bg-emerald-600/90 text-white shadow-md border border-emerald-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-[#1B2733]'
              }`}
              title="Peta Satelit Hibrida Rill (Citra Satelit Bumi Nyata & Label Wilayah)"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden xl:inline">Satelit</span>
            </button>
            <button
              onClick={() => setStyleVariant('terang')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                styleVariant === 'terang'
                  ? 'bg-amber-600/90 text-white shadow-md border border-amber-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-[#1B2733]'
              }`}
              title="Peta Topografi Berwarna & Kontur Alami"
            >
              <MapIcon className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden xl:inline">Topografi</span>
            </button>
            <button
              onClick={() => setStyleVariant('gelap')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                styleVariant === 'gelap'
                  ? 'bg-slate-700/90 text-white shadow-md border border-slate-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-[#1B2733]'
              }`}
              title="Mode Gelap Operasional Malam (Pusdalops)"
            >
              <Moon className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden xl:inline">Gelap</span>
            </button>
          </div>

          {/* Toggle 3D Terrain Elevasi (Default: 2D Ringan & Dingin) */}
          <button
            onClick={() => setIs3DTerrain((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-mono transition-all shadow-md ${
              is3DTerrain
                ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-amber-500/10'
                : 'bg-[#0F1720]/85 border-[#243444] text-slate-300 hover:text-white hover:bg-[#1B2733]'
            }`}
            title={is3DTerrain ? 'Matikan 3D Terrain (Kembali ke Mode 2D Ringan & Hemat Daya)' : 'Aktifkan 3D Terrain Elevasi (Membutuhkan komputasi GPU)'}
          >
            <Mountain className={`w-3.5 h-3.5 ${is3DTerrain ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden xl:inline">
              {is3DTerrain ? '3D Aktif' : 'Mode 2D'}
            </span>
          </button>

          {/* Tombol Login / Akses Petugas */}
          <button
            onClick={() => setIsOperatorModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-lg transition-all ${
              currentUser?.role === 'pimpinan'
                ? 'bg-amber-500/25 border-amber-400 text-amber-300 hover:bg-amber-500/35'
                : currentUser?.role === 'admin'
                ? 'bg-blue-600/25 border-blue-400 text-blue-300 hover:bg-blue-600/35'
                : currentUser?.role === 'operator'
                ? 'bg-emerald-600/25 border-emerald-400 text-emerald-300 hover:bg-emerald-600/35'
                : 'bg-[#0F1720]/80 border-[#243444] text-slate-300 hover:bg-[#1B2733] hover:text-white'
            }`}
          >
            <UserCheck className={`w-3.5 h-3.5 ${
              currentUser?.role === 'pimpinan' ? 'text-amber-300' : currentUser?.role === 'admin' ? 'text-blue-300' : 'text-emerald-400'
            }`} />
            <span className="hidden xl:inline font-mono whitespace-nowrap">
              {currentUser?.role === 'pimpinan'
                ? 'Pimpinan BPBD'
                : currentUser?.role === 'admin'
                ? 'Admin Pusdalops'
                : currentUser?.role === 'operator'
                ? 'Operator Padang'
                : 'Portal Petugas'}
            </span>
          </button>

          {/* Status Koneksi API */}
          <div 
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0F1720]/80 backdrop-blur-md border border-[#243444] text-xs font-mono text-slate-300 shadow-lg"
            title={`Status Backend: ${health?.status || 'Memeriksa...'}`}
          >
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>

          {/* Toggle Legenda GIS */}
          <button
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            className={`p-2 rounded-lg backdrop-blur-md border transition-all ${
              showInfoPanel
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-[#0F1720]/80 border-[#243444] text-slate-300 hover:text-white hover:bg-[#1B2733]'
            }`}
            title="Legenda & Status Sistem"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Banner Mode Penentuan Titik di Peta (Dinamis: Warga / Petugas) */}
      {isPickingLocationOnMap && (
        <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-2xl border-2 border-amber-300 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
          <Crosshair className="w-5 h-5 animate-spin shrink-0 text-slate-950" />
          <div className="text-xs sm:text-sm font-sans">
            {pickingTarget === 'posko' ? (
              <span><b>Mode Petugas:</b> Klik pada peta untuk menentukan koordinat lokasi Posko / Shelter TES / Sirine</span>
            ) : pickingTarget === 'bencana' ? (
              <span><b>Mode Petugas:</b> Klik pada peta untuk menentukan episentrum koordinat kejadian bencana</span>
            ) : (
              <span><b>Mode Navigasi:</b> Klik sembarang posisi di peta untuk menentukan lokasi awal evakuasi</span>
            )}
          </div>
          <button
            onClick={() => {
              setIsPickingLocationOnMap(false);
              if (pickingTarget === 'posko' || pickingTarget === 'bencana') {
                setIsOperatorModalOpen(true);
              }
              setPickingTarget(null);
            }}
            className="ml-2 px-3 py-1 text-xs rounded-xl bg-slate-950 text-amber-300 hover:bg-slate-900 border border-amber-400 font-mono transition-colors"
          >
            Batal (Esc)
          </button>
        </div>
      )}

      {/* 2. KANVAS PETA UTAMA (MAPLIBRE GL JS) */}
      <main className="w-full h-full">
        <MapCanvas
          selectedWilayahId={selectedWilayahId}
          selectedBoundariesGeoJSON={selectedKotaBoundaries}
          selectedKecamatanHighlightId={activeKecamatanInfo?.id || selectedWilayahId}
          flyToCoords={flyToCoords}
          routeGeometry={routeData?.geometry}
          userCoords={userCoords}
          poskoCoords={poskoCoords}
          jalanVersion={jalanVersion}
          poskoVersion={poskoVersion}
          gempaData={gempaData}
          styleVariant={styleVariant}
          is3DTerrain={is3DTerrain}
          layerVisibility={layerVisibility}
          isPickingLocation={isPickingLocationOnMap}
          onPickLocation={handleLocationPicked}
          onCoordinatesChange={(c) => setCoords(c)}
          onSelectWilayah={(id, props) => handleSelectWilayah(id, props)}
        />
      </main>

      {/* 3. PANEL FILTER & PENCARIAN (Sisi Kiri, Collapsible) */}
      <FilterPanel
        selectedJenis={selectedJenis}
        selectedTahun={selectedTahun}
        searchQuery={searchQuery}
        kecamatanList={kecamatanList}
        activeKotaNama={activeKotaInfo?.nama}
        activeKecamatanNama={activeKecamatanInfo?.nama}
        onJenisChange={setSelectedJenis}
        onTahunChange={setSelectedTahun}
        onSearchChange={setSearchQuery}
        onSelectKota={handleSelectKota}
        onSelectKecamatan={handleSelectKecamatan}
        onResetFilter={handleResetAllFilters}
      />

      {/* 4. PANEL DRILL-DOWN WILAYAH (Muncul Hanya Saat Ada Wilayah Dipilih) */}
      {selectedWilayahId !== null && (
        <WilayahPanel
          data={wilayahDampak}
          loading={loadingDampak}
          onClose={handleCloseWilayahPanel}
          onFocusRegion={() => {
            if (wilayahDampak?.center && typeof wilayahDampak.center.lat === 'number') {
              const isProv = selectedWilayahId === 1 || wilayahDampak.nama?.toLowerCase().includes('sumatera barat');
              setFlyToCoords({
                lat: wilayahDampak.center.lat,
                lng: wilayahDampak.center.lng,
                zoom: isProv ? 8.2 : 11.5
              });
            } else {
              const feat = choroplethFeatures.find((f: any) => f.properties?.id === selectedWilayahId);
              if (feat && feat.properties?.lat && feat.properties?.lon) {
                setFlyToCoords({ lat: feat.properties.lat, lng: feat.properties.lon, zoom: 11.5 });
              } else if (selectedWilayahId === 1 || wilayahDampak?.nama?.toLowerCase().includes('sumatera barat')) {
                setFlyToCoords({ lat: -0.85, lng: 100.4172, zoom: 8.2 });
              }
            }
          }}
          onStartEvakuasiRoute={(posko) => {
            // Tutup panel wilayah dan mulai hitung rute ke posko terpilih
            setSelectedWilayahId(null);
            setWilayahDampak(null);
            hitungRute(
              userCoords?.lat,
              userCoords?.lng,
              evakuasiModa,
              typeof activeKecamatanInfo?.id === 'number' ? activeKecamatanInfo.id : undefined
            );
            // Set posko tujuan langsung
            setPoskoCoords({ lat: posko.lat, lng: posko.lng, nama: posko.nama });
            setFlyToCoords({ lat: posko.lat, lng: posko.lng, zoom: 14 });
          }}
        />
      )}


      {/* 5. GRAFIK STATISTIK ECHARTS (Floating Drawer Bawah-Kanan) */}
      <StatistikChart
        data={chartData}
        selectedWilayahId={selectedWilayahId}
        onSelectKecamatan={(id) => handleSelectWilayah(id)}
      />

      {/* 6. PANEL PANDUAN EVAKUASI TURN-BY-TURN (Google Maps Style) */}
      {routeData && (
        <RouteInstructions
          routeData={routeData}
          currentModa={evakuasiModa}
          onToggleModa={handleToggleModa}
          onPickNewLocation={() => {
            setPickingTarget('evakuasi');
            setIsPickingLocationOnMap(true);
          }}
          onClose={() => {
            setRouteData(null);
            setUserCoords(null);
            setPoskoCoords(null);
          }}
        />
      )}

      {/* 7. MODAL OPERATOR & PUSDALOPS PB (PUSAT KOMANDO OPERASIONAL) */}
      <OperatorModal
        isOpen={isOperatorModalOpen}
        onClose={() => {
          setIsOperatorModalOpen(false);
          setPickingTarget(null);
        }}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        pickedCoords={pickedOperatorCoords}
        onPoskoChanged={() => {
          setPoskoVersion((v) => v + 1);
        }}
        onBencanaChanged={() => {
          setBencanaVersion((v) => v + 1);
        }}
        onJalanCreated={() => {
          setJalanVersion((v) => v + 1);
        }}
        onRequestPickLocation={(target) => {
          setPickingTarget(target);
          setIsPickingLocationOnMap(true);
          setIsOperatorModalOpen(false);
        }}
      />

      {/* 8. MODAL INFORMASI ARSITEKTUR & LEGENDA */}
      {showInfoPanel && (
        <aside className="absolute top-16 right-4 z-40 w-84 bg-[#1B2733]/95 backdrop-blur-xl border border-[#2D3F52] rounded-xl shadow-2xl p-4 flex flex-col gap-3 text-slate-200 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-[#2D3F52] pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-200 font-display">
                Legenda & Arsitektur GIS
              </h2>
            </div>
            <button
              onClick={() => setShowInfoPanel(false)}
              className="text-slate-400 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded hover:bg-[#243444]"
            >
              &times;
            </button>
          </div>

          <div className="text-xs space-y-3">
            {/* Klasifikasi Warna Choropleth */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Skala Risiko & Kerugian (Choropleth)
              </span>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3.5 h-3.5 rounded bg-[#C0392B] shrink-0" />
                  <span className="text-slate-300">Tinggi (&gt; Rp 1,5 Miliar / Korban Jiwa)</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3.5 h-3.5 rounded bg-[#D98E04] shrink-0" />
                  <span className="text-slate-300">Sedang (Rp 400 Jt – 1,5 Miliar)</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3.5 h-3.5 rounded bg-[#1E7A46] shrink-0" />
                  <span className="text-slate-300">Rendah / Aman (&lt; Rp 400 Jt)</span>
                </div>
              </div>
            </div>

            {/* Simbol Lapisan Fasilitas & Bencana */}
            <div className="space-y-1.5 border-t border-[#2D3F52] pt-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Lapisan Peta & Fasilitas Keselamatan
              </span>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3.5 h-3.5 rounded bg-[#EA580C] border border-white/80 shrink-0" />
                  <span className="text-slate-300">Posko Pengungsi ({facilityCounts.posko} Titik - 11 Kantor Camat)</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3.5 h-3.5 rounded bg-[#0284C7] border border-white/80 shrink-0" />
                  <span className="text-slate-300">Shelter TES Vertikal Tsunami ({facilityCounts.tes} Gedung)</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3.5 h-3.5 rounded bg-[#D97706] border border-white/80 shrink-0" />
                  <span className="text-slate-300">Sirine EWS Tsunami BPBD ({facilityCounts.sirine} Unit)</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-4 h-0.5 border-b-2 border-dashed border-rose-500 shrink-0" />
                  <span className="text-slate-300">Ruas Jalan Terputus (Blokade)</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3 h-3 rounded-full bg-rose-600 border border-white shrink-0" />
                  <span className="text-slate-300">Episentrum Gempa BMKG Real-time</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 9. MODAL SITREP BNPB (Fase 5) */}
      <SitrepModal
        isOpen={isSitrepModalOpen}
        onClose={() => setIsSitrepModalOpen(false)}
      />

      {/* 10. LAYER CONTROL PANEL (Fase 5) */}
      <LayerControlPanel
        isOpen={isLayerControlOpen}
        onClose={() => setIsLayerControlOpen(false)}
        visibility={layerVisibility}
        onToggleLayer={(key) =>
          setLayerVisibility((prev) => {
            const nextVal = !prev[key];
            if (key === 'gempa' && nextVal && gempaData?.lat && gempaData?.lon) {
              setFlyToCoords({ lat: gempaData.lat, lng: gempaData.lon, zoom: 7.5 });
            }
            return { ...prev, [key]: nextVal };
          })
        }
        gempaData={gempaData}
        onFocusGempa={() => {
          if (gempaData?.lat && gempaData?.lon) {
            setLayerVisibility((prev) => ({ ...prev, gempa: true }));
            setFlyToCoords({ lat: gempaData.lat, lng: gempaData.lon, zoom: 7.5 });
            setIsLayerControlOpen(false);
          }
        }}
        onToggleAll={(enable) => {
          setLayerVisibility({
            choropleth: enable,
            poskoEvakuasi: enable,
            shelterTes: enable,
            sirineTsunami: enable,
            jalanTerputus: enable,
            gempa: enable,
            cuaca: enable,
            sesarSemangko: enable,
            sesarBuffer: enable,
            megathrust: enable,
            zonaTsunami: enable,
            tsunamiRunup: enable,
          });
          if (!enable) {
            setSelectedWilayahId(null);
            setWilayahDampak(null);
          }
        }}
        tesCount={facilityCounts.tes}
        sirineCount={facilityCounts.sirine}
        poskoCount={facilityCounts.posko}
      />

      {/* 11. MODAL DETAIL PERINGATAN CUACA BMKG & GALODO */}
      <CuacaAlertModal
        isOpen={isCuacaModalOpen}
        onClose={() => setIsCuacaModalOpen(false)}
        alerts={cuacaAlerts}
        onFlyToArea={(lat, lng) => setFlyToCoords({ lat, lng, zoom: 12.5 })}
      />

      {/* 12. MODAL PANDUAN EVAKUASI MULTI-ALUR (ALUR A TSUNAMI vs ALUR B NON-TSUNAMI) */}
      <EvakuasiModal
        isOpen={isEvakuasiModalOpen}
        onClose={() => setIsEvakuasiModalOpen(false)}
        onStartEvakuasi={handleStartEvakuasiFromModal}
        loading={loadingEvakuasi}
        defaultJenisBencana={selectedJenis}
        userCoords={userCoords}
        onPickLocationOnMap={() => {
          setIsEvakuasiModalOpen(false);
          setPickingTarget('evakuasi');
          setIsPickingLocationOnMap(true);
        }}
        onFlyToLocation={(loc) => setFlyToCoords(loc)}
        onSelectDestination={(loc) => {
          setFlyToCoords({ lat: loc.lat, lng: loc.lng, zoom: 15.5 });
        }}
      />

      {/* 13. BOTTOM BAR (Aksi Utama Evakuasi & Telemetri Realtime) */}
      <footer className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none flex items-center justify-between gap-4">
        {/* Unified Emergency Evacuation Hub (Pusat Aksi Evakuasi Darurat) */}
        <div className="pointer-events-auto relative flex items-center bg-[#0B131D]/95 backdrop-blur-2xl p-1 sm:p-1.5 rounded-2xl border border-[#2F445A] shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          {/* Kondisi 1: Sedang dalam Mode Penentuan Titik Asal di Peta */}
          {isPickingLocationOnMap ? (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/40 ring-2 ring-amber-300">
              <Crosshair className="w-4 h-4 animate-spin text-slate-950" />
              <div className="flex flex-col">
                <span className="text-xs font-display uppercase tracking-wider font-extrabold leading-tight">
                  Tentukan Titik di Peta
                </span>
                <span className="text-[10px] font-sans text-slate-900 leading-tight">
                  Klik lokasi awal Anda di peta
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPickingLocationOnMap(false);
                  setPickingTarget(null);
                }}
                className="ml-2 px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 hover:bg-slate-900 text-xs font-mono transition-colors border border-amber-400/50"
                title="Batalkan penentuan titik (Esc)"
              >
                ✕ Batal
              </button>
            </div>
          ) : routeData ? (
            /* Kondisi 2: Rute Navigasi Aktif */
            <div className="flex items-center gap-2 px-1">
              <button
                onClick={() => {
                  if (routeData.posko) {
                    setFlyToCoords({ lat: routeData.posko.lat, lng: routeData.posko.lon, zoom: 14 });
                  }
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold tracking-wide bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                title="Fokuskan Peta ke Shelter Tujuan Rute"
              >
                <Navigation className="w-4 h-4 text-white animate-pulse" />
                <span className="text-xs font-display uppercase tracking-wider">
                  Rute Aktif (~{routeData.estimasi_menit} mnt)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-emerald-200 border border-emerald-400/30">
                  {routeData.jarak_km} km
                </span>
              </button>
              <button
                onClick={() => {
                  setRouteData(null);
                  setUserCoords(null);
                  setPoskoCoords(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
                title="Tutup / Batalkan Rute Navigasi"
              >
                <span className="text-xs font-mono font-bold">✕ Tutup</span>
              </button>
            </div>
          ) : (
            /* Kondisi 3: Keadaan Siaga (Idle) — Satu Tombol Evakuasi Terpadu dengan Menu Asal & Moda */
            <div className="relative flex items-center">
              {/* Flyout Menu Terpadu (Pilih GPS vs Titik di Peta & Moda) */}
              {isEvakuasiMenuOpen && (
                <div className="absolute bottom-full left-0 mb-3 w-76 p-3 rounded-2xl bg-[#0B131D]/98 backdrop-blur-2xl border border-[#2F445A] shadow-2xl space-y-2.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-1 py-0.5 border-b border-[#243444] pb-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-rose-500" />
                        Pusat Aksi Evakuasi
                      </div>
                      <div className="text-[10px] text-slate-400">Pilih metode penentuan lokasi asal</div>
                    </div>
                    <button
                      onClick={() => setIsEvakuasiMenuOpen(false)}
                      className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-white/10"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Opsi A: Buka Dialog Panduan & Filter Wilayah Cascading */}
                  <button
                    onClick={() => {
                      setIsEvakuasiMenuOpen(false);
                      setIsEvakuasiModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#131E2A] hover:bg-[#1C2C3E] border border-rose-500/30 hover:border-rose-500 text-slate-200 transition-all group text-left"
                  >
                    <div className="p-2 rounded-xl bg-rose-600/20 text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                        Panduan & Filter Wilayah
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Pilih Kab/Kota, Kecamatan, atau Alur Bencana
                      </div>
                    </div>
                  </button>

                  {/* Opsi B: GPS Otomatis Cepat */}
                  <button
                    onClick={() => {
                      setIsEvakuasiMenuOpen(false);
                      handleEvakuasiSekarang(evakuasiModa);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#131E2A] hover:bg-[#1C2C3E] border border-[#233547] hover:border-emerald-500/40 text-slate-200 transition-all group text-left"
                  >
                    <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        Lokasi Saya (GPS Cepat)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Deteksi otomatis koordinat perangkat Anda
                      </div>
                    </div>
                  </button>

                  {/* Opsi C: Tentukan di Peta (PILIH DI PETA TERINTEGRASI) */}
                  <button
                    onClick={() => {
                      setIsEvakuasiMenuOpen(false);
                      setPickingTarget('evakuasi');
                      setIsPickingLocationOnMap(true);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-[#131E2A] hover:bg-[#1C2C3E] border border-[#233547] hover:border-amber-500/40 text-slate-200 transition-all group text-left"
                  >
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shrink-0">
                      <Crosshair className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Tentukan Titik di Peta
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Klik bebas di peta untuk simulasi rute
                      </div>
                    </div>
                  </button>

                  {/* Pilihan Cepat Moda Evakuasi */}
                  <div className="pt-2 border-t border-[#243444] space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold block px-1">
                      Moda Transportasi:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 bg-[#090E14] p-1 rounded-xl border border-[#243444]">
                      <button
                        onClick={() => handleToggleModa('mobil')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          evakuasiModa === 'mobil'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        🚗 Mobil
                      </button>
                      <button
                        onClick={() => handleToggleModa('jalan_kaki')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          evakuasiModa === 'jalan_kaki'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        🏃 Kaki (TES)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tombol Utama: Eksekusi Cepat / Buka Panduan Evakuasi */}
              <button
                onClick={() => setIsEvakuasiModalOpen(true)}
                disabled={loadingEvakuasi}
                className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-l-xl font-bold tracking-wider transition-all duration-200 bg-gradient-to-r from-[#DC2626] via-[#E11D48] to-[#EF4444] hover:from-[#B91C1C] hover:to-[#DC2626] text-white shadow-lg shadow-rose-950/50 hover:shadow-rose-600/50 active:scale-98 border-r border-red-700/60"
                title="Buka Pusat Evakuasi Multi-Alur (Tsunami vs Non-Tsunami & Filter Wilayah)"
              >
                {loadingEvakuasi ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs sm:text-sm font-display uppercase tracking-wider font-extrabold">
                      Mencari Rute...
                    </span>
                  </>
                ) : (
                  <>
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-3 h-3 rounded-full bg-amber-400 animate-ping opacity-60" />
                      <Compass className="relative w-4 h-4 text-amber-300" />
                    </div>
                    <span className="text-xs sm:text-sm font-display uppercase tracking-wider font-extrabold">
                      Evakuasi Sekarang
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/30 text-amber-200 border border-amber-300/30 font-semibold hidden xs:inline-block">
                      {evakuasiModa === 'mobil' ? '🚗 Mobil' : '🏃 TES'}
                    </span>
                  </>
                )}
              </button>

              {/* Tombol Pembuka Menu Opsi Evakuasi (Titik di Peta & Moda) */}
              <button
                onClick={() => setIsEvakuasiMenuOpen(!isEvakuasiMenuOpen)}
                className="px-2.5 sm:px-3 py-2.5 rounded-r-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white hover:text-amber-200 transition-colors shadow-lg shadow-rose-950/50 flex items-center justify-center"
                title="Opsi Titik Asal & Pilihan Moda Evakuasi"
              >
                <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${isEvakuasiMenuOpen ? 'rotate-180 text-amber-300' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Mini Legenda Risiko Choropleth */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0F1720]/85 backdrop-blur-md border border-[#243444] text-[11px] font-mono shadow-lg">
          <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Risiko:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#C0392B]" />
            <span className="text-slate-300">&gt;1,5M</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#D98E04]" />
            <span className="text-slate-300">400Jt–1,5M</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1E7A46]" />
            <span className="text-slate-300">&lt;400Jt</span>
          </div>
        </div>

        {/* Telemetri Koordinat Kursor Peta */}
        <div className="pointer-events-auto hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#0F1720]/80 backdrop-blur-md border border-[#243444] text-[11px] font-mono text-slate-400 shadow-lg">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>KURSOR:</span>
            <span className="text-slate-200">
              {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
            </span>
          </div>
          <span className="text-slate-600">&bull;</span>
          <div>
            <span>ZOOM:</span> <span className="text-slate-200">{coords.zoom}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
