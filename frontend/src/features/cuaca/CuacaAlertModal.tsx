import React from 'react';
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
  alertData: CuacaAlertItem | null;
  onFlyToArea?: (lat: number, lng: number) => void;
}

export const CuacaAlertModal: React.FC<CuacaAlertModalProps> = ({
  isOpen,
  onClose,
  alertData,
  onFlyToArea
}) => {
  if (!isOpen || !alertData) return null;

  const handleFlyToGalodo = () => {
    // Koordinat pusat lereng Marapi - Agam - Tanah Datar (-0.38, 100.37)
    if (onFlyToArea) {
      onFlyToArea(-0.38, 100.37);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-[#131D27] border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-950/70 via-[#1A2634] to-[#131D27] border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
              <CloudLightning className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  BMKG NOWCAST ALERT
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  STATUS: {alertData.severity.toUpperCase()}
                </span>
              </div>
              <h2 className="text-base font-bold text-white font-display mt-0.5">
                {alertData.event}
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

        {/* Konten Detail Peringatan */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Glosarium Khusus: Penjelasan Galodo */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <div className="flex items-center gap-2 font-bold font-display text-amber-300 mb-1">
              <Info className="w-4 h-4 shrink-0" />
              <span>Apa itu "Galodo"? (Kearifan Lokal Minangkabau)</span>
            </div>
            <p className="text-[11.5px] leading-relaxed text-slate-200">
              <strong>Galodo</strong> adalah istilah khas masyarakat Minangkabau untuk bencana <strong>Banjir Bandang & Aliran Debris Lahar Dingin</strong> yang menerjang sungai-sungai berhulu dari puncak gunung (seperti Gunung Marapi dan Singgalang). Bencana ini membawa material lumpur vulkanik pekat, bongkahan batu besar, dan pohon tumbang yang mengalir sangat deras ke permukiman.
            </p>
          </div>

          {/* Headline Peringatan BMKG */}
          <div className="space-y-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Ringkasan Peringatan Dini
            </span>
            <div className="p-3.5 rounded-xl bg-[#0F1720]/80 border border-[#243444] text-slate-100 font-sans text-xs leading-relaxed">
              {alertData.headline}
            </div>
          </div>

          {/* Wilayah Cakupan */}
          <div className="space-y-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Wilayah Berpotensi Terdampak
            </span>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0F1720]/80 border border-[#243444]">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-slate-200 font-medium text-xs">
                {alertData.area_desc}
              </div>
            </div>
          </div>

          {/* Deskripsi Teknis Meteorologi */}
          <div className="space-y-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Analisis Stasiun Meteorologi Minangkabau
            </span>
            <div className="p-3.5 rounded-xl bg-[#0F1720]/80 border border-[#243444] text-slate-300 text-[11.5px] leading-relaxed">
              {alertData.description}
            </div>
          </div>

          {/* Panduan Kesiapsiagaan & Mitigasi BPBD */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Instruksi Kesiapsiagaan BPBD Prov. Sumbar</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-200">
              <li>Masyarakat di bantaran sungai aliran lahar Marapi (Batang Anai, Batang Aia Angek, Batang Agam, dll) diminta waspada kenaikan debit air.</li>
              <li>Jika hujan lebat berlangsung lebih dari 1 jam di puncak gunung, segera evakuasi mandiri menjauhi palung sungai ke tempat lebih tinggi.</li>
              <li>Pantau rute jalan evakuasi aman melalui dashboard ini untuk menghindari ruas jalan terputus akibat longsor.</li>
            </ul>
          </div>

          {/* Footer Metadata Atribusi */}
          <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400 border-t border-[#243444] pt-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>Status: {alertData.urgency} ({alertData.certainty})</span>
            </div>
            <div>
              Sumber: {alertData.atribusi || 'BMKG Minangkabau'}
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="px-5 py-3.5 bg-[#0F1720] border-t border-[#243444] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2E3E] transition-colors text-xs font-semibold"
          >
            Tutup
          </button>
          <button
            onClick={handleFlyToGalodo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-600/20 transition-all transform active:scale-95"
          >
            <Compass className="w-4 h-4 text-slate-950" />
            <span>Fokus ke Wilayah Terdampak (Lereng Marapi / Agam)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
