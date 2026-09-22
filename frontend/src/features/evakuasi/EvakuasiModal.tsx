import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Waves, 
  AlertTriangle, 
  Navigation, 
  Crosshair, 
  X, 
  ShieldCheck, 
  Info, 
  Radio, 
  RefreshCw,
  MapPin,
  Bot
} from 'lucide-react';
import { DisasterChatbot } from '../bot/DisasterChatbot';

export interface EvakuasiStartParams {
  jenis_bencana: 'tsunami' | 'non_tsunami' | string;
  kecamatan_id?: number | string;
  kecamatan_nama?: string;
  lat?: number;
  lon?: number;
  moda: 'mobil' | 'jalan_kaki';
}

interface EvakuasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartEvakuasi: (params: EvakuasiStartParams) => void;
  loading: boolean;
  defaultJenisBencana?: string;
  userCoords?: { lat: number; lng: number } | null;
  onPickLocationOnMap?: () => void;
  onFlyToLocation?: (coords: { lat: number; lng: number; zoom?: number }) => void;
  onSelectDestination?: (loc: { lat: number; lng: number; nama: string }) => void;
}

export const EvakuasiModal: React.FC<EvakuasiModalProps> = ({
  isOpen,
  onClose,
  onStartEvakuasi,
  loading,
  defaultJenisBencana = 'tsunami',
  userCoords,
  onPickLocationOnMap,
  onFlyToLocation,
  onSelectDestination
}) => {
  const [activeTab, setActiveTab] = useState<'rute' | 'asisten'>('rute');
  // 1. Jenis Bencana: HANYA ADA DUA (Tsunami vs Non-Tsunami)
  const [jenisBencana, setJenisBencana] = useState<'tsunami' | 'non_tsunami'>(
    defaultJenisBencana.toLowerCase().includes('tsunami') ? 'tsunami' : 'non_tsunami'
  );
  const [bencanaAktifInfo, setBencanaAktifInfo] = useState<any>(null);

  // 2. Lokasi Pengguna
  const [useGps, setUseGps] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [detectedWilayahNama, setDetectedWilayahNama] = useState<string | null>(null);
  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number } | null>(
    userCoords ? { lat: userCoords.lat, lon: userCoords.lng } : null
  );

  // 3. Moda Transportasi
  const [selectedModa, setSelectedModa] = useState<'mobil' | 'jalan_kaki'>('mobil');

  // Klasifikasi Alur: Tsunami -> Alur A, Non-Tsunami -> Alur B
  const isAlurA = jenisBencana === 'tsunami';

  // Periksa sensor bencana aktif BMKG saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      if (userCoords) {
        setActiveCoords({ lat: userCoords.lat, lon: userCoords.lng });
      }

      fetch('/api/routing/bencana-aktif')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setBencanaAktifInfo(data);
            if (data.status_siaga === 'BAHAYA_TSUNAMI') {
              setJenisBencana('tsunami');
            } else if (data.status_siaga === 'SIAGA_GALODO' || data.status_siaga === 'WASPADA') {
              setJenisBencana('non_tsunami');
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, userCoords]);

  // Handler Deteksi GPS Otomatis
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      alert('Peramban tidak mendukung Geolocation API');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setActiveCoords({ lat, lon });
        setUseGps(true);

        try {
          const res = await fetch(`/api/wilayah/lookup?lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const lookup = await res.json();
            if (lookup && lookup.nama) {
              setDetectedWilayahNama(`Kecamatan ${lookup.nama}${lookup.parent_nama ? `, ${lookup.parent_nama}` : ''}`);
            }
          }
        } catch (e) {
          console.debug('Lookup error:', e);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        alert(`Gagal mendeteksi lokasi GPS: ${err.message}. Sistem akan menggunakan titik koordinat peta.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Submit Mulai Evakuasi
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartEvakuasi({
      jenis_bencana: jenisBencana,
      lat: activeCoords?.lat,
      lon: activeCoords?.lon,
      moda: selectedModa,
      kecamatan_nama: detectedWilayahNama || undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#0B131D]/98 border border-[#273B4F] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evakuasi-modal-title"
      >
        {/* Header Dialog */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#172331] via-[#0E1722] to-[#0B131D] border-b border-[#233547] flex items-start justify-between relative">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              isAlurA 
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
            }`}>
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-slate-700 font-bold">
                  SISTEM TANGGAP DARURAT RESMI
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-extrabold border ${
                  isAlurA 
                    ? 'bg-rose-950/80 text-rose-300 border-rose-600/50' 
                    : 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                }`}>
                  {isAlurA ? 'ALUR A — TSUNAMI' : 'ALUR B — NON-TSUNAMI'}
                </span>
              </div>
              <h2 id="evakuasi-modal-title" className="text-base sm:text-lg font-bold text-white font-display mt-1">
                Pusat Perintah & Navigasi Evakuasi Cepat
              </h2>
              <p className="text-xs text-slate-400">
                Pemerintah Provinsi Sumatera Barat & BNPB / BPBD Sumbar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Rute vs Asisten AI */}
        <div className="flex items-center border-b border-[#1E2E3E] bg-[#0E1722] px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('rute')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rute'
                ? 'border-rose-500 text-white font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Rute & Titik Kumpul</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('asisten')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer relative ${
              activeTab === 'asisten'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-cyan-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Asisten Siaga Evakuasi (AI)</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          </button>
        </div>

        {/* Tab 1: Alur Rute Standar */}
        {activeTab === 'rute' ? (
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* BANNER STATUS BENCANA AKTIF BMKG (Jika Ada) */}
          {bencanaAktifInfo && bencanaAktifInfo.status_siaga !== 'NORMAL_SIAGA' && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/40 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold text-rose-200 block text-xs">
                  {bencanaAktifInfo.keterangan}
                </span>
                <span className="text-[11px] text-rose-300/80">
                  Sistem otomatis merekomendasikan mode keselamatan: {bencanaAktifInfo.alur_rekomendasi}.
                </span>
              </div>
            </div>
          )}

          {/* 1. SELEKSI 2 JENIS BENCANA MURNI (TSUNAMI vs NON-TSUNAMI) */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block font-mono">
              Pilih Jenis Ancaman Bencana:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opsi 1: Tsunami (Alur A) */}
              <button
                type="button"
                onClick={() => setJenisBencana('tsunami')}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  isAlurA
                    ? 'bg-rose-950/50 border-rose-500/80 text-white shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50'
                    : 'bg-[#121D28] border-[#223548] text-slate-300 hover:bg-[#182635] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Waves className={`w-4 h-4 ${isAlurA ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-xs">🌊 Tsunami</span>
                  <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700/50 font-bold">
                    ALUR A
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Evakuasi vertikal ke <strong>Shelter TES</strong> atau keluar dari zona merah bahaya pesisir.
                </p>
              </button>

              {/* Opsi 2: Non-Tsunami (Alur B) */}
              <button
                type="button"
                onClick={() => setJenisBencana('non_tsunami')}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                  !isAlurA
                    ? 'bg-amber-950/50 border-amber-500/80 text-white shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/50'
                    : 'bg-[#121D28] border-[#223548] text-slate-300 hover:bg-[#182635] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className={`w-4 h-4 ${!isAlurA ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-xs">🌋 Non-Tsunami</span>
                  <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/50 font-bold">
                    ALUR B
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Evakuasi ke posko pengungsi terdekat (mencakup galodo, gempa, banjir bandang, longsor, erupsi).
                </p>
              </button>
            </div>
          </div>

          {/* 2. TITIK AWAL EVAKUASI (CEPAT & SEDERHANA) */}
          <div className="p-3.5 rounded-xl bg-[#0F1722] border border-[#233547] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1E2E3E] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Titik Awal Pengguna
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                1-Klik Penentuan Lokasi
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleUseGps}
                disabled={gpsLoading}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  useGps 
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500 shadow-sm' 
                    : 'bg-[#152331] text-slate-300 border-[#2A3E53] hover:bg-[#1B2C3E] hover:text-white'
                }`}
              >
                {gpsLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                )}
                <span>{gpsLoading ? 'Mendeteksi...' : 'Gunakan GPS Otomatis'}</span>
              </button>

              {onPickLocationOnMap && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onPickLocationOnMap();
                  }}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#152331] text-amber-300 border border-[#2A3E53] hover:bg-[#1B2C3E] transition-colors text-xs font-semibold"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Pilih Titik di Peta</span>
                </button>
              )}
            </div>

            {/* Status Indikator Lokasi */}
            <div className="p-2.5 rounded-lg bg-[#141F2B] border border-[#233547] text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                {detectedWilayahNama ? (
                  <span>Lokasi terdeteksi: <strong className="text-white">{detectedWilayahNama}</strong></span>
                ) : activeCoords ? (
                  <span>Titik koordinat aktif: <strong className="font-mono text-white">{activeCoords.lat.toFixed(4)}, {activeCoords.lon.toFixed(4)}</strong></span>
                ) : (
                  <span>Lokasi default simulasi: <strong className="text-white">Pesisir Padang Barat</strong> (Tekan tombol GPS atau Peta untuk mengubah)</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. PROTOKOL ALUR */}
          <div className={`p-3 rounded-xl border text-xs ${
            isAlurA 
              ? 'bg-rose-950/20 border-rose-700/30 text-rose-200' 
              : 'bg-blue-950/20 border-blue-700/30 text-blue-200'
          }`}>
            <div className="flex items-center gap-2 font-bold mb-1">
              <Info className="w-4 h-4 shrink-0" />
              <span>
                {isAlurA ? 'Protokol Evakuasi Tsunami (Alur A):' : 'Protokol Evakuasi Non-Tsunami (Alur B):'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isAlurA ? (
                <>Sistem menghitung rute tercepat ke <strong>Shelter Vertikal TES</strong> terdekat atau melintasi <strong>Garis Aman Bypass</strong> di luar zona bahaya rendaman pesisir.</>
              ) : (
                <>Sistem memprioritaskan pencarian posko pengungsi terdekat yang berlokasi di kecamatan Anda dan menghindari ruas jalan terputus.</>
              )}
            </p>
          </div>

          {/* 4. MODA TRANSPORTASI */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
              Moda Transportasi:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedModa('mobil')}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedModa === 'mobil'
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                    : 'bg-[#121D28] border-[#223548] text-slate-400 hover:text-white'
                }`}
              >
                <span>🚗 Kendaraan (Mobil / Motor)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedModa('jalan_kaki')}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedModa === 'jalan_kaki'
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                    : 'bg-[#121D28] border-[#223548] text-slate-400 hover:text-white'
                }`}
              >
                <span>🏃 Jalan Kaki / Lari Darurat</span>
              </button>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-[#233547] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>

            {/* Tombol Utama: Langsung Aktif & Siap */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold font-display uppercase tracking-wider text-xs sm:text-sm text-white transition-all shadow-lg active:scale-98 bg-gradient-to-r from-[#DC2626] via-[#E11D48] to-[#EF4444] hover:from-[#B91C1C] hover:to-[#DC2626] shadow-rose-950/60 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menghitung Rute...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Cari Lokasi Aman</span>
                </>
              )}
            </button>
          </div>
        </form>
        ) : (
          <div className="flex flex-col h-[520px] max-h-[75vh] bg-[#09111A]">
            <div className="p-3 bg-cyan-950/30 border-b border-cyan-800/30 flex items-center justify-between text-xs text-cyan-200">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>Asisten Virtual AI Siaga Evakuasi & Mitigasi</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400/70">Terhubung Data Geospasial</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <DisasterChatbot
                isEmbedded={true}
                userCoords={activeCoords ? { lat: activeCoords.lat, lng: activeCoords.lon } : userCoords}
                onFlyToLocation={(loc) => {
                  onFlyToLocation?.(loc);
                }}
                onSelectDestination={(loc) => {
                  onSelectDestination?.(loc);
                  onClose();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
