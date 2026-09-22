import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Search, 
  RotateCcw, 
  Waves, 
  Mountain, 
  AlertTriangle, 
  Flame, 
  Wind, 
  Layers,
  MapPin,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  Compass,
  CheckCircle2
} from 'lucide-react';

export interface KotaKabupatenItem {
  id: number;
  kode: string;
  nama: string;
  lat: number;
  lon: number;
}

export const DAFTAR_KOTA_KABUPATEN_SUMBAR: KotaKabupatenItem[] = [
  { id: 2, kode: '1371', nama: 'Kota Padang', lat: -0.8955, lon: 100.4355 },
  { id: 3, kode: '1375', nama: 'Kota Bukittinggi', lat: -0.3051, lon: 100.3692 },
  { id: 35, kode: '1374', nama: 'Kota Padang Panjang', lat: -0.4713, lon: 100.4038 },
  { id: 37, kode: '1377', nama: 'Kota Pariaman', lat: -0.6263, lon: 100.1207 },
  { id: 36, kode: '1376', nama: 'Kota Payakumbuh', lat: -0.2244, lon: 100.6322 },
  { id: 34, kode: '1373', nama: 'Kota Sawahlunto', lat: -0.6817, lon: 100.7816 },
  { id: 33, kode: '1372', nama: 'Kota Solok', lat: -0.7937, lon: 100.6558 },
  { id: 4, kode: '1306', nama: 'Kabupaten Agam', lat: -0.2494, lon: 100.1685 },
  { id: 30, kode: '1310', nama: 'Kabupaten Dharmasraya', lat: -1.1310, lon: 101.5542 },
  { id: 29, kode: '1309', nama: 'Kabupaten Kepulauan Mentawai', lat: -1.8480, lon: 99.3358 },
  { id: 27, kode: '1307', nama: 'Kabupaten Lima Puluh Kota', lat: 0.0298, lon: 100.5659 },
  { id: 5, kode: '1305', nama: 'Kabupaten Padang Pariaman', lat: -0.5624, lon: 100.2277 },
  { id: 28, kode: '1308', nama: 'Kabupaten Pasaman', lat: 0.3871, lon: 100.0818 },
  { id: 32, kode: '1312', nama: 'Kabupaten Pasaman Barat', lat: 0.1633, lon: 99.7329 },
  { id: 23, kode: '1301', nama: 'Kabupaten Pesisir Selatan', lat: -1.5458, lon: 100.7891 },
  { id: 25, kode: '1303', nama: 'Kabupaten Sijunjung', lat: -0.6775, lon: 101.3276 },
  { id: 24, kode: '1302', nama: 'Kabupaten Solok', lat: -0.9634, lon: 100.7259 },
  { id: 31, kode: '1311', nama: 'Kabupaten Solok Selatan', lat: -1.4884, lon: 101.2721 },
  { id: 26, kode: '1304', nama: 'Kabupaten Tanah Datar', lat: -0.4619, lon: 100.5755 },
];

interface FilterPanelProps {
  selectedJenis: string;
  selectedTahun: string;
  searchQuery: string;
  kecamatanList: { id: number; nama: string; parent_nama?: string; lat?: number; lon?: number }[];
  activeKotaNama?: string | null;
  activeKecamatanNama?: string | null;
  onJenisChange: (jenis: string) => void;
  onTahunChange: (tahun: string) => void;
  onSearchChange: (query: string) => void;
  onSelectKota: (kota: KotaKabupatenItem) => void;
  onSelectKecamatan: (id: number, nama: string, properties?: any) => void;
  onResetFilter: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  selectedJenis,
  selectedTahun,
  searchQuery,
  kecamatanList,
  activeKotaNama,
  activeKecamatanNama,
  onJenisChange,
  onTahunChange,
  onSearchChange,
  onSelectKota,
  onSelectKecamatan,
  onResetFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showThematicFilter, setShowThematicFilter] = useState(false);

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
    { value: '2024', label: 'Tahun 2024' },
    { value: '2023', label: 'Tahun 2023' },
  ];

  // 1. Pencarian Kota / Kabupaten yang cocok
  const matchedKota = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return DAFTAR_KOTA_KABUPATEN_SUMBAR.filter((k) => 
      k.nama.toLowerCase().includes(q) || k.kode.includes(q)
    );
  }, [searchQuery]);

  // 2. Pencarian Kecamatan yang cocok
  const matchedKecamatan = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return kecamatanList
      .filter((k) => 
        k.nama.toLowerCase().includes(q) || 
        (k.parent_nama && k.parent_nama.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, kecamatanList]);

  // Status jika ada filter aktif
  const hasActiveFilter = 
    selectedJenis !== 'semua' || 
    selectedTahun !== 'semua' || 
    Boolean(activeKotaNama) || 
    Boolean(activeKecamatanNama);

  return (
    <div className="absolute top-[82px] sm:top-[92px] left-4 z-20 flex items-start gap-2">
      {/* Tombol Toggle Filter (Floating di kiri atas peta) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl backdrop-blur-xl border shadow-xl transition-all duration-200 ${
          isOpen || hasActiveFilter
            ? 'bg-[#152332]/95 border-amber-500/70 text-amber-300 shadow-amber-950/40 ring-1 ring-amber-500/30'
            : 'bg-[#111A24]/90 border-[#233547] text-slate-200 hover:bg-[#182635] hover:border-slate-500'
        }`}
        title="Buka Filter & Telusuri Wilayah"
      >
        <Filter className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold font-display tracking-wide uppercase">
          Filter & Cari
        </span>
        {hasActiveFilter && (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>

      {/* Konten Dropdown Filter Melayang */}
      {isOpen && (
        <div className="w-[340px] sm:w-[460px] md:w-[480px] bg-[#0E1722]/98 backdrop-blur-2xl border border-[#263C52] rounded-2xl shadow-2xl p-4 text-slate-100 flex flex-col gap-3.5 animate-in slide-in-from-left duration-200 max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          
          {/* Header Panel */}
          <div className="flex items-center justify-between border-b border-[#233547] pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">
                  Filter & Telusuri Wilayah
                </h3>
                <p className="text-[10px] text-slate-400">
                  Provinsi Sumatera Barat
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={onResetFilter}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-amber-300 hover:bg-white/5 transition-colors font-mono"
                title="Kembalikan tampilan peta ke awal"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Tutup Filter"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Badge Lokasi Aktif Terpilih (Jika Ada) */}
          {(activeKotaNama || activeKecamatanNama) && (
            <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-700/50 flex items-center justify-between text-xs text-cyan-200 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">
                  Fokus: <strong>{activeKecamatanNama || activeKotaNama}</strong>
                  {activeKecamatanNama && activeKotaNama && (
                    <span className="text-cyan-400/80 text-[10px] block truncate">
                      {activeKotaNama}
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={onResetFilter}
                className="text-[10px] font-mono text-cyan-300 hover:text-white underline ml-2 shrink-0"
              >
                Batal
              </button>
            </div>
          )}

          {/* ANTARMUKA PENCARIAN CEPAT (KAB/KOTA & KECAMATAN) */}
          <div className="space-y-3">
            {/* Kolom Input Pencarian */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Cari Cepat Kabupaten/Kota atau Kecamatan:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Ketik nama wilayah (Padang, Bukittinggi, Agam...)"
                  className="w-full bg-[#080E16] border border-[#233547] rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 transition-all font-medium"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Hasil Pencarian Popover / List */}
            {searchQuery.trim() !== '' && (
              <div className="space-y-3 max-h-64 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-700">
                {/* Section A: Hasil Kabupaten / Kota */}
                {matchedKota.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-400 uppercase tracking-wider px-1">
                      <Building2 className="w-3 h-3" />
                      <span>Kabupaten / Kota ({matchedKota.length})</span>
                    </div>
                    <div className="space-y-1">
                      {matchedKota.map((kota) => (
                        <button
                          key={kota.id}
                          type="button"
                          onClick={() => {
                            onSelectKota(kota);
                            onSearchChange('');
                          }}
                          className="w-full text-left p-2 rounded-xl bg-[#121E2C] hover:bg-[#1C2E42] border border-[#24374A] hover:border-cyan-500/70 transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              🏙️
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors block">
                                {kota.nama}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Tampilkan garis batas seluruh kecamatan
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-700">
                            Direct ➔
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section B: Hasil Kecamatan */}
                {matchedKecamatan.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 uppercase tracking-wider px-1">
                      <MapPin className="w-3 h-3" />
                      <span>Kecamatan ({matchedKecamatan.length})</span>
                    </div>
                    <div className="space-y-1">
                      {matchedKecamatan.map((kec) => (
                        <button
                          key={kec.id}
                          type="button"
                          onClick={() => {
                            onSelectKecamatan(kec.id, kec.nama, kec);
                            onSearchChange('');
                          }}
                          className="w-full text-left p-2 rounded-xl bg-[#121E2C] hover:bg-[#1C2E42] border border-[#24374A] hover:border-amber-500/70 transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                              📍
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors block">
                                Kecamatan {kec.nama}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {kec.parent_nama || 'Sumatera Barat'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-slate-700">
                            Fokus ➔
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Jika Tidak Ditemukan */}
                {matchedKota.length === 0 && matchedKecamatan.length === 0 && (
                  <div className="p-4 rounded-xl bg-[#101923] border border-[#203042] text-center text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">Wilayah Tidak Ditemukan</p>
                    <p className="text-[11px] text-slate-500">
                      Tidak ada kabupaten atau kecamatan dengan kata kunci "{searchQuery}".
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Rekomendasi Cepat Kota Utama (Jika Kolom Masih Kosong) */}
            {searchQuery.trim() === '' && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Pilihan Cepat Wilayah Utama:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {DAFTAR_KOTA_KABUPATEN_SUMBAR.slice(0, 9).map((kota) => (
                    <button
                      key={kota.id}
                      type="button"
                      onClick={() => onSelectKota(kota)}
                      className="px-2 py-1.5 rounded-lg bg-[#121E2C] hover:bg-cyan-950/60 border border-[#233547] hover:border-cyan-500/50 text-[11px] text-slate-300 hover:text-cyan-200 transition-all font-medium flex items-center justify-center gap-1 text-center"
                    >
                      <span className="text-xs">🏙️</span>
                      <span className="truncate">{kota.nama}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AKORDEON: FILTER TEMATIK (JENIS BENCANA & PERIODE TAHUN) */}
          <div className="border-t border-[#233547] pt-2">
            <button
              type="button"
              onClick={() => setShowThematicFilter(!showThematicFilter)}
              className="w-full flex items-center justify-between py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-[11px] uppercase tracking-wider font-mono">
                  Filter Tematik Kejadian ({selectedJenis === 'semua' ? 'Semua Bencana' : selectedJenis}, {selectedTahun === 'semua' ? 'Semua Tahun' : selectedTahun})
                </span>
              </div>
              {showThematicFilter ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {showThematicFilter && (
              <div className="space-y-3 pt-2 animate-in fade-in duration-150">
                {/* 1. Jenis Bencana */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Jenis Ancaman Bencana:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {jenisBencanaOptions.map((opt) => {
                      const IconComponent = opt.icon;
                      const active = selectedJenis === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onJenisChange(opt.value)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all text-left ${
                            active
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                              : 'bg-[#101923] border-[#223344] text-slate-300 hover:bg-[#182635]'
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Periode Tahun */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                    Periode Waktu:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {tahunOptions.map((t) => {
                      const active = selectedTahun === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => onTahunChange(t.value)}
                          className={`px-2 py-1.5 rounded-xl text-[11px] font-mono font-medium border text-center transition-all ${
                            active
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                              : 'bg-[#101923] border-[#223344] text-slate-400 hover:bg-[#182635]'
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

        </div>
      )}
    </div>
  );
};
