import React from 'react';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  CornerUpRight, 
  CornerUpLeft, 
  ArrowUp, 
  RotateCcw,
  CheckCircle2,
  PhoneCall
} from 'lucide-react';

export interface RouteInstructionItem {
  teks: string;
  jarak_m: number;
  nama_jalan?: string;
}

export interface EvakuasiRouteData {
  posko: {
    id: number;
    nama: string;
    jenis?: string;
    kapasitas?: number;
    fasilitas?: string[];
    kontak_pic?: string;
    kontak_telepon?: string;
    lat: number;
    lon: number;
  };
  jarak_km: number;
  estimasi_menit: number;
  geometry: any;
  instruksi: RouteInstructionItem[];
  menghindari_blokade: boolean;
}

interface RouteInstructionsProps {
  routeData: EvakuasiRouteData;
  onClose: () => void;
  currentModa?: 'mobil' | 'jalan_kaki';
  onToggleModa?: (moda: 'mobil' | 'jalan_kaki') => void;
}

export const RouteInstructions: React.FC<RouteInstructionsProps> = ({ 
  routeData, 
  onClose,
  currentModa = 'mobil',
  onToggleModa
}) => {
  const getStepIcon = (teks: string) => {
    const lower = teks.toLowerCase();
    if (lower.includes('kanan')) {
      return <CornerUpRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
    } else if (lower.includes('kiri')) {
      return <CornerUpLeft className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
    } else if (lower.includes('putar balik')) {
      return <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
    } else if (lower.includes('tiba')) {
      return <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />;
    }
    return <ArrowUp className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
  };

  const isTES = routeData.posko.jenis === 'shelter_tes_tea';

  return (
    <div className="absolute bottom-16 left-4 z-30 w-full max-w-sm sm:max-w-md bg-[#0F1720]/95 backdrop-blur-md border border-[#243444] rounded-2xl shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in slide-in-from-bottom-6 duration-300">
      {/* Header Panel Navigasi */}
      <div className="p-4 bg-gradient-to-r from-[#1B2733] to-[#0F1720] border-b border-[#243444] flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl border ${isTES ? 'bg-sky-500/20 border-sky-500/30 text-sky-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'}`}>
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {isTES ? (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                  SHELTER VERTIKAL TSUNAMI
                </span>
              ) : (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  PANDUAN POSKO
                </span>
              )}

              {routeData.menghindari_blokade ? (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  HINDARI JALAN PUTUS
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  JALUR BEBAS
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white font-display mt-1 line-clamp-1">
              {routeData.posko.nama}
            </h3>
            <p className="text-xs text-slate-400">
              {isTES ? 'Evakuasi Cepat Menuju Lantai Aman Bebas Tsunami' : 'Posko Terdekat Hasil Optimasi Geospasial'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title="Tutup Navigasi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Ringkasan Jarak & Waktu Tempuh */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-[#131E2A] border-b border-[#243444]/60 text-center">
        <div className="flex items-center justify-center gap-2 py-1 bg-[#1B2733]/70 rounded-lg border border-[#2B3C4E]/50">
          <Clock className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Estimasi Waktu</div>
            <div className="text-sm font-bold text-white font-display">
              ~{routeData.estimasi_menit} Menit
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 py-1 bg-[#1B2733]/70 rounded-lg border border-[#2B3C4E]/50">
          <MapPin className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Total Jarak</div>
            <div className="text-sm font-bold text-white font-display">
              {routeData.jarak_km} km
            </div>
          </div>
        </div>
      </div>

      {/* Switcher Moda Evakuasi */}
      {onToggleModa && (
        <div className="flex items-center justify-center gap-2 p-2 bg-[#0C141C] border-b border-[#243444]/60">
          <span className="text-[10px] text-slate-400 font-mono">Pilihan Moda:</span>
          <button
            onClick={() => onToggleModa('mobil')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              currentModa === 'mobil'
                ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
                : 'bg-[#162330] text-slate-400 hover:text-white border border-[#243444]'
            }`}
          >
            🚗 Kendaraan
          </button>
          <button
            onClick={() => onToggleModa('jalan_kaki')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              currentModa === 'jalan_kaki'
                ? 'bg-emerald-600 text-white shadow-md border border-emerald-400/40'
                : 'bg-[#162330] text-slate-400 hover:text-white border border-[#243444]'
            }`}
          >
            🏃 Jalan Kaki (TES)
          </button>
        </div>
      )}

      {/* PIC / Hotline Posko */}
      {routeData.posko.kontak_telepon && (
        <div className="px-4 py-2 bg-blue-950/30 border-b border-blue-900/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-blue-200">
            <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
            <span>PIC: {routeData.posko.kontak_pic || 'Posko'}</span>
          </div>
          <a
            href={`tel:${routeData.posko.kontak_telepon}`}
            className="font-mono text-cyan-300 hover:underline font-semibold"
          >
            {routeData.posko.kontak_telepon}
          </a>
        </div>
      )}

      {/* Langkah-langkah Turn-by-Turn ala Google Maps */}
      <div className="p-3 overflow-y-auto space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1">
          Instruksi Arah ({routeData.instruksi.length} Langkah):
        </div>
        {routeData.instruksi.map((step, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-2.5 rounded-xl bg-[#1B2733]/50 hover:bg-[#1B2733] border border-[#243444]/40 transition-colors"
          >
            <div className="p-1 rounded-md bg-[#0F1720] border border-[#2B3C4E]">
              {getStepIcon(step.teks)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200 leading-snug">
                {step.teks}
              </p>
              {step.jarak_m > 0 && (
                <span className="inline-block mt-1 text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                  {step.jarak_m >= 1000 ? `${(step.jarak_m / 1000).toFixed(1)} km` : `${step.jarak_m} m`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Aksi */}
      <div className="p-3 bg-[#0F1720] border-t border-[#243444] flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-mono">
          Engine: {routeData.menghindari_blokade ? 'Valhalla + OSRM Detour' : 'OSRM Router (Sumbar)'}
        </span>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          Selesai Navigasi
        </button>
      </div>
    </div>
  );
};
