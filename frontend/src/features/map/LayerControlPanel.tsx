import React from 'react';
import { 
  Layers, 
  Building2, 
  Volume2, 
  AlertTriangle, 
  Radio, 
  CloudLightning,
  Eye,
  EyeOff
} from 'lucide-react';

export interface LayerVisibilityState {
  choropleth: boolean;
  shelterTes: boolean;
  sirineTsunami: boolean;
  jalanTerputus: boolean;
  gempa: boolean;
  cuaca: boolean;
}

interface LayerControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: LayerVisibilityState;
  onToggleLayer: (layerKey: keyof LayerVisibilityState) => void;
  tesCount?: number;
  sirineCount?: number;
  jalanCount?: number;
}

export const LayerControlPanel: React.FC<LayerControlPanelProps> = ({
  isOpen,
  onClose,
  visibility,
  onToggleLayer,
  tesCount = 7,
  sirineCount = 46,
  jalanCount = 0,
}) => {
  if (!isOpen) return null;

  const layerItems: {
    key: keyof LayerVisibilityState;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      key: 'choropleth',
      label: 'Zona Risiko Kecamatan',
      sublabel: 'Choropleth MVT dampak bencana riil',
      icon: <Layers className="w-4 h-4 text-emerald-400" />,
      badge: 'MVT Native',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      key: 'shelterTes',
      label: 'Shelter TES/TEA Tsunami',
      sublabel: 'Gedung evakuasi vertikal kontinjensi Padang',
      icon: <Building2 className="w-4 h-4 text-sky-400" />,
      badge: `${tesCount} Unit`,
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
    },
    {
      key: 'sirineTsunami',
      label: 'Sirine EWS Tsunami BPBD',
      sublabel: 'Jaringan peringatan dini pesisir Sumbar',
      icon: <Volume2 className="w-4 h-4 text-amber-400" />,
      badge: `${sirineCount} Titik`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      key: 'jalanTerputus',
      label: 'Ruas Jalan Terputus',
      sublabel: 'Blokade longsor / banjir aktif',
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      badge: jalanCount > 0 ? `${jalanCount} Blokade` : '0 Aktif',
      badgeColor: jalanCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-700 text-slate-400'
    },
    {
      key: 'gempa',
      label: 'Episentrum Gempa BMKG',
      sublabel: 'Sensor live real-time TEWS',
      icon: <Radio className="w-4 h-4 text-red-500" />,
      badge: 'Live BMKG',
      badgeColor: 'bg-rose-600/30 text-rose-300 border-rose-500/40'
    },
    {
      key: 'cuaca',
      label: 'Peringatan Dini Cuaca',
      sublabel: 'BMKG Common Alerting Protocol (CAP)',
      icon: <CloudLightning className="w-4 h-4 text-yellow-400" />,
      badge: 'Radar/Nowcast',
      badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    }
  ];

  return (
    <aside className="absolute top-16 right-4 z-40 w-80 bg-[#0F1720]/95 backdrop-blur-xl border border-[#243444] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-slate-100 select-none animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between border-b border-[#243444] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#1B2733] border border-[#2D3F52]">
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
              Lapisan Peta (Layers)
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              Pilih data spasial yang ditampilkan
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded-lg hover:bg-[#1B2733] transition-colors"
          title="Tutup Panel Layer"
        >
          &times;
        </button>
      </div>

      <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
        {layerItems.map((item) => {
          const isActive = visibility[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onToggleLayer(item.key)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-[#162330] border-[#38BDF8]/40 shadow-sm'
                  : 'bg-[#0F1720]/60 border-[#1E293B] opacity-60 hover:opacity-90'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-[#0F1720]' : 'bg-[#1B2733]/50'}`}>
                  {item.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 line-clamp-1">
                    {item.sublabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.badge && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
                <div className={`p-1 rounded ${isActive ? 'text-sky-400' : 'text-slate-500'}`}>
                  {isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="border-t border-[#243444] pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>Sumber: BPBD Sumbar × BMKG</span>
        <span className="text-emerald-400">PostGIS Live</span>
      </div>
    </aside>
  );
};
