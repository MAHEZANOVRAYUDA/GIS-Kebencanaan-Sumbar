import React, { useState, useEffect } from 'react';
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
  Wind,
  Info,
  Navigation,
  MapPin,
  Radio,
  Heart,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

export interface KejadianRingkas {
  id: number;
  jenis_bencana: string;
  tanggal_kejadian: string;
  deskripsi?: string;
  status_verifikasi: string;
}

export interface ParentDampakData {
  nama_wilayah: string;
  tingkat: string;
  total_meninggal: number;
  total_luka: number;
  jumlah_pengungsi: number;
  total_kerugian: number;
  jumlah_kejadian: number;
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
  center?: { lat: number; lng: number };
  kejadian_terbaru: KejadianRingkas[];
  parent_dampak?: ParentDampakData | null;
}

export interface FasilitasTerdekat {
  id: number;
  nama: string;
  jenis: string;
  lat: number;
  lon: number;
  kapasitas?: number;
  status?: string;
  jarak_meter?: number;
}

interface WilayahPanelProps {
  data: WilayahDampakData | null;
  loading: boolean;
  onClose: () => void;
  onFocusRegion?: () => void;
  onStartEvakuasiRoute?: (posko: { lat: number; lng: number; nama: string }) => void;
}

export const WilayahPanel: React.FC<WilayahPanelProps> = ({
  data,
  loading,
  onClose,
  onFocusRegion,
  onStartEvakuasiRoute,
}) => {
  // State Fasilitas Terdekat (Posko, Shelter TES, Sirine EWS)
  const [fasilitasTerdekat, setFasilitasTerdekat] = useState<FasilitasTerdekat[]>([]);
  const [loadingFasilitas, setLoadingFasilitas] = useState(false);
  const [fasilitasError, setFasilitasError] = useState<string | null>(null);

  // Handle tombol Escape keyboard untuk menutup panel (A11y)
  React.useEffect(() => {
    if (!data && !loading) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, loading, onClose]);

  // Fetch fasilitas evakuasi terdekat saat wilayah berubah
  useEffect(() => {
    if (!data?.wilayah_id) {
      setFasilitasTerdekat([]);
      return;
    }
    setLoadingFasilitas(true);
    setFasilitasError(null);

    // Coba fetch posko terdekat berdasarkan center koordinat wilayah
    const centerLat = data.center?.lat;
    const centerLng = data.center?.lng;

    const buildUrl = () => {
      if (centerLat && centerLng) {
        return `/api/posko?lat=${centerLat}&lon=${centerLng}&wilayah_id=${data.wilayah_id}&limit=5`;
      }
      return `/api/posko?wilayah_id=${data.wilayah_id}&limit=5`;
    };

    fetch(buildUrl())
      .then((res) => (res.ok ? res.json() : null))
      .then((hasil) => {
        if (Array.isArray(hasil) && hasil.length > 0) {
          setFasilitasTerdekat(hasil);
        } else if (hasil && Array.isArray(hasil.data)) {
          setFasilitasTerdekat(hasil.data);
        } else {
          setFasilitasTerdekat([]);
        }
      })
      .catch(() => {
        setFasilitasError('Tidak dapat memuat data fasilitas evakuasi terdekat.');
        setFasilitasTerdekat([]);
      })
      .finally(() => setLoadingFasilitas(false));
  }, [data?.wilayah_id, data?.center?.lat, data?.center?.lng]);

  if (!data && !loading) return null;

  // ===== UTILITY FUNCTIONS =====

  // Format Rupiah — DEFENSIVE: null/undefined-safe
  const formatRupiah = (nominal: number | null | undefined) => {
    const n = Number(nominal ?? 0);
    if (isNaN(n)) return 'Rp 0';
    if (n >= 1_000_000_000) {
      return `Rp ${(n / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} Miliar`;
    }
    if (n >= 1_000_000) {
      return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Juta`;
    }
    return `Rp ${n.toLocaleString('id-ID')}`;
  };

  // Format angka integer — DEFENSIVE: null/undefined-safe
  const safeInt = (v: number | null | undefined) => Number(v ?? 0) || 0;

  // Format jarak meter ke string
  const formatJarak = (meter?: number) => {
    if (!meter) return null;
    return meter >= 1000 ? `${(meter / 1000).toFixed(1)} km` : `${meter} m`;
  };

  const getDisasterIcon = (jenis: string) => {
    switch ((jenis || '').toLowerCase()) {
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

  const getFasilitasIcon = (jenis: string) => {
    switch ((jenis || '').toLowerCase()) {
      case 'shelter_tes_tea':
        return <Building2 className="w-4 h-4 text-sky-400" />;
      case 'sirine_tsunami':
        return <Radio className="w-4 h-4 text-amber-400" />;
      case 'fasilitas_kesehatan':
        return <Heart className="w-4 h-4 text-emerald-400" />;
      default:
        return <MapPin className="w-4 h-4 text-orange-400" />;
    }
  };

  const getFasilitasLabel = (jenis: string) => {
    switch ((jenis || '').toLowerCase()) {
      case 'shelter_tes_tea': return 'Shelter TES Tsunami';
      case 'sirine_tsunami': return 'Sirine EWS BPBD';
      case 'fasilitas_kesehatan': return 'Posko Medis & Faskes';
      default: return 'Posko Pengungsi';
    }
  };

  const getFasilitasColor = (jenis: string) => {
    switch ((jenis || '').toLowerCase()) {
      case 'shelter_tes_tea': return 'border-sky-500/40 bg-sky-950/30';
      case 'sirine_tsunami': return 'border-amber-500/40 bg-amber-950/20';
      case 'fasilitas_kesehatan': return 'border-emerald-500/40 bg-emerald-950/20';
      default: return 'border-orange-500/40 bg-orange-950/20';
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

  // Label tingkat administrasi yang akurat
  const getAdminLevelLabel = () => {
    const nama = data?.nama?.toLowerCase() || '';
    if (nama.startsWith('kota')) return 'Kota';
    if (nama.startsWith('kabupaten') || nama.startsWith('kab.')) return 'Kabupaten';
    if (data?.parent_nama && data.parent_nama !== 'Provinsi Sumatera Barat') return 'Kecamatan';
    return 'Wilayah Administrasi';
  };

  // Posko terdekat (prioritas bukan sirine)
  const poskoUtama = fasilitasTerdekat.find(
    (f) => f.jenis !== 'sirine_tsunami' && f.lat && f.lon
  ) || fasilitasTerdekat[0];

  return (
    <aside 
      className="absolute top-16 right-4 z-30 w-full max-w-[calc(100vw-2rem)] sm:w-96 max-h-[calc(100vh-5.5rem)] bg-[#1B2733]/95 backdrop-blur-xl border border-[#2D3F52] rounded-xl shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-250 ease-out overflow-hidden"
      aria-label="Panel Data Dampak Wilayah"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header Panel */}
      <div className="p-4 border-b border-[#2D3F52] bg-[#0F1720]/60 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {getAdminLevelLabel()}
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
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFocusRegion();
              }}
              title="Pusatkan peta ke wilayah ini"
              aria-label="Pusatkan peta ke wilayah ini"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2D3F52] transition-colors cursor-pointer"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Tutup panel (Esc)"
            aria-label="Tutup panel data wilayah"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2D3F52] focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-colors cursor-pointer"
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
                {safeInt(data.jumlah_kejadian)} Kejadian
              </span>
            </div>
            <div className="text-xl font-bold font-display tracking-tight text-amber-300">
              {formatRupiah(data.total_kerugian)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              Rp {safeInt(data.total_kerugian).toLocaleString('id-ID')}
            </div>
          </div>

          {/* Konteks Agregasi Wilayah Induk (Jika data lokal kecamatan belum terperinci) */}
          {data.jumlah_kejadian === 0 && data.parent_dampak && (
            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-sky-200">
                    Konteks Wilayah Induk: {data.parent_dampak.nama_wilayah || (data.parent_dampak as any).parent_nama || data.parent_nama || 'Kabupaten/Kota Induk'}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Data historis agregat {(data.parent_dampak.tingkat || 'kabupaten').toLowerCase()} mencatat <b>{data.parent_dampak.jumlah_kejadian || 1} kejadian</b> dengan total <b>{safeInt(data.parent_dampak.total_meninggal)} korban jiwa</b> dan <b>{safeInt(data.parent_dampak.jumlah_pengungsi || (data.parent_dampak as any).total_pengungsi).toLocaleString('id-ID')} pengungsi</b> ({formatRupiah(data.parent_dampak.total_kerugian)}).
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    *Kecamatan ini tidak memiliki catatan dampak individu terpisah dalam basis data BNPB/BPBD.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Grid Metrik Korban Manusia */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Dampak Terhadap Masyarakat
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-[#0F1720]/70 border border-[#2D3F52] text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Meninggal</span>
                <span className={`text-base font-bold font-display ${safeInt(data.total_meninggal) > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  {safeInt(data.total_meninggal)}
                </span>
                <span className="text-[10px] text-slate-500 block">jiwa</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0F1720]/70 border border-[#2D3F52] text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Luka-luka</span>
                <span className={`text-base font-bold font-display ${safeInt(data.total_luka) > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {safeInt(data.total_luka)}
                </span>
                <span className="text-[10px] text-slate-500 block">orang</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0F1720]/70 border border-[#2D3F52] text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">Pengungsi</span>
                <span className="text-base font-bold font-display text-blue-300">
                  {safeInt(data.jumlah_pengungsi).toLocaleString('id-ID')}
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
                <span className="font-mono font-semibold text-red-400">{safeInt(data.rumah_rusak_berat)} unit</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#2D3F52]/60">
                <span className="text-slate-300">Rumah Rusak Sedang (RS)</span>
                <span className="font-mono font-semibold text-amber-400">{safeInt(data.rumah_rusak_sedang)} unit</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#2D3F52]/60">
                <span className="text-slate-300">Rumah Rusak Ringan (RR)</span>
                <span className="font-mono font-semibold text-slate-300">{safeInt(data.rumah_rusak_ringan)} unit</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-[#2D3F52]/60">
                <span className="text-slate-300">Fasilitas Umum Rusak</span>
                <span className="font-mono font-semibold text-slate-200">{safeInt(data.fasilitas_umum_rusak)} titik</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Fasilitas Kesehatan / Sekolah</span>
                <span className="font-mono font-semibold text-slate-200">
                  {safeInt(data.fasilitas_kesehatan_rusak) + safeInt(data.sekolah_rusak)} unit
                </span>
              </div>
            </div>
          </div>

          {/* ==========================================
              SEKSI BARU: Fasilitas Mitigasi & Evakuasi
              ========================================== */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fasilitas Mitigasi &amp; Evakuasi Terdekat</span>
            </h3>

            {/* Loading Fasilitas */}
            {loadingFasilitas && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#0F1720]/50 border border-[#2D3F52]/50 text-xs text-slate-400">
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
                Memuat titik evakuasi terdekat...
              </div>
            )}

            {/* Error Fasilitas */}
            {fasilitasError && !loadingFasilitas && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/20 border border-red-500/30 text-xs text-red-300">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {fasilitasError}
              </div>
            )}

            {/* Daftar Fasilitas */}
            {!loadingFasilitas && fasilitasTerdekat.length > 0 && (
              <div className="space-y-2">
                {fasilitasTerdekat.map((f) => (
                  <div
                    key={f.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${getFasilitasColor(f.jenis)}`}
                  >
                    <div className="shrink-0">{getFasilitasIcon(f.jenis)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-100 truncate">{f.nama}</div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="uppercase font-mono">{getFasilitasLabel(f.jenis)}</span>
                        {f.kapasitas && (
                          <span className="text-slate-500">• {f.kapasitas.toLocaleString('id-ID')} jiwa</span>
                        )}
                        {f.status && f.jenis === 'sirine_tsunami' && (
                          <span className={`font-semibold ${f.status === 'aktif' ? 'text-amber-400' : 'text-slate-500'}`}>
                            • {f.status === 'aktif' ? 'Siaga' : 'Maint'}
                          </span>
                        )}
                      </div>
                      {f.jarak_meter && (
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                          📍 {formatJarak(f.jarak_meter)}
                        </div>
                      )}
                    </div>
                    {onStartEvakuasiRoute && f.lat && f.lon && f.jenis !== 'sirine_tsunami' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartEvakuasiRoute({ lat: f.lat, lng: f.lon, nama: f.nama });
                        }}
                        title={`Rute ke ${f.nama}`}
                        className="shrink-0 p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty state fasilitas */}
            {!loadingFasilitas && !fasilitasError && fasilitasTerdekat.length === 0 && (
              <div className="p-3 rounded-lg bg-[#0F1720]/40 border border-[#2D3F52]/50 text-center text-xs text-slate-400">
                <MapPin className="w-4 h-4 mx-auto mb-1.5 text-slate-500" />
                Belum ada data fasilitas evakuasi terdaftar di area ini.
              </div>
            )}

            {/* Tombol CTA Utama: Mulai Rute Evakuasi ke Posko Terdekat */}
            {onStartEvakuasiRoute && poskoUtama && (
              <button
                type="button"
                id="btn-mulai-rute-evakuasi-posko-terdekat"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEvakuasiRoute({
                    lat: poskoUtama.lat,
                    lng: poskoUtama.lon,
                    nama: poskoUtama.nama,
                  });
                }}
                className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold font-display uppercase tracking-wide shadow-lg shadow-emerald-950/50 transition-all duration-200 active:scale-98 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Mulai Rute Evakuasi ke Posko Terdekat</span>
              </button>
            )}
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
