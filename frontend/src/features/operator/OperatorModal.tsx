import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Mail, 
  KeyRound, 
  AlertOctagon, 
  X, 
  LogOut, 
  CheckCircle, 
  RefreshCw,
  Radio,
  FileText,
  CheckCircle2,
  Copy
} from 'lucide-react';

export interface UserSession {
  id: number;
  nama: string;
  email: string;
  role: 'operator' | 'admin' | 'pimpinan';
  wilayah_tugas_id?: number | null;
}

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onLoginSuccess: (user: UserSession, token: string) => void;
  onLogout: () => void;
  onJalanCreated?: () => void;
}

export const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  onJalanCreated,
}) => {
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab navigasi per-role
  const [operatorTab, setOperatorTab] = useState<'tambah_jalan' | 'daftar_jalan' | 'kelola_posko'>('tambah_jalan');
  const [adminTab, setAdminTab] = useState<'pengguna' | 'sync_bmkg' | 'blokade'>('pengguna');

  // Form Tambah Jalan Terputus (Operator)
  const [alasan, setAlasan] = useState('longsor');
  const [deskripsi, setDeskripsi] = useState('');
  const [presetLokasi, setPresetLokasi] = useState('sitinjau');
  const [submittingJalan, setSubmittingJalan] = useState(false);

  // Data List Jalan Terputus (Operator & Admin)
  const [jalanList, setJalanList] = useState<any[]>([]);

  // Data Posko (Operator)
  const [poskoList, setPoskoList] = useState<any[]>([]);
  const [selectedPoskoId, setSelectedPoskoId] = useState<number | null>(null);
  const [newPoskoStatus, setNewPoskoStatus] = useState<string>('aktif');
  const [updatingPosko, setUpdatingPosko] = useState(false);

  // Data Pengguna (Admin)
  const [userList, setUserList] = useState<any[]>([]);

  // Data Eksekutif (Pimpinan)
  const [statistikData, setStatistikData] = useState<any | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Sync BMKG State (Admin)
  const [syncingBmkg, setSyncingBmkg] = useState(false);

  // Load Data Sesuai Role
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    if (currentUser.role === 'operator') {
      loadJalanTerputus();
      loadPosko();
    } else if (currentUser.role === 'admin') {
      loadUsers();
      loadJalanTerputus();
    } else if (currentUser.role === 'pimpinan') {
      loadStatistik();
    }
  }, [isOpen, currentUser]);

  const loadJalanTerputus = () => {
    fetch('/api/jalan-terputus')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.features) setJalanList(data.features);
      })
      .catch(() => {});
  };

  const loadPosko = () => {
    fetch('/api/posko')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.features) {
          setPoskoList(data.features);
          if (data.features.length > 0 && !selectedPoskoId) {
            setSelectedPoskoId(data.features[0].properties.id);
            setNewPoskoStatus(data.features[0].properties.status);
          }
        }
      })
      .catch(() => {});
  };

  const loadUsers = () => {
    fetch('/api/admin/pengguna')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.data) setUserList(data.data);
      })
      .catch(() => {});
  };

  const loadStatistik = () => {
    fetch('/api/admin/statistik')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStatistikData(data);
      })
      .catch(() => {});
  };

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail?.error?.message || 'Gagal masuk. Periksa kredensial Anda.');
      }

      onLoginSuccess(data.user, data.access_token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan pada server autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleType: 'operator' | 'admin' | 'pimpinan') => {
    if (roleType === 'operator') {
      setEmail('operator.padang@sumbarprov.go.id');
      setPassword('OperatorPadang2026!');
    } else if (roleType === 'admin') {
      setEmail('admin@sumbarprov.go.id');
      setPassword('AdminSumbar2026!');
    } else {
      setEmail('pimpinan@sumbarprov.go.id');
      setPassword('PimpinanSumbar2026!');
    }
  };

  const handleSimpanJalan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingJalan(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let coords: number[][] = [];
    if (presetLokasi === 'sitinjau') {
      coords = [[100.4650, -0.9520], [100.4720, -0.9560], [100.4780, -0.9590]];
    } else if (presetLokasi === 'khatib') {
      coords = [[100.3580, -0.9150], [100.3620, -0.9080], [100.3650, -0.9020]];
    } else {
      coords = [[100.3550, -0.9450], [100.3580, -0.9400]];
    }

    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch('/api/jalan-terputus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          geometry: { coordinates: coords },
          alasan: alasan,
          deskripsi: deskripsi || `Ruas jalan terputus akibat ${alasan}.`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail?.error?.message || 'Gagal mencatat jalan.');

      setSuccessMsg('Ruas jalan terputus berhasil ditambahkan! Rute evakuasi otomatis menghindar.');
      setDeskripsi('');
      loadJalanTerputus();
      if (onJalanCreated) onJalanCreated();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingJalan(false);
    }
  };

  const handlePulihkanJalan = async (id: number) => {
    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch(`/api/jalan-terputus/${id}/pulihkan`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('Gagal memulihkan jalan');
      setSuccessMsg('Ruas jalan berhasil dipulihkan dan dibuka kembali untuk jalur evakuasi.');
      loadJalanTerputus();
      if (onJalanCreated) onJalanCreated();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateStatusPosko = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoskoId) return;
    setUpdatingPosko(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch(`/api/posko/${selectedPoskoId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newPoskoStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail?.error?.message || 'Gagal mengubah status posko');

      setSuccessMsg(data.message || 'Status posko berhasil diperbarui!');
      loadPosko();
      if (onJalanCreated) onJalanCreated();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUpdatingPosko(false);
    }
  };

  const handlePicuSyncBmkg = async () => {
    setSyncingBmkg(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/eksternal/sync-gempa', { method: 'POST' });
      if (!res.ok) throw new Error('Gagal memicu sinkronisasi');
      setSuccessMsg('Sinkronisasi BMKG berhasil dijalankan. Data gempa terbaru tersimpan di PostGIS.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSyncingBmkg(false);
    }
  };

  const handleCopyLaporanPimpinan = () => {
    if (!statistikData) return;
    const r = statistikData.ringkasan;
    const textReport = `LAPORAN SIAGA KEBENCANAAN SUMATERA BARAT (BPBD)
Waktu: ${new Date().toLocaleString('id-ID')}
Status: ${statistikData.status_siaga}

• Total Estimasi Kerugian: Rp ${(r.total_kerugian / 1_000_000_000).toFixed(2)} Miliar
• Korban Jiwa / Luka: ${r.total_meninggal} Jiwa / ${r.total_luka} Terluka
• Pengungsi Terdampak: ${r.total_pengungsi.toLocaleString('id-ID')} Jiwa
• Posko Evakuasi Aktif: ${r.posko_aktif} Posko (Kapasitas: ${r.total_kapasitas_posko.toLocaleString('id-ID')} Jiwa)
• Ruas Jalan Terputus (Blokade): ${r.jalan_terputus_aktif} Ruas

Prioritas Wilayah Siaga 1:
${statistikData.prioritas_wilayah.map((w: any, idx: number) => `${idx + 1}. Kec. ${w.nama} (Kerugian: Rp ${(w.total_kerugian / 1_000_000_000).toFixed(2)} M, ${w.total_meninggal} Korban)`).join('\n')}
`;
    navigator.clipboard.writeText(textReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0F1720] border border-[#243444] rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* HEADER MODAL BERDASARKAN ROLE */}
        <div className={`p-4 border-b border-[#243444] flex items-center justify-between ${
          currentUser?.role === 'pimpinan' 
            ? 'bg-gradient-to-r from-[#805d15] to-[#0F1720]' 
            : currentUser?.role === 'admin'
            ? 'bg-gradient-to-r from-[#1E3A5F] to-[#0F1720]'
            : 'bg-gradient-to-r from-[#78350F] to-[#0F1720]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/20 text-white">
              {currentUser?.role === 'pimpinan' ? (
                <FileText className="w-5 h-5 text-amber-300" />
              ) : currentUser?.role === 'admin' ? (
                <Shield className="w-5 h-5 text-blue-300" />
              ) : (
                <Radio className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-display">
                {currentUser?.role === 'pimpinan'
                  ? 'Dashboard Eksekutif Pimpinan BPBD'
                  : currentUser?.role === 'admin'
                  ? 'Konsol Administrator Pusdalops PB Sumbar'
                  : currentUser
                  ? 'Portal Operasional Operator Lapangan'
                  : 'Portal Petugas Kebencanaan BPBD'}
              </h2>
              <p className="text-[11px] text-slate-300">
                {currentUser?.role === 'pimpinan'
                  ? 'Ringkasan Kebijakan & Tanggap Darurat Provinsi'
                  : currentUser?.role === 'admin'
                  ? 'Manajemen Pengguna, Kontrol BMKG & Blokade'
                  : currentUser
                  ? 'Wilayah Penugasan: Kota Padang (Siaga 1)'
                  : 'Sistem Kontrol Akses Berbasis Peran (RBAC)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFIKASI ERROR / SUKSES */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* KONTEN UTAMA */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {currentUser ? (
            <div className="space-y-4">
              {/* Profil Header Pengguna */}
              <div className="p-3.5 rounded-xl bg-[#1B2733] border border-[#2B3C4E] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{currentUser.nama}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                      currentUser.role === 'pimpinan'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : currentUser.role === 'admin'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{currentUser.email}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar
                </button>
              </div>

              {/* ========================================================= */}
              {/* 1. TAMPILAN OPERATOR: Blokade Jalan, Pulihkan, Kelola Posko */}
              {/* ========================================================= */}
              {currentUser.role === 'operator' && (
                <div className="space-y-3">
                  {/* Tabs Navigasi Operator */}
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#131E2A] rounded-xl border border-[#243444]">
                    <button
                      onClick={() => setOperatorTab('tambah_jalan')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        operatorTab === 'tambah_jalan' ? 'bg-[#1E3A5F] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Tandai Jalan Putus
                    </button>
                    <button
                      onClick={() => setOperatorTab('daftar_jalan')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        operatorTab === 'daftar_jalan' ? 'bg-[#1E3A5F] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Ruas Aktif ({jalanList.length})
                    </button>
                    <button
                      onClick={() => setOperatorTab('kelola_posko')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        operatorTab === 'kelola_posko' ? 'bg-[#1E3A5F] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Status Posko
                    </button>
                  </div>

                  {/* Tab 1: Form Tambah Jalan */}
                  {operatorTab === 'tambah_jalan' && (
                    <form onSubmit={handleSimpanJalan} className="p-4 rounded-xl bg-[#131E2A] border border-[#243444] space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">Pilih Ruas Rawan Longsor/Banjir:</label>
                        <select
                          value={presetLokasi}
                          onChange={(e) => setPresetLokasi(e.target.value)}
                          className="w-full bg-[#1B2733] border border-[#2B3C4E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="sitinjau">Jalur Sitinjau Lauik (Padang - Solok) - Rawan Longsor Tebing</option>
                          <option value="khatib">Jl. Khatib Sulaiman (Padang Utara) - Genangan Banjir</option>
                          <option value="sudirman">Jl. Jenderal Sudirman (Padang Barat) - Pohon Tumbang</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-slate-300 mb-1">Alasan Blokade:</label>
                          <select
                            value={alasan}
                            onChange={(e) => setAlasan(e.target.value)}
                            className="w-full bg-[#1B2733] border border-[#2B3C4E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="longsor">Longsor Tebing</option>
                            <option value="banjir">Banjir Luapan</option>
                            <option value="jembatan_putus">Jembatan Putus</option>
                            <option value="kerusakan_jalan">Kerusakan Jalan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-slate-300 mb-1">Status Blokade:</label>
                          <input
                            type="text"
                            disabled
                            value="Aktif (Rute Memutar)"
                            className="w-full bg-[#1B2733]/50 border border-[#2B3C4E] rounded-lg px-3 py-2 text-xs text-amber-400 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">Deskripsi Lapangan:</label>
                        <textarea
                          rows={2}
                          value={deskripsi}
                          onChange={(e) => setDeskripsi(e.target.value)}
                          placeholder="Contoh: Material batu besar menutup seluruh badan jalan..."
                          className="w-full bg-[#1B2733] border border-[#2B3C4E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingJalan}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
                      >
                        {submittingJalan ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Aktifkan Blokade Jalan'}
                      </button>
                    </form>
                  )}

                  {/* Tab 2: Daftar Jalan Putus & Pulihkan */}
                  {operatorTab === 'daftar_jalan' && (
                    <div className="space-y-2">
                      {jalanList.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 bg-[#131E2A] rounded-xl border border-[#243444]">
                          Tidak ada ruas jalan yang terputus saat ini. Seluruh jalur evakuasi berstatus lancar.
                        </div>
                      ) : (
                        jalanList.map((item) => (
                          <div
                            key={item.properties.id}
                            className="p-3 rounded-xl bg-[#1B2733] border border-[#2B3C4E] flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-rose-400 uppercase">
                                  {item.properties.alasan}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  ID #{item.properties.id}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 mt-1">
                                {item.properties.deskripsi || 'Ruas tertutup bencana.'}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Lapor: {item.properties.tanggal_lapor ? new Date(item.properties.tanggal_lapor).toLocaleTimeString('id-ID') : '-'} WIB
                              </span>
                            </div>

                            <button
                              onClick={() => handlePulihkanJalan(item.properties.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pulihkan
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 3: Kelola Status Posko */}
                  {operatorTab === 'kelola_posko' && (
                    <form onSubmit={handleUpdateStatusPosko} className="p-4 rounded-xl bg-[#131E2A] border border-[#243444] space-y-3">
                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">Pilih Posko Evakuasi:</label>
                        <select
                          value={selectedPoskoId || ''}
                          onChange={(e) => {
                            const pId = Number(e.target.value);
                            setSelectedPoskoId(pId);
                            const found = poskoList.find((p) => p.properties.id === pId);
                            if (found) setNewPoskoStatus(found.properties.status);
                          }}
                          className="w-full bg-[#1B2733] border border-[#2B3C4E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          {poskoList.map((p) => (
                            <option key={p.properties.id} value={p.properties.id}>
                              {p.properties.nama} ({p.properties.status})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">Ubah Status Daya Tampung:</label>
                        <select
                          value={newPoskoStatus}
                          onChange={(e) => setNewPoskoStatus(e.target.value)}
                          className="w-full bg-[#1B2733] border border-[#2B3C4E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        >
                          <option value="aktif">Aktif (Masih Siap Menerima Pengungsi)</option>
                          <option value="penuh">Penuh (Kapasitas Maksimal — Alihkan Rute)</option>
                          <option value="nonaktif">Nonaktif (Dalam Perbaikan/Tidak Beroperasi)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={updatingPosko}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
                      >
                        {updatingPosko ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Perbarui Status Posko'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 2. TAMPILAN ADMIN: Manajemen Pengguna & Kontrol BMKG       */}
              {/* ========================================================= */}
              {currentUser.role === 'admin' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#131E2A] rounded-xl border border-[#243444]">
                    <button
                      onClick={() => setAdminTab('pengguna')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        adminTab === 'pengguna' ? 'bg-[#1E3A5F] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Daftar Petugas
                    </button>
                    <button
                      onClick={() => setAdminTab('sync_bmkg')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        adminTab === 'sync_bmkg' ? 'bg-[#1E3A5F] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Sinkronisasi BMKG
                    </button>
                    <button
                      onClick={() => setAdminTab('blokade')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        adminTab === 'blokade' ? 'bg-[#1E3A5F] text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua Blokade ({jalanList.length})
                    </button>
                  </div>

                  {/* Tab 1: Manajemen Pengguna */}
                  {adminTab === 'pengguna' && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1">
                        Daftar Akun Pengguna Terdaftar (PostgreSQL):
                      </div>
                      {userList.map((u) => (
                        <div key={u.id} className="p-3 rounded-xl bg-[#1B2733] border border-[#2B3C4E] flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{u.nama}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {u.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                            <div className="text-[10px] text-slate-500">Penugasan: {u.wilayah_tugas}</div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Aktif
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab 2: Kontrol BMKG */}
                  {adminTab === 'sync_bmkg' && (
                    <div className="p-4 rounded-xl bg-[#131E2A] border border-[#243444] space-y-3">
                      <div className="flex items-center gap-3">
                        <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
                        <div>
                          <div className="text-xs font-bold text-white">Worker Sinkronisasi BMKG Otomatis</div>
                          <div className="text-[11px] text-slate-400">Jadwal: Setiap 5 menit via APScheduler FastAPI</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        Sistem mengambil data <code className="text-amber-300 font-mono">autogempa.json</code> dari BMKG dan menyimpan episentrum gempa dengan koordinat bujur/lintang yang telah disanitasi ke PostGIS.
                      </p>

                      <button
                        onClick={handlePicuSyncBmkg}
                        disabled={syncingBmkg}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow"
                      >
                        {syncingBmkg ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Picu Sinkronisasi BMKG Sekarang'}
                      </button>
                    </div>
                  )}

                  {/* Tab 3: Semua Blokade */}
                  {adminTab === 'blokade' && (
                    <div className="space-y-2">
                      {jalanList.map((item) => (
                        <div key={item.properties.id} className="p-3 rounded-xl bg-[#1B2733] border border-[#2B3C4E] flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-rose-400 uppercase">{item.properties.alasan}</span>
                            <p className="text-xs text-slate-200 mt-0.5">{item.properties.deskripsi}</p>
                          </div>
                          <button
                            onClick={() => handlePulihkanJalan(item.properties.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                          >
                            Buka Jalan
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 3. TAMPILAN PIMPINAN: Executive KPI & Ringkasan Kebijakan  */}
              {/* ========================================================= */}
              {currentUser.role === 'pimpinan' && statistikData && (
                <div className="space-y-3">
                  {/* Status Siaga Darurat */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/80 to-amber-950/80 border border-amber-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-amber-300 uppercase tracking-wider block">STATUS PROVINSI:</span>
                      <span className="text-sm font-bold text-white font-display tracking-wide">{statistikData.status_siaga}</span>
                    </div>
                    <button
                      onClick={handleCopyLaporanPimpinan}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedReport ? 'Tersalin!' : 'Salin Laporan Forkopimda'}
                    </button>
                  </div>

                  {/* Grid 4 Kartu KPI Eksekutif */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#1B2733] border border-[#2B3C4E]">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Estimasi Kerugian</div>
                      <div className="text-base font-bold text-rose-400 font-display mt-0.5">
                        Rp {(statistikData.ringkasan.total_kerugian / 1_000_000_000).toFixed(2)} Miliar
                      </div>
                      <div className="text-[10px] text-slate-500">Dari {statistikData.ringkasan.total_kejadian} Kejadian Bencana</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1B2733] border border-[#2B3C4E]">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Korban & Pengungsi</div>
                      <div className="text-base font-bold text-amber-400 font-display mt-0.5">
                        {statistikData.ringkasan.total_meninggal} Jiwa ({statistikData.ringkasan.total_luka} Luka)
                      </div>
                      <div className="text-[10px] text-slate-500">{statistikData.ringkasan.total_pengungsi.toLocaleString('id-ID')} Pengungsi</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1B2733] border border-[#2B3C4E]">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Kesiapsiagaan Posko</div>
                      <div className="text-base font-bold text-emerald-400 font-display mt-0.5">
                        {statistikData.ringkasan.posko_aktif} Posko Aktif
                      </div>
                      <div className="text-[10px] text-slate-500">Kapasitas {statistikData.ringkasan.total_kapasitas_posko.toLocaleString('id-ID')} Jiwa</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1B2733] border border-[#2B3C4E]">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Blokade Jalan</div>
                      <div className="text-base font-bold text-cyan-400 font-display mt-0.5">
                        {statistikData.ringkasan.jalan_terputus_aktif} Ruas Terputus
                      </div>
                      <div className="text-[10px] text-slate-500">Rute evakuasi otomatis dialihkan</div>
                    </div>
                  </div>

                  {/* Prioritas Wilayah Terdampak */}
                  <div className="p-3.5 rounded-xl bg-[#131E2A] border border-[#243444]">
                    <div className="text-[11px] font-mono text-slate-300 uppercase tracking-wider mb-2">
                      Wilayah Prioritas Penanganan Darurat:
                    </div>
                    <div className="space-y-1.5">
                      {statistikData.prioritas_wilayah.map((w: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#243444]/60 last:border-none">
                          <span className="font-semibold text-slate-200">{idx + 1}. Kec. {w.nama}</span>
                          <span className="font-mono text-rose-400 font-bold">
                            Rp {(w.total_kerugian / 1_000_000_000).toFixed(2)} M ({w.total_meninggal} Jiwa)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Form Login */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">Email Petugas:</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator.padang@sumbarprov.go.id"
                    className="w-full bg-[#1B2733] border border-[#2B3C4E] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">Kata Sandi:</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#1B2733] border border-[#2B3C4E] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#1E3A5F] hover:bg-[#2B4E7E] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Masuk ke Panel Petugas'}
              </button>

              {/* 3 Tombol Demo Cepat RBAC */}
              <div className="border-t border-[#243444] pt-3">
                <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                  Akses Demo Cepat Berdasarkan 3 Peran:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('operator')}
                    className="p-2 rounded-lg bg-[#1B2733] hover:bg-[#223141] border border-[#2B3C4E] text-left transition-colors"
                  >
                    <div className="text-[10px] font-bold text-emerald-300">1. Operator</div>
                    <div className="text-[9px] text-slate-400">Blokade & Posko</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className="p-2 rounded-lg bg-[#1B2733] hover:bg-[#223141] border border-[#2B3C4E] text-left transition-colors"
                  >
                    <div className="text-[10px] font-bold text-blue-300">2. Admin BPBD</div>
                    <div className="text-[9px] text-slate-400">Pengguna & Sync</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('pimpinan')}
                    className="p-2 rounded-lg bg-[#1B2733] hover:bg-[#223141] border border-[#2B3C4E] text-left transition-colors"
                  >
                    <div className="text-[10px] font-bold text-amber-300">3. Pimpinan</div>
                    <div className="text-[9px] text-slate-400">KPI & Kebijakan</div>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
