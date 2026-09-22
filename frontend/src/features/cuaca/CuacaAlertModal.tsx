import React, { useState } from 'react';
import { 
  CloudLightning, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  X,
  Compass,
  Info
} from 'lucide-react';

export interface CuacaAlertItem {
  id: number;
  identifier: string;
  event: string;
  headline: string;
  description: string;
  severity: string;
  urgency: string;
  certainty: string;
  effective: string;
  expires: string;
  area_desc: string;
  atribusi?: string;
}

interface CuacaAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts?: CuacaAlertItem[];
  alertData?: CuacaAlertItem | null;
  onFlyToArea?: (lat: number, lng: number) => void;
}

// Titik koordinat strategis 5 simpul cuaca BMKG Sumatera Barat
const WILAYAH_COORDS: Record<string, { lat: number; lng: number }> = {
  'bukittinggi': { lat: -0.3051, lng: 100.3692 },
  'padang': { lat: -0.8955, lng: 100.4355 },
  'agam': { lat: -0.3800, lng: 100.3700 },
  'tanah datar': { lat: -0.4850, lng: 100.3450 },
  'pesisir': { lat: -1.3500, lng: 100.5700 },
};

export const CuacaAlertModal: React.FC<CuacaAlertModalProps> = ({
  isOpen,
  onClose,
  alerts = [],
  alertData = null,
  onFlyToArea
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  // Gabungkan alerts prop atau fallback ke alertData tunggal
  const alertList: CuacaAlertItem[] = alerts.length > 0 
    ? alerts 
    : alertData 
    ? [alertData] 
    : [];

  if (alertList.length === 0) return null;

  const currentAlert = alertList[selectedIndex] || alertList[0];

  const getCoordinates = (areaDesc: string) => {
    const descLower = areaDesc.toLowerCase();
    for (const [key, coords] of Object.entries(WILAYAH_COORDS)) {
      if (descLower.includes(key)) {
        return coords;
      }
    }
    return { lat: -0.85, lng: 100.41 };
  };

  const handleFlyToCurrent = () => {
    const coords = getCoordinates(currentAlert.area_desc);
    if (onFlyToArea) {
      onFlyToArea(coords.lat, coords.lng);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#111A24] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-950/80 via-[#162330] to-[#111A24] border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
              <CloudLightning className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  BMKG NOWCAST WEATHER ALERT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  {alertList.length} WILAYAH TERPANTAU
                </span>
              </div>
              <h2 className="text-base font-bold text-white font-display mt-0.5">
                Peringatan Dini Cuaca Ekstrem & Potensi Ancaman
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2E3E] transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pilihan 5 Wilayah Terpantau */}
        {alertList.length > 1 && (
          <div className="px-5 py-2.5 bg-[#0A1017] border-b border-[#223344] overflow-x-auto scrollbar-none">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
              Pilih Wilayah Terpantau ({alertList.length} Lokasi BMKG):
            </span>
            <div className="flex items-center gap-1.5 min-w-max">
              {alertList.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const shortName = item.area_desc.split('(')[0].trim();
                return (
                  <button
                    key={item.identifier || idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border border-amber-500 text-amber-300 shadow-md shadow-amber-950/50'
                        : 'bg-[#141F2B] border border-[#233547] text-slate-400 hover:text-slate-200 hover:bg-[#1C2C3D]'
                    }`}
                  >
                    <MapPin className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{shortName}</span>
                    {item.severity.toLowerCase() === 'severe' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Konten Detail Peringatan untuk Wilayah Terpilih */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Banner Wilayah Terpilih & Ancaman */}
          <div className="p-3.5 rounded-xl bg-[#14202C] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {currentAlert.area_desc}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold uppercase">
                  STATUS: {currentAlert.severity}
                </span>
              </div>
              <h3 className="text-sm font-bold text-amber-300 font-display">
                {currentAlert.event}
              </h3>
            </div>

            <button
              onClick={handleFlyToCurrent}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all shrink-0"
              title="Arahkan kamera peta ke wilayah ini"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Fokus ke Peta</span>
            </button>
          </div>

          {/* Glosarium Galodo & Debris Lahar Dingin (Tampil jika lereng Marapi / Agam) */}
          {(currentAlert.event.toLowerCase().includes('galodo') || currentAlert.area_desc.toLowerCase().includes('marapi') || currentAlert.area_desc.toLowerCase().includes('agam')) && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
              <div className="flex items-center gap-2 font-bold font-display text-amber-300 mb-1">
                <Info className="w-4 h-4 shrink-0" />
                <span>Apa itu "Galodo"? (Kearifan Lokal Minangkabau)</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-200">
                <strong>Galodo</strong> adalah istilah khas Minangkabau untuk bencana <strong>Banjir Bandang & Aliran Debris Lahar Dingin</strong> yang menerjang sungai-sungai berhulu dari puncak Gunung Marapi dan Singgalang saat intensitas curah hujan tinggi. Bencana ini membawa material lumpur pekat, bongkahan batu besar, dan kayu gelondongan ke permukiman.
              </p>
            </div>
          )}

          {/* Headline Peringatan BMKG */}
          <div className="space-y-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Ringkasan Peringatan Dini
            </span>
            <div className="p-3.5 rounded-xl bg-[#0B121A] border border-[#223344] text-slate-100 font-sans text-xs leading-relaxed">
              {currentAlert.headline}
            </div>
          </div>

          {/* Deskripsi Teknis Meteorologi */}
          <div className="space-y-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Analisis Stasiun Meteorologi Minangkabau (BMKG)
            </span>
            <div className="p-3.5 rounded-xl bg-[#0B121A] border border-[#223344] text-slate-300 text-[11.5px] leading-relaxed">
              {currentAlert.description}
            </div>
          </div>

          {/* Panduan Kesiapsiagaan & Mitigasi BPBD */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Instruksi Kesiapsiagaan BPBD Prov. Sumbar</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-200">
              <li>Masyarakat di bantaran sungai aliran lahar dan pesisir pantai diminta memantau kenaikan debit air dan gelombang pasang.</li>
              <li>Jika hujan lebat berlangsung lebih dari 1 jam di hulu/puncak, segera evakuasi mandiri ke tempat yang lebih aman.</li>
              <li>Gunakan fitur pemantau jalur evakuasi di dashboard ini untuk menghindari ruas jalan terputus akibat genangan atau longsor.</li>
            </ul>
          </div>

          {/* Footer Metadata Atribusi */}
          <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400 border-t border-[#223344] pt-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Status: {currentAlert.urgency} ({currentAlert.certainty})</span>
            </div>
            <div>
              Sumber: {currentAlert.atribusi || 'BMKG Minangkabau'}
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="px-5 py-3 bg-[#0B121A] border-t border-[#223344] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2E3E] transition-colors text-xs font-semibold"
          >
            Tutup
          </button>
          <button
            onClick={handleFlyToCurrent}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-600/20 transition-all transform active:scale-95"
          >
            <Compass className="w-4 h-4 text-slate-950" />
            <span>Fokus ke Peta ({currentAlert.area_desc.split('(')[0].trim()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
