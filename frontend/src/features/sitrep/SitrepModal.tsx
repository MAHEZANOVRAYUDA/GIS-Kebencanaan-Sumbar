import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  Download, 
  AlertOctagon, 
  Users, 
  ShieldAlert, 
  DollarSign, 
  Building2, 
  Volume2, 
  RefreshCw, 
  X 
} from 'lucide-react';

interface SitrepData {
  metadata: {
    judul: string;
    waktu_generate: string;
    institusi: string;
    klasifikasi: string;
  };
  kpi: {
    total_meninggal: number;
    total_hilang: number;
    total_luka: number;
    total_pengungsi: number;
    total_terdampak: number;
    total_kerugian_miliar: number;
    posko_aktif: number;
    kapasitas_posko: number;
    shelter_tes_count: number;
    sirine_aktif: number;
    sirine_total: number;
    jalan_terputus_aktif: number;
  };
  wilayah_prioritas: {
    nama: string;
    meninggal: number;
    pengungsi: number;
    kerugian_miliar: number;
  }[];
  gempa_terakhir?: {
    magnitude?: number;
    kedalaman?: number;
    lokasi?: string;
  } | null;
  whatsapp_formatted: string;
}

interface SitrepModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SitrepModal: React.FC<SitrepModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<SitrepData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'kpi' | 'raw_text'>('kpi');

  const fetchSitrep = () => {
    setLoading(true);
    fetch('/api/admin/sitrep')
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData) setData(resData);
      })
      .catch((err) => console.error('Gagal mengambil SITREP:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchSitrep();
    }
  }, [isOpen]);

  const handleCopyWhatsApp = () => {
    if (!data?.whatsapp_formatted) return;
    navigator.clipboard.writeText(data.whatsapp_formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadText = () => {
    if (!data?.whatsapp_formatted) return;
    const blob = new Blob([data.whatsapp_formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SITREP_BPBD_SUMBAR_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#0F1720] border border-[#243444] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#243444] bg-[#162330]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white font-display">
                  LAPORAN SITUASI (SITREP) DARURAT
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  BNPB STANDARD
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                BPBD Prov. Sumbar × Riset LPPM UPI YPTK • {data?.metadata.waktu_generate || 'Sinkronisasi...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSitrep}
              disabled={loading}
              className="p-2 rounded-lg bg-[#0F1720] border border-[#243444] text-slate-400 hover:text-white hover:bg-[#1B2733] transition-colors"
              title="Perbarui Data Terkini"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#0F1720] border border-[#243444] text-slate-400 hover:text-white hover:bg-[#1B2733] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigasi */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-[#243444] bg-[#121D28]">
          <button
            onClick={() => setActiveTab('kpi')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'kpi'
                ? 'border-amber-400 text-amber-300 bg-[#162330]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Ringkasan Eksekutif & Prioritas Wilayah
          </button>
          <button
            onClick={() => setActiveTab('raw_text')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'raw_text'
                ? 'border-amber-400 text-amber-300 bg-[#162330]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Format Teks WhatsApp Forkopimda
          </button>
        </div>

        {/* Body Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading && !data ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">
                Menghitung data dampak agregat dari PostGIS...
              </p>
            </div>
          ) : data && activeTab === 'kpi' ? (
            <>
              {/* 1. Grid KPI Kunci */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display mb-3">
                  1. Dampak Kemanusiaan & Kerugian Finansial (Rekapitulasi Riil BPBD)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#162330] border border-[#243444]">
                    <div className="flex items-center gap-2 text-rose-400 text-xs mb-1">
                      <AlertOctagon className="w-4 h-4" />
                      <span>Korban Jiwa</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-display text-white">
                      {data.kpi.total_meninggal} <span className="text-xs font-normal text-slate-400">MD</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Hilang: {data.kpi.total_hilang} • Luka: {data.kpi.total_luka}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#162330] border border-[#243444]">
                    <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
                      <Users className="w-4 h-4" />
                      <span>Pengungsi</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-display text-white">
                      {data.kpi.total_pengungsi.toLocaleString()} <span className="text-xs font-normal text-slate-400">Jiwa</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Terdampak: {data.kpi.total_terdampak.toLocaleString()} Jiwa
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#162330] border border-[#243444]">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span>Kerugian Finansial</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-display text-white">
                      Rp {data.kpi.total_kerugian_miliar} <span className="text-xs font-normal text-slate-400">Miliar</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Estimasi Pemukiman & Fasum
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#162330] border border-[#243444]">
                    <div className="flex items-center gap-2 text-sky-400 text-xs mb-1">
                      <Building2 className="w-4 h-4" />
                      <span>Kesiapan Posko</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold font-display text-white">
                      {data.kpi.posko_aktif} <span className="text-xs font-normal text-slate-400">Posko</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Kapasitas: {data.kpi.kapasitas_posko.toLocaleString()} Jiwa
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Kesiapan Jaringan Mitigasi Tsunami & Blokade */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display mb-3">
                  2. Status Infrastruktur & Mitigasi Tsunami
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#162330] border border-[#243444] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Shelter TES Vertikal Padang</span>
                      <span className="text-lg font-bold text-sky-300 font-display">
                        {data.kpi.shelter_tes_count} Gedung
                      </span>
                    </div>
                    <Building2 className="w-6 h-6 text-sky-400/60" />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#162330] border border-[#243444] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">EWS Sirine Tsunami Pesisir</span>
                      <span className="text-lg font-bold text-amber-300 font-display">
                        {data.kpi.sirine_aktif} / {data.kpi.sirine_total} Aktif
                      </span>
                    </div>
                    <Volume2 className="w-6 h-6 text-amber-400/60" />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#162330] border border-[#243444] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Ruas Jalan Terputus (Blokade)</span>
                      <span className="text-lg font-bold text-rose-300 font-display">
                        {data.kpi.jalan_terputus_aktif} Titik
                      </span>
                    </div>
                    <ShieldAlert className="w-6 h-6 text-rose-400/60" />
                  </div>
                </div>
              </div>

              {/* 3. Tabel Prioritas Wilayah Tertinggi */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display mb-3">
                  3. Peringkat 5 Kabupaten/Kota Prioritas Penanganan Darurat
                </h3>
                <div className="overflow-x-auto rounded-xl border border-[#243444]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1B2733] text-slate-400 font-mono text-[11px]">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Kabupaten / Kota</th>
                        <th className="p-3 text-right">Korban Jiwa (MD)</th>
                        <th className="p-3 text-right">Pengungsi</th>
                        <th className="p-3 text-right">Est. Kerugian (Miliar)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#243444] font-mono">
                      {data.wilayah_prioritas.map((w, i) => (
                        <tr key={w.nama} className="hover:bg-[#162330]/50 transition-colors">
                          <td className="p-3 text-slate-500 font-bold">{i + 1}</td>
                          <td className="p-3 font-sans font-semibold text-slate-200">{w.nama}</td>
                          <td className="p-3 text-right text-rose-400 font-bold">{w.meninggal}</td>
                          <td className="p-3 text-right text-amber-300">{w.pengungsi.toLocaleString()}</td>
                          <td className="p-3 text-right text-emerald-400">Rp {w.kerugian_miliar} M</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : data && activeTab === 'raw_text' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Teks ringkasan telah diformat tebal (*bold*) dan miring (_italic_) sesuai standar WhatsApp.</span>
              </div>
              <pre className="p-4 rounded-xl bg-[#090D12] border border-[#243444] text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto selection:bg-amber-500/30">
                {data.whatsapp_formatted}
              </pre>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#243444] bg-[#162330] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-mono">
            Status: Terverifikasi oleh Pusdalops PB Provinsi Sumatera Barat
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadText}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0F1720] border border-[#243444] text-slate-300 hover:text-white hover:bg-[#1B2733] text-xs font-semibold transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Unduh SITREP (.txt)</span>
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/40 transform active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Ringkasan WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
