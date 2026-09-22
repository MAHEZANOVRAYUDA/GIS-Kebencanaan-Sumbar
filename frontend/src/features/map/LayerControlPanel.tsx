import React from 'react';
import { 
  Layers, 
  Building2, 
  Volume2, 
  AlertTriangle, 
  Radio, 
  CloudLightning,
  Eye,
  EyeOff,
  Activity,
  ShieldAlert,
  Waves,
  Flame,
  Milestone,
  Compass
} from 'lucide-react';

export interface LayerVisibilityState {
  choropleth: boolean;
  poskoEvakuasi: boolean;
  shelterTes: boolean;
  sirineTsunami: boolean;
  jalanTerputus: boolean;
  gempa: boolean;
  cuaca: boolean;
  sesarSemangko?: boolean;
  sesarBuffer?: boolean;
  megathrust?: boolean;
  zonaTsunami?: boolean;
  tsunamiRunup?: boolean;
}

interface LayerItem {
  key: keyof LayerVisibilityState;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

interface LayerCategory {
  title: string;
  badge: string;
  badgeBg: string;
  items: LayerItem[];
}

interface LayerControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: LayerVisibilityState;
  onToggleLayer: (layerKey: keyof LayerVisibilityState) => void;
  onToggleAll?: (enable: boolean) => void;
  tesCount?: number;
  sirineCount?: number;
  poskoCount?: number;
  jalanCount?: number;
  gempaData?: any;
  onFocusGempa?: () => void;
}

export const LayerControlPanel: React.FC<LayerControlPanelProps> = ({
  isOpen,
  onClose,
  visibility,
  onToggleLayer,
  onToggleAll,
  tesCount = 7,
  sirineCount = 46,
  poskoCount = 35,
  jalanCount = 0,
  gempaData,
  onFocusGempa,
}) => {
  if (!isOpen) return null;

  const categories: LayerCategory[] = [
    {
      title: '1. Ancaman Real-Time (Live Alerts)',
      badge: 'Prioritas 1',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      items: [
        {
          key: 'gempa',
          label: 'Episentrum Gempa BMKG',
          sublabel: gempaData
            ? `M${gempaData.magnitude} • ${gempaData.wilayah_teks}`
            : 'Sensor seismik real-time & peta guncangan BMKG',
          icon: <Radio className="w-4 h-4 text-rose-500 animate-pulse" />,
          badge: gempaData ? `M${gempaData.magnitude} Live` : 'Live BMKG',
          badgeColor: 'bg-rose-600/30 text-rose-300 border-rose-500/40'
        },
        {
          key: 'jalanTerputus',
          label: 'Ruas Jalan Terputus',
          sublabel: 'Titik blokade longsor, banjir & pohon tumbang',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          badge: jalanCount > 0 ? `${jalanCount} Blokade` : '0 Aktif',
          badgeColor: jalanCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-slate-700 text-slate-400'
        },
        {
          key: 'cuaca',
          label: 'Peringatan Dini Cuaca & Galodo',
          sublabel: 'Radar nowcast BMKG & lahar hujan Marapi',
          icon: <CloudLightning className="w-4 h-4 text-amber-400" />,
          badge: 'Radar BMKG',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        }
      ]
    },
    {
      title: '2. Fasilitas & Aset Keselamatan',
      badge: 'Life Safety',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      items: [
        {
          key: 'poskoEvakuasi',
          label: 'Posko Pengungsi (Kantor Camat & Faskes)',
          sublabel: '11 Kantor Camat & fasilitas pengungsian darurat BNPB',
          icon: <Building2 className="w-4 h-4 text-orange-400" />,
          badge: `${poskoCount} Posko`,
          badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
        },
        {
          key: 'shelterTes',
          label: 'Shelter TES Vertikal Tsunami',
          sublabel: 'Gedung evakuasi vertikal pesisir bertingkat bebas tsunami',
          icon: <Building2 className="w-4 h-4 text-sky-400" />,
          badge: `${tesCount} Gedung`,
          badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30'
        },
        {
          key: 'sirineTsunami',
          label: 'Sirine EWS Tsunami BPBD',
          sublabel: 'Jaringan sirine peringatan dini pesisir Sumbar (21 Siaga / 25 Maint)',
          icon: <Volume2 className="w-4 h-4 text-amber-400" />,
          badge: `${sirineCount} Unit`,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        },
        {
          key: 'zonaTsunami',
          label: 'Zonasi Tsunami & Garis Bypass',
          sublabel: 'Zona rendaman merah & batas evakuasi aman',
          icon: <Waves className="w-4 h-4 text-cyan-400" />,
          badge: 'Bypass Aman',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        },
        {
          key: 'tsunamiRunup',
          label: 'Skenario Run-Up Tsunami',
          sublabel: 'Pemodelan ketinggian rendaman KRB III-I (Mw 8.9)',
          icon: <Flame className="w-4 h-4 text-orange-400" />,
          badge: 'KRB Pesisir',
          badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
        }
      ]
    },
    {
      title: '3. Struktur Geologi & Tektonik',
      badge: 'Hazard Source',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      items: [
        {
          key: 'sesarSemangko',
          label: 'Patahan Sesar Semangko',
          sublabel: 'Sesar geser aktif darat (Sianok, Sumani, Suliti)',
          icon: <Activity className="w-4 h-4 text-amber-400" />,
          badge: 'Darat M7.2',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        },
        {
          key: 'sesarBuffer',
          label: 'Sempadan Aktif Sesar 100m',
          sublabel: 'Zona penyangga larangan bangunan vital',
          icon: <Milestone className="w-4 h-4 text-amber-300" />,
          badge: 'Setback 100m',
          badgeColor: 'bg-amber-600/20 text-amber-200 border-amber-500/30'
        },
        {
          key: 'megathrust',
          label: 'Zona Megathrust Mentawai',
          sublabel: 'Palung subduksi lempeng laut & seismic gap',
          icon: <ShieldAlert className="w-4 h-4 text-rose-500" />,
          badge: 'Laut M8.9',
          badgeColor: 'bg-rose-600/30 text-rose-300 border-rose-500/40'
        }
      ]
    },
    {
      title: '4. Konteks Wilayah & Dampak',
      badge: 'Statistik',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      items: [
        {
          key: 'choropleth',
          label: 'Zona Risiko Kabupaten / Kota',
          sublabel: 'Peta choropleth risiko & kerugian 19 kab/kota',
          icon: <Layers className="w-4 h-4 text-emerald-400" />,
          badge: '19 Wilayah',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        }
      ]
    }
  ];

  return (
    <aside className="absolute top-16 right-4 z-40 w-96 sm:w-[430px] max-w-[calc(100vw-2rem)] bg-[#0F1720]/95 backdrop-blur-xl border border-[#243444] rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-slate-100 select-none animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-[#243444] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#1B2733] border border-[#2D3F52]">
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
              Lapisan Peta Operasional
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              Urutan berjenjang dari ancaman terdesak ke mitigasi
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

      {/* Kontrol Masal Semua Layer */}
      {onToggleAll && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#162330]/80 border border-[#243444] text-[11px]">
          <span className="text-[10px] text-slate-400 font-mono">Kontrol Cepat:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleAll(true)}
              className="px-2 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 flex items-center gap-1 transition-all active:scale-95 text-[10px] font-medium"
              title="Nyalakan seluruh layer peta"
            >
              <Eye className="w-3 h-3" />
              <span>Nyalakan Semua</span>
            </button>
            <button
              onClick={() => onToggleAll(false)}
              className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1 transition-all active:scale-95 text-[10px] font-medium"
              title="Matikan seluruh layer peta"
            >
              <EyeOff className="w-3 h-3" />
              <span>Matikan Semua</span>
            </button>
          </div>
        </div>
      )}

      {/* Konten Kategori Berjenjang */}
      <div className="space-y-3.5 max-h-[72vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
        {categories.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-1.5">
            {/* Header Kategori */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-300 font-display">
                {cat.title}
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${cat.badgeBg}`}>
                {cat.badge}
              </span>
            </div>

            {/* List Layer dalam Kategori */}
            <div className="space-y-1">
              {cat.items.map((item) => {
                const isActive = visibility[item.key] ?? false;
                return (
                  <button
                    key={item.key}
                    onClick={() => onToggleLayer(item.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-[#162330] border-[#38BDF8]/40 shadow-sm'
                        : 'bg-[#0F1720]/60 border-[#1E293B] opacity-55 hover:opacity-85'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-[#0F1720]' : 'bg-[#1B2733]/50'}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-100 block leading-snug">
                          {item.label}
                        </span>
                        <span className="text-[10.5px] text-slate-400 block leading-tight mt-0.5">
                          {item.sublabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.key === 'gempa' && gempaData && onFocusGempa && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusGempa();
                          }}
                          className="px-2 py-0.5 rounded-md bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border border-rose-500/50 text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Terbangkan kamera peta ke titik pusat gempa"
                        >
                          <Compass className="w-3 h-3 text-rose-300" />
                          <span>Fokus</span>
                        </span>
                      )}
                      {item.badge && (
                        <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded border whitespace-nowrap ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                      <div className={`p-1 rounded ${isActive ? 'text-sky-400' : 'text-slate-500'}`}>
                        {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Sumber Data */}
      <div className="border-t border-[#243444] pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>Sumber: BPBD Sumbar × BMKG</span>
        <span className="text-emerald-400">PostGIS × MapLibre</span>
      </div>
    </aside>
  );
};


