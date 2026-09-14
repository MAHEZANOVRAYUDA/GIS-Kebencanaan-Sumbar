import React, { useState } from 'react';
import { 
  Filter, 
  Search, 
  RotateCcw, 
  Waves, 
  Mountain, 
  AlertTriangle, 
  Flame, 
  Wind,
  Layers
} from 'lucide-react';

interface FilterPanelProps {
  selectedJenis: string;
  selectedTahun: string;
  searchQuery: string;
  kecamatanList: { id: number; nama: string; parent_nama?: string }[];
  onJenisChange: (jenis: string) => void;
  onTahunChange: (tahun: string) => void;
  onSearchChange: (query: string) => void;
  onSelectSearchResult: (id: number) => void;
  onResetFilter: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  selectedJenis,
  selectedTahun,
  searchQuery,
  kecamatanList,
  onJenisChange,
  onTahunChange,
  onSearchChange,
  onSelectSearchResult,
  onResetFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const jenisBencanaOptions = [
    { value: 'semua', label: 'Semua Bencana', icon: Layers },
    { value: 'banjir', label: 'Banjir Bandang', icon: Waves },
    { value: 'longsor', label: 'Tanah Longsor', icon: Mountain },
    { value: 'gempa', label: 'Gempa Bumi', icon: AlertTriangle },
    { value: 'erupsi', label: 'Erupsi & Lahar', icon: Flame },
    { value: 'angin_puting_beliung', label: 'Puting Beliung', icon: Wind },
  ];

  const tahunOptions = [
    { value: 'semua', label: 'Semua Periode' },
    { value: '2026', label: 'Tahun 2026' },
    { value: '2025', label: 'Tahun 2025' },
  ];

  // Filter hasil pencarian kecamatan
  const searchResults = searchQuery.trim()
    ? kecamatanList
        .filter((k) => k.nama.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
    : [];

  return (
    <div className="absolute top-16 left-4 z-20 flex items-start gap-2">
      {/* Tombol Toggle Filter (Kompak, floating di kiri atas) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl border shadow-xl transition-all ${
          isOpen || selectedJenis !== 'semua' || selectedTahun !== 'semua'
            ? 'bg-[#1E3A5F] border-[#3A5A82] text-amber-300'
            : 'bg-[#1B2733]/90 border-[#2D3F52] text-slate-200 hover:bg-[#243444]'
        }`}
        title="Buka Filter & Pencarian Wilayah"
      >
        <Filter className="w-4 h-4" />
        <span className="text-xs font-semibold font-display tracking-wide">
          Filter & Cari
        </span>
        {(selectedJenis !== 'semua' || selectedTahun !== 'semua') && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {/* Konten Filter Melayang (Accordion / Floating Card) */}
      {isOpen && (
        <div className="w-76 sm:w-84 bg-[#1B2733]/95 backdrop-blur-xl border border-[#2D3F52] rounded-xl shadow-2xl p-4 text-slate-100 flex flex-col gap-4 animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between border-b border-[#2D3F52] pb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-200">
                Filter Layer & Wilayah
              </h3>
            </div>
            <button
              onClick={onResetFilter}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400 transition-colors font-mono"
              title="Reset semua filter"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* 1. Pencarian Cepat Kecamatan */}
          <div className="space-y-1.5 relative">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Cari Kecamatan
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Contoh: Kuranji, Sitinjau, Canduang..."
                className="w-full bg-[#0F1720]/80 border border-[#2D3F52] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {/* Dropdown Hasil Pencarian */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0F1720] border border-[#2D3F52] rounded-lg shadow-xl overflow-hidden z-40">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      onSelectSearchResult(result.id);
                      onSearchChange('');
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#1E3A5F] flex flex-col transition-colors border-b border-[#2D3F52]/40 last:border-0"
                  >
                    <span className="font-semibold text-slate-100">{result.nama}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{result.parent_nama || 'Sumatera Barat'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Filter Jenis Bencana */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Jenis Kejadian Bencana
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {jenisBencanaOptions.map((opt) => {
                const IconComponent = opt.icon;
                const active = selectedJenis === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onJenisChange(opt.value)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
                      active
                        ? 'bg-[#1E3A5F] border-[#3A5A82] text-amber-300 shadow-sm'
                        : 'bg-[#0F1720]/60 border-[#2D3F52] text-slate-300 hover:bg-[#1B2733]'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Filter Rentang Waktu / Tahun */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Periode Tahun
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {tahunOptions.map((t) => {
                const active = selectedTahun === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => onTahunChange(t.value)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-mono font-medium border text-center transition-all ${
                      active
                        ? 'bg-[#1E3A5F] border-[#3A5A82] text-amber-300'
                        : 'bg-[#0F1720]/60 border-[#2D3F52] text-slate-400 hover:bg-[#1B2733]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
