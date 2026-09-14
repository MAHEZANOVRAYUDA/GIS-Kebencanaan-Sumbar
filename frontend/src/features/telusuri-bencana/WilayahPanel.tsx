import React from 'react';
import { 
  X, 
  AlertTriangle, 
  Building2, 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Crosshair, 
  ShieldAlert,
  Flame,
  Waves,
  Mountain,
  Wind
} from 'lucide-react';

export interface KejadianRingkas {
  id: number;
  jenis_bencana: string;
  tanggal_kejadian: string;
  deskripsi?: string;
  status_verifikasi: string;
}

export interface WilayahDampakData {
  wilayah_id: number;
  nama: string;
  parent_nama?: string;
  total_kerugian: number;
  total_meninggal: number;
  total_luka: number;
  total_terdampak: number;
  jumlah_pengungsi: number;
  jumlah_kejadian: number;
  rumah_rusak_berat: number;
  rumah_rusak_sedang: number;
  rumah_rusak_ringan: number;
  fasilitas_umum_rusak: number;
  fasilitas_kesehatan_rusak: number;
  sekolah_rusak: number;
  terakhir_refresh?: string;
  tingkat_risiko: 'rendah' | 'sedang' | 'tinggi';
  kejadian_terbaru: KejadianRingkas[];
}

interface WilayahPanelProps {
  data: WilayahDampakData | null;
  loading: boolean;
  onClose: () => void;
  onFocusRegion?: () => void;
}

export const WilayahPanel: React.FC<WilayahPanelProps> = ({
  data,
  loading,
  onClose,
  onFocusRegion
}) => {
  if (!data && !loading) return null;

  // Format Rupiah
  const formatRupiah = (nominal: number) => {
    if (nominal >= 1_000_000_000) {
      return `Rp ${(nominal / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Miliar`;
    }
    if (nominal >= 1_000_000) {
      return `Rp ${(nominal / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Juta`;
    }
    return `Rp ${nominal.toLocaleString('id-ID')}`;
  };

  const getDisasterIcon = (jenis: string) => {
    switch (jenis.toLowerCase()) {
      case 'banjir':
        return <Waves className="w-3.5 h-3.5 text-blue-400" />;
      case 'longsor':
        return <Mountain className="w-3.5 h-3.5 text-amber-500" />;
      case 'gempa':
      case 'tsunami':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      case 'erupsi':
        return <Flame className="w-3.5 h-3.5 text-rose-500" />;
      case 'angin_puting_beliung':
        return <Wind className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'tinggi':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#C0392B]/20 text-[#E74C3C] border border-[#C0392B]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C0392B] animate-pulse" />
            Risiko Tinggi
          </span>
        );
      case 'sedang':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#D98E04]/20 text-[#F39C12] border border-[#D98E04]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D98E04]" />
            Risiko Sedang
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#1E7A46]/20 text-[#2ECC71] border border-[#1E7A46]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E7A46]" />
            Risiko Rendah
          </span>
        );
    }
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return 'Realtime';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return isoString;
    }
  };

  return (
    <aside 
      className="absolute top-16 right-4 z-30 w-96 max-h-[calc(100vh-5.5rem)] bg-[#1B2733]/95 backdrop-blur-xl border border-[#2D3F52] rounded-xl shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-250 ease-out overflow-hidden"
      aria-label="Panel Data Dampak Wilayah"
    >
      {/* 1. Header Panel */}
      <div className="p-4 border-b border-[#2D3F52] bg-[#0F1720]/60 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Kecamatan
            </span>
            {data && getRiskBadge(data.tingkat_risiko)}
          </div>
          <h2 className="text-lg font-bold font-display text-white tracking-tight">
            {data?.nama || 'Memuat Wilayah...'}
          </h2>
          <p className="text-xs text-slate-400">
            {data?.parent_nama || 'Provinsi Sumatera Barat'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {onFocusRegion && (
            <button
              onClick={onFocusRegion}
              title="Pusatkan peta ke kecamatan ini"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2D3F52] transition-colors"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            title="Tutup panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2D3F52] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Loading State */}
      {loading && (
        <div className="p-6 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono">Mengambil agregasi data dampak...</p>
        </div>
      )}

      {/* 3. Konten Data Dampak */}
      {!loading && data && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Card Utama: Total Kerugian Finansial */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#1E3A5F]/60 to-[#0F1720]/80 border border-[#3A5A82]/50 shadow-inner">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Estimasi Total Kerugian
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {data.jumlah_kejadian} Kejadian
              </span>
            </div>
            <div className="text-xl font-bold font-display tracking-tight text-amber-300">
              {formatRupiah(data.total_kerugian)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Rp {data.total_kerugian.toLocaleString('id-ID')}
            </div>
          </div>

          {/* Grid Metrik Korban Manusia */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Dampak Terhadap Masyarakat
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-[#0F1720]/70 border border-[#2D3F52] text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Meninggal</span>
                <span className={`text-base font-bold font-display ${data.total_meninggal > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  {data.total_meninggal}
                </span>
                <span className="text-[10px] text-slate-500 block">jiwa</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0F1720]/70 border border-[#2D3F52] text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Luka-luka</span>
                <span className={`text-base font-bold font-display ${data.total_luka > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {data.total_luka}
                </span>
                <span className="text-[10px] text-slate-500 block">orang</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0F1720]/70 border border-[#2D3F52] text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Pengungsi</span>
                <span className="text-base font-bold font-display text-blue-300">
                  {data.jumlah_pengungsi.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-500 block">jiwa</span>
              </div>
            </div>
          </div>

          {/* Kerusakan Rumah & Fasilitas Publik */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Kerusakan Infrastruktur & Fasilitas
            </h3>
            <div className="p-3 rounded-xl bg-[#0F1720]/60 border border-[#2D3F52] space-y-2 text-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-[#2D3F52]/60">
                <span className="text-slate-300">Rumah Rusak Berat (RB)</span>
                <span className="font-mono font-semibold text-red-400">{data.rumah_rusak_berat} unit</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#2D3F52]/60">
                <span className="text-slate-300">Rumah Rusak Sedang (RS)</span>
                <span className="font-mono font-semibold text-amber-400">{data.rumah_rusak_sedang} unit</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#2D3F52]/60">
                <span className="text-slate-300">Rumah Rusak Ringan (RR)</span>
                <span className="font-mono font-semibold text-slate-300">{data.rumah_rusak_ringan} unit</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#2D3F52]/60">
                <span className="text-slate-300">Fasilitas Umum Rusak</span>
                <span className="font-mono font-semibold text-slate-200">{data.fasilitas_umum_rusak} titik</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Fasilitas Kesehatan / Sekolah</span>
                <span className="font-mono font-semibold text-slate-200">
                  {data.fasilitas_kesehatan_rusak + data.sekolah_rusak} unit
                </span>
              </div>
            </div>
          </div>

          {/* Riwayat Kejadian Bencana Terdaftar */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Catatan Kejadian Terverifikasi
            </h3>
            {data.kejadian_terbaru && data.kejadian_terbaru.length > 0 ? (
              <div className="space-y-2">
                {data.kejadian_terbaru.map((kejadian) => (
                  <div 
                    key={kejadian.id} 
                    className="p-2.5 rounded-lg bg-[#0F1720]/70 border border-[#2D3F52] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200 capitalize">
                        {getDisasterIcon(kejadian.jenis_bencana)}
                        <span>{kejadian.jenis_bencana.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(kejadian.tanggal_kejadian).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    {kejadian.deskripsi && (
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {kejadian.deskripsi}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#0F1720]/40 border border-[#2D3F52]/50 text-center text-xs text-slate-400">
                Tidak ada riwayat bencana besar tercatat untuk wilayah ini.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Footer Panel (Data Freshness Telemetry) */}
      <div className="p-3 border-t border-[#2D3F52] bg-[#0F1720]/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-400" />
          Data per: <span className="text-slate-300">{formatTimestamp(data?.terakhir_refresh)}</span>
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E3A5F]/70 text-blue-200 border border-[#3A5A82]/40">
          MV_PostGIS
        </span>
      </div>
    </aside>
  );
};
