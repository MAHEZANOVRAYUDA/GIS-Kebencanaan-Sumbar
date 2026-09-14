import { useState, useEffect, useMemo } from 'react';
import { MapCanvas, type GempaInfo } from './features/map/MapCanvas';
import { WilayahPanel, type WilayahDampakData } from './features/telusuri-bencana/WilayahPanel';
import { StatistikChart, type KecamatanStatItem } from './features/telusuri-bencana/StatistikChart';
import { FilterPanel } from './features/filter/FilterPanel';
import { RouteInstructions, type EvakuasiRouteData } from './features/evakuasi/RouteInstructions';
import { OperatorModal, type UserSession } from './features/operator/OperatorModal';
import { OfflineBanner } from './features/pwa/OfflineBanner';
import { LayerControlPanel, type LayerVisibilityState } from './features/map/LayerControlPanel';
import { SitrepModal } from './features/sitrep/SitrepModal';
import { CuacaAlertModal } from './features/cuaca/CuacaAlertModal';
import { 
  ShieldAlert, 
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
  CloudLightning
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

  // State Data Wilayah Terpilih (Drill-Down "Telusuri Bencana")
  const [selectedWilayahId, setSelectedWilayahId] = useState<number | null>(null);
  const [wilayahDampak, setWilayahDampak] = useState<WilayahDampakData | null>(null);
  const [loadingDampak, setLoadingDampak] = useState(false);
  const [flyToCoords, setFlyToCoords] = useState<{ lat: number; lng: number } | null>(null);

  // State Daftar Kecamatan & Data Statistik Choropleth
  const [choroplethFeatures, setChoroplethFeatures] = useState<any[]>([]);

  // ==========================================
  // STATE FASE 3: Evakuasi, BMKG, RBAC Operator
  // ==========================================
  const [routeData, setRouteData] = useState<EvakuasiRouteData | null>(null);
  const [loadingEvakuasi, setLoadingEvakuasi] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [poskoCoords, setPoskoCoords] = useState<{ lat: number; lng: number; nama?: string } | null>(null);
  const [jalanVersion, setJalanVersion] = useState(0);

  // Gempa Real-Time BMKG
  const [gempaData, setGempaData] = useState<GempaInfo | null>(null);

  // RBAC Petugas/Operator
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);

  // ==========================================
  // STATE FASE 5: Mitigasi, SITREP, Cuaca, Layer Kontrol
  // ==========================================
  const [isSitrepModalOpen, setIsSitrepModalOpen] = useState(false);
  const [isLayerControlOpen, setIsLayerControlOpen] = useState(false);
  const [isCuacaModalOpen, setIsCuacaModalOpen] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibilityState>({
    choropleth: true,
    shelterTes: true,
    sirineTsunami: true,
    jalanTerputus: true,
    gempa: true,
    cuaca: true,
  });
  const [evakuasiModa, setEvakuasiModa] = useState<'mobil' | 'jalan_kaki'>('mobil');
  const [cuacaAlerts, setCuacaAlerts] = useState<any[]>([]);

  // 1. Cek Koneksi Backend API & Database
  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'offline', database: 'disconnected' }));

    // Cek Sesi Login Tersimpan
    const savedUser = localStorage.getItem('gis_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {}
    }
  }, []);

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

  // 4. Muat Data Fitur Choropleth untuk ECharts & Pencarian
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
  }, [choroplethUrl]);

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
  const kecamatanList = useMemo(() => {
    return choroplethFeatures.map((f: any) => ({
      id: f.properties.id,
      nama: f.properties.nama,
      parent_nama: f.properties.parent_nama,
    }));
  }, [choroplethFeatures]);

  // 5. Handler Pemilihan Wilayah (Klik Peta / Klik Grafik / Hasil Pencarian)
  const handleSelectWilayah = (wilayahId: number, properties?: any) => {
    setSelectedWilayahId(wilayahId);
    setLoadingDampak(true);

    fetch(`/api/wilayah/${wilayahId}/dampak`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WilayahDampakData) => {
        setWilayahDampak(data);
      })
      .catch(() => {
        if (properties) {
          setWilayahDampak({
            wilayah_id: properties.id,
            nama: properties.nama,
            parent_nama: properties.parent_nama,
            total_kerugian: properties.total_kerugian || 0,
            total_meninggal: properties.total_meninggal || 0,
            total_luka: properties.total_luka || 0,
            total_terdampak: properties.total_terdampak || 0,
            jumlah_pengungsi: 0,
            jumlah_kejadian: properties.jumlah_kejadian || 0,
            rumah_rusak_berat: 0,
            rumah_rusak_sedang: 0,
            rumah_rusak_ringan: 0,
            fasilitas_umum_rusak: 0,
            fasilitas_kesehatan_rusak: 0,
            sekolah_rusak: 0,
            tingkat_risiko: properties.tingkat_risiko || 'rendah',
            kejadian_terbaru: []
          });
        }
      })
      .finally(() => {
        setLoadingDampak(false);
      });

    // Jika fitur punya koordinat center/centroid, arahkan peta
    if (properties && properties.lat && properties.lon) {
      setFlyToCoords({ lat: properties.lat, lng: properties.lon });
    }
  };

  // ==========================================
  // FITUR UTAMA: EVAKUASI MULTI-MODA (MOBIL / JALAN KAKI)
  // ==========================================
  const handleEvakuasiSekarang = (targetModa: 'mobil' | 'jalan_kaki' = evakuasiModa) => {
    setLoadingEvakuasi(true);

    const hitungRute = (lat: number, lon: number) => {
      setUserCoords({ lat, lng: lon });

      fetch('/api/routing/evakuasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, moda: targetModa })
      })
        .then((res) => {
          if (!res.ok) throw new Error('Gagal menghitung rute evakuasi');
          return res.json();
        })
        .then((data: EvakuasiRouteData) => {
          setRouteData(data);
          setPoskoCoords({
            lat: data.posko.lat,
            lng: data.posko.lon,
            nama: data.posko.nama
          });
          // Tutup panel drill-down agar fokus navigasi evakuasi
          setSelectedWilayahId(null);
        })
        .catch((err) => {
          alert(`Peringatan Navigasi Evakuasi: ${err.message || 'Server routing sedang sibuk.'}`);
        })
        .finally(() => {
          setLoadingEvakuasi(false);
        });
    };

    // Minta koordinat GPS pengguna via Geolocation API
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          hitungRute(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Izin GPS ditolak atau tidak tersedia, menggunakan koordinat pusat Padang Barat (Simulasi):', err.message);
          // Fallback realistis: Padang Barat (-0.9471, 100.3543)
          hitungRute(-0.9471, 100.3543);
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      hitungRute(-0.9471, 100.3543);
    }
  };

  const handleToggleModa = (moda: 'mobil' | 'jalan_kaki') => {
    setEvakuasiModa(moda);
    if (routeData && userCoords) {
      handleEvakuasiSekarang(moda);
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
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-4 flex items-center justify-between">
        {/* Identitas BPBD & LPPM */}
        <div className="pointer-events-auto flex items-center gap-3 bg-[#0F1720]/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#243444] shadow-xl">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white font-display">
                GIS KEBENCANAAN
              </h1>
              <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                SUMBAR
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              BPBD Prov. Sumbar & Riset LPPM UPI YPTK
            </p>
          </div>
        </div>

        {/* Ticker Informasi Gempa Terkini BMKG (Jika Tersedia) */}
        {gempaData && (
          <div 
            onClick={() => {
              if (gempaData.lat && gempaData.lon) {
                setFlyToCoords({ lat: gempaData.lat, lng: gempaData.lon });
              }
            }}
            className="pointer-events-auto hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0F1720]/90 backdrop-blur-md border border-rose-500/40 shadow-xl cursor-pointer hover:border-rose-400 transition-all group"
            title="Klik untuk fokus ke pusat gempa BMKG"
          >
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute w-full h-full rounded-full bg-rose-500 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-rose-600" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-rose-400 font-display">
                M{gempaData.magnitude}
              </span>
              <span className="text-slate-300 ml-1.5 font-sans">
                {gempaData.wilayah_teks}
              </span>
              {gempaData.potensi_tsunami && (
                <span className="ml-2 px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold text-[9px] uppercase animate-pulse">
                  TSUNAMI
                </span>
              )}
            </div>
          </div>
        )}

        {/* Ticker Peringatan Cuaca Ekstrem BMKG & Galodo (Fase 5) */}
        {cuacaAlerts.length > 0 && (
          <div 
            onClick={() => setIsCuacaModalOpen(true)}
            className="pointer-events-auto hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1720]/90 backdrop-blur-md border border-amber-500/40 shadow-xl cursor-pointer hover:border-amber-400 hover:bg-amber-950/30 transition-all text-xs group"
            title="Klik untuk melihat Detail Peringatan Cuaca Ekstrem & Potensi Banjir/Galodo"
          >
            <CloudLightning className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
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
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Tombol Layer Control Panel (Fase 5) */}
          <button
            onClick={() => setIsLayerControlOpen(!isLayerControlOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-semibold shadow-lg transition-all ${
              isLayerControlOpen
                ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                : 'bg-[#0F1720]/80 border-[#243444] text-slate-300 hover:text-white hover:bg-[#1B2733]'
            }`}
            title="Kontrol Lapisan Peta (Choropleth, TES Tsunami, Sirine, Cuaca BMKG)"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline font-mono">Layer</span>
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
              <span className="hidden sm:inline">Satelit</span>
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
              <span className="hidden sm:inline">Topografi</span>
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
              <span className="hidden sm:inline">Gelap</span>
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
            <span className="hidden md:inline">
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
            <span className="hidden sm:inline font-mono">
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

      {/* 2. KANVAS PETA UTAMA (MAPLIBRE GL JS) */}
      <main className="w-full h-full">
        <MapCanvas
          selectedWilayahId={selectedWilayahId}
          flyToCoords={flyToCoords}
          routeGeometry={routeData?.geometry}
          userCoords={userCoords}
          poskoCoords={poskoCoords}
          jalanVersion={jalanVersion}
          gempaData={gempaData}
          styleVariant={styleVariant}
          is3DTerrain={is3DTerrain}
          layerVisibility={layerVisibility}
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
        onJenisChange={setSelectedJenis}
        onTahunChange={setSelectedTahun}
        onSearchChange={setSearchQuery}
        onSelectSearchResult={(id: number) => handleSelectWilayah(id)}
        onResetFilter={() => {
          setSelectedJenis('semua');
          setSelectedTahun('semua');
          setSearchQuery('');
        }}
      />

      {/* 4. PANEL DRILL-DOWN WILAYAH (Muncul Hanya Saat Ada Wilayah Dipilih) */}
      <WilayahPanel
        data={wilayahDampak}
        loading={loadingDampak}
        onClose={() => setSelectedWilayahId(null)}
      />

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
          onClose={() => {
            setRouteData(null);
            setUserCoords(null);
            setPoskoCoords(null);
          }}
        />
      )}

      {/* 7. MODAL OPERATOR & RBAC */}
      <OperatorModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onJalanCreated={() => {
          setJalanVersion((v) => v + 1);
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
                Lapisan Peta & Mitigasi
              </span>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3 h-3 rounded-full bg-[#10B981] border border-white shrink-0" />
                  <span className="text-slate-300">Posko Evakuasi Standar (PostGIS)</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3 h-3 rounded-full bg-[#3B82F6] border border-white shrink-0" />
                  <span className="text-slate-300">Shelter Vertikal TES Tsunami (7 Titik)</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-[#0F1720]/50">
                  <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-white shrink-0" />
                  <span className="text-slate-300">Sirine EWS Tsunami BPBD (46 Titik)</span>
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
          setLayerVisibility((prev) => ({ ...prev, [key]: !prev[key] }))
        }
        tesCount={7}
        sirineCount={46}
      />

      {/* 11. MODAL DETAIL PERINGATAN CUACA BMKG & GALODO */}
      <CuacaAlertModal
        isOpen={isCuacaModalOpen}
        onClose={() => setIsCuacaModalOpen(false)}
        alertData={cuacaAlerts.length > 0 ? cuacaAlerts[0] : null}
        onFlyToArea={(lat, lng) => setFlyToCoords({ lat, lng })}
      />

      {/* 11. BOTTOM BAR (Aksi Utama Evakuasi & Telemetri Realtime) */}
      <footer className="absolute bottom-3 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
        {/* Tombol Call-to-Action Utama: EVAKUASI SEKARANG */}
        <div className="pointer-events-auto">
          <button
            onClick={() => handleEvakuasiSekarang(evakuasiModa)}
            disabled={loadingEvakuasi}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-bold tracking-wide shadow-2xl transition-all duration-300 transform active:scale-95 ${
              routeData
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-300 shadow-emerald-600/30'
                : 'bg-gradient-to-r from-[#C0392B] to-[#E74C3C] hover:from-[#A93226] hover:to-[#C0392B] text-white border border-rose-300/40 shadow-rose-900/40 hover:shadow-rose-600/50 hover:scale-105'
            }`}
            title="Hitung Rute Tercepat Menghindari Bencana ke Posko Terdekat"
          >
            {loadingEvakuasi ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-xs sm:text-sm font-display uppercase tracking-wider">
                  MENGHITUNG RUTE AMAN...
                </span>
              </>
            ) : routeData ? (
              <>
                <Navigation className="w-5 h-5 text-white animate-pulse" />
                <span className="text-xs sm:text-sm font-display uppercase tracking-wider">
                  NAVIGASI AKTIF (~{routeData.estimasi_menit} MNT)
                </span>
              </>
            ) : (
              <>
                <Compass className="w-5 h-5 text-amber-300 animate-bounce" />
                <span className="text-xs sm:text-sm font-display uppercase tracking-wider">
                  EVAKUASI SEKARANG
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 text-amber-200 border border-amber-300/30 font-normal">
                  PANDUAN POSKO
                </span>
              </>
            )}
          </button>
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
