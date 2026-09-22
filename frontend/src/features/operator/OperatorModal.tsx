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
  CheckCircle2,
  Building2,
  AlertTriangle,
  Users,
  Search,
  Plus,
  Trash2,
  Sliders,
  Check,
  ShieldCheck,
  Clock,
  Crosshair,
  History,
  Activity,
  Info
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
  onPoskoChanged?: () => void;
  onBencanaChanged?: () => void;
  pickedCoords?: { lat: number; lng: number } | null;
  onRequestPickLocation?: (target: 'posko' | 'bencana') => void;
  initialTab?: 'posko' | 'sirine' | 'bencana' | 'blokade' | 'verifikasi' | 'audit' | 'pengguna' | 'eksekutif';
}

export const OperatorModal: React.FC<OperatorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  onJalanCreated,
  onPoskoChanged,
  onBencanaChanged,
  pickedCoords,
  onRequestPickLocation,
  initialTab = 'posko',
}) => {
  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab navigasi pusat komando operasional
  type CommandTab = 'posko' | 'sirine' | 'bencana' | 'blokade' | 'verifikasi' | 'audit' | 'pengguna' | 'eksekutif';
  const [activeTab, setActiveTab] = useState<CommandTab>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // =========================================================================
  // STATE TAB 1: POSKO & SHELTER
  // =========================================================================
  const [poskoList, setPoskoList] = useState<any[]>([]);
  const [poskoSearch, setPoskoSearch] = useState('');
  const [poskoFilterJenis, setPoskoFilterJenis] = useState('semua');
  const [isAddingPosko, setIsAddingPosko] = useState(false);
  const [submittingPosko, setSubmittingPosko] = useState(false);

  // Form Tambah Posko
  const [namaPosko, setNamaPosko] = useState('');
  const [jenisPosko, setJenisPosko] = useState('posko_utama');
  const [poskoLat, setPoskoLat] = useState('-0.9471');
  const [poskoLon, setPoskoLon] = useState('100.3543');
  const [kapasitasPosko, setKapasitasPosko] = useState(250);
  const [picPosko, setPicPosko] = useState('');
  const [telpPosko, setTelpPosko] = useState('');
  const [fasilitasPosko] = useState<string[]>(['air_bersih', 'mck', 'dapur_umum']);

  // =========================================================================
  // STATE TAB 2: MONITORING SIRINE EWS
  // =========================================================================
  const [sirineList, setSirineList] = useState<any[]>([]);
  const [sirineMeta, setSirineMeta] = useState<{ total: number; aktif: number; pemeliharaan: number }>({ total: 46, aktif: 20, pemeliharaan: 26 });
  const [sirineFilter, setSirineFilter] = useState<'semua' | 'aktif' | 'pemeliharaan'>('semua');

  // =========================================================================
  // STATE TAB 3: LAPOR KEJADIAN BENCANA & DAMPAK
  // =========================================================================
  const [bencanaList, setBencanaList] = useState<any[]>([]);
  const [submittingBencana, setSubmittingBencana] = useState(false);
  const [isAddingBencana, setIsAddingBencana] = useState(false);

  // Form Bencana
  const [jenisBencana, setJenisBencana] = useState('longsor');
  const [deskripsiBencana, setDeskripsiBencana] = useState('');
  const [bencanaLat, setBencanaLat] = useState('-0.9520');
  const [bencanaLon, setBencanaLon] = useState('100.4650');
  const [wilayahIdBencana, setWilayahIdBencana] = useState(1);
  const [statusVerifBencana, setStatusVerifBencana] = useState('terverifikasi');

  // Form Rincian Dampak
  const [korbanMeninggal, setKorbanMeninggal] = useState(0);
  const [korbanLuka, setKorbanLuka] = useState(0);
  const [jumlahPengungsi, setJumlahPengungsi] = useState(0);
  const [kerugianRupiah, setKerugianRupiah] = useState(0);
  const [rumahRusakBerat, setRumahRusakBerat] = useState(0);

  // =========================================================================
  // STATE TAB 4: RUAS JALAN TERPUTUS (BLOKADE)
  // =========================================================================
  const [jalanList, setJalanList] = useState<any[]>([]);
  const [alasanJalan, setAlasanJalan] = useState('longsor');
  const [deskripsiJalan, setDeskripsiJalan] = useState('');
  const [presetLokasiJalan, setPresetLokasiJalan] = useState('sitinjau');
  const [submittingJalan, setSubmittingJalan] = useState(false);

  // =========================================================================
  // STATE TAB 5: ANTREAN VERIFIKASI SUPERVISOR
  // =========================================================================
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // =========================================================================
  // STATE TAB 6: AUDIT LOGS & USER
  // =========================================================================
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [userList, setUserList] = useState<any[]>([]);
  const [statistikData, setStatistikData] = useState<any | null>(null);
  const [syncingBmkg, setSyncingBmkg] = useState(false);

  // Fungsi pemuatan data dideklarasikan sebelum pemanggilan effect
  const loadPosko = () => {
    fetch('/api/posko?include_nonaktif=true')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.features) setPoskoList(data.features);
      })
      .catch(() => {});
  };

  const loadSirine = () => {
    fetch('/api/posko/sirine/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.data) {
          setSirineList(data.data);
          setSirineMeta({
            total: data.total_sirine || 46,
            aktif: data.aktif_siaga || 20,
            pemeliharaan: data.dalam_pemeliharaan || 26
          });
        }
      })
      .catch(() => {});
  };

  const loadBencana = () => {
    fetch('/api/bencana?limit=30')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.data) setBencanaList(data.data);
      })
      .catch(() => {});
  };

  const loadJalan = () => {
    fetch('/api/jalan-terputus')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.features) setJalanList(data.features);
      })
      .catch(() => {});
  };

  const loadQueue = () => {
    const token = localStorage.getItem('gis_auth_token');
    fetch('/api/admin/verifikasi-queue', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.data) setQueueItems(data.data);
      })
      .catch(() => {})
      .finally(() => setLoadingQueue(false));
  };

  const loadAudit = () => {
    const token = localStorage.getItem('gis_auth_token');
    fetch('/api/admin/audit-logs?limit=40', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.data) setAuditLogs(data.data);
      })
      .catch(() => {});
  };

  const loadUsers = () => {
    const token = localStorage.getItem('gis_auth_token');
    fetch('/api/admin/pengguna', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
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

  // Sinkronisasi koordinat yang diklik dari peta (jika ada) saat prop berubah
  const [prevPickedCoords, setPrevPickedCoords] = useState(pickedCoords);
  if (pickedCoords && pickedCoords !== prevPickedCoords) {
    setPrevPickedCoords(pickedCoords);
    if (isAddingPosko) {
      setPoskoLat(pickedCoords.lat.toString());
      setPoskoLon(pickedCoords.lng.toString());
      setSuccessMsg(`Koordinat posko berhasil disinkronkan dari peta: [${pickedCoords.lat}, ${pickedCoords.lng}]`);
    } else if (isAddingBencana) {
      setBencanaLat(pickedCoords.lat.toString());
      setBencanaLon(pickedCoords.lng.toString());
      setSuccessMsg(`Koordinat bencana berhasil disinkronkan dari peta: [${pickedCoords.lat}, ${pickedCoords.lng}]`);
    }
  }

  // Load Data Sesuai Tab Aktif
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    if (activeTab === 'posko') {
      loadPosko();
    } else if (activeTab === 'sirine') {
      loadSirine();
    } else if (activeTab === 'bencana') {
      loadBencana();
    } else if (activeTab === 'blokade') {
      loadJalan();
    } else if (activeTab === 'verifikasi') {
      loadQueue();
    } else if (activeTab === 'audit') {
      loadAudit();
    } else if (activeTab === 'pengguna') {
      loadUsers();
    } else if (activeTab === 'eksekutif') {
      loadStatistik();
    }
  }, [isOpen, currentUser, activeTab]);

  if (!isOpen) return null;

  // =========================================================================
  // HANDLERS AUTENTIKASI
  // =========================================================================
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
      setSuccessMsg(`Selamat bertugas, ${data.user.nama} (${data.user.role.toUpperCase()})`);
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

  // =========================================================================
  // HANDLERS CRUD POSKO
  // =========================================================================
  const handleSimpanPosko = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPosko(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('gis_auth_token');
      const payload = {
        nama: namaPosko,
        jenis: jenisPosko,
        lat: parseFloat(poskoLat),
        lon: parseFloat(poskoLon),
        kapasitas: Number(kapasitasPosko),
        fasilitas: fasilitasPosko,
        kontak_pic: picPosko || null,
        kontak_telepon: telpPosko || null,
        status: 'aktif'
      };

      const res = await fetch('/api/posko', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail?.error?.message || 'Gagal menambah posko.');

      setSuccessMsg(`Posko '${namaPosko}' berhasil didaftarkan ke sistem!`);
      setIsAddingPosko(false);
      setNamaPosko('');
      loadPosko();
      if (onPoskoChanged) onPoskoChanged();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingPosko(false);
    }
  };

  const handleUpdateStatusPosko = async (id: number, currentStatus: string) => {
    const targetStatus = currentStatus === 'aktif' ? 'penuh' : 'aktif';
    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch(`/api/posko/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: targetStatus })
      });
      if (!res.ok) throw new Error('Gagal update status posko');
      setSuccessMsg(`Status posko berhasil diubah menjadi: ${targetStatus.toUpperCase()}`);
      loadPosko();
      if (onPoskoChanged) onPoskoChanged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeletePosko = async (id: number, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus posko: "${nama}"?`)) return;
    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch(`/api/posko/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Gagal menghapus posko');
      setSuccessMsg(`Posko "${nama}" berhasil dihapus.`);
      loadPosko();
      if (onPoskoChanged) onPoskoChanged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // =========================================================================
  // HANDLERS CRUD BENCANA & VERIFIKASI
  // =========================================================================
  const handleSimpanBencana = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBencana(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('gis_auth_token');
      const payload = {
        jenis_bencana: jenisBencana,
        wilayah_id: Number(wilayahIdBencana),
        lat: parseFloat(bencanaLat),
        lon: parseFloat(bencanaLon),
        deskripsi: deskripsiBencana || `Laporan kejadian ${jenisBencana} di Sumatera Barat.`,
        sumber_data: currentUser?.role === 'admin' ? 'pusdalops_bpbd' : 'operator_lapangan',
        status_verifikasi: currentUser?.role === 'admin' ? statusVerifBencana : 'menunggu',
        dampak: {
          korban_meninggal: Number(korbanMeninggal),
          korban_luka: Number(korbanLuka),
          jumlah_pengungsi: Number(jumlahPengungsi),
          kerugian_rp: Number(kerugianRupiah),
          rumah_rusak_berat: Number(rumahRusakBerat)
        }
      };

      const res = await fetch('/api/bencana', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail?.error?.message || 'Gagal melaporkan bencana.');

      setSuccessMsg(
        currentUser?.role === 'admin'
          ? 'Kejadian bencana berhasil dirilis ke peta publik!'
          : 'Laporan tersimpan dan masuk antrean verifikasi Pusdalops!'
      );
      setIsAddingBencana(false);
      setDeskripsiBencana('');
      loadBencana();
      if (onBencanaChanged) onBencanaChanged();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingBencana(false);
    }
  };

  const handleVerifikasiLaporan = async (id: number, statusVerif: 'terverifikasi' | 'ditolak') => {
    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch(`/api/bencana/${id}/verifikasi`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status_verifikasi: statusVerif,
          catatan: statusVerif === 'terverifikasi' ? 'Diverifikasi langsung oleh Tim Pusdalops BPBD' : 'Ditolak: Informasi tidak valid di lapangan'
        })
      });

      if (!res.ok) throw new Error('Gagal memproses verifikasi.');
      setSuccessMsg(`Laporan ID #${id} berhasil di-${statusVerif === 'terverifikasi' ? 'SETUJUI (Tayang di Peta)' : 'TOLAK'}.`);
      loadQueue();
      loadBencana();
      if (onBencanaChanged) onBencanaChanged();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // =========================================================================
  // HANDLERS CRUD JALAN TERPUTUS
  // =========================================================================
  const handleSimpanJalan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingJalan(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    let coords: number[][] = [];
    if (presetLokasiJalan === 'sitinjau') {
      coords = [[100.4650, -0.9520], [100.4720, -0.9560], [100.4780, -0.9590]];
    } else if (presetLokasiJalan === 'anai') {
      coords = [[100.3420, -0.4850], [100.3450, -0.4880], [100.3500, -0.4920]];
    } else if (presetLokasiJalan === 'malalak') {
      coords = [[100.2520, -0.3250], [100.2580, -0.3320]];
    } else {
      coords = [[100.3550, -0.9450], [100.3580, -0.9400]];
    }

    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch('/api/jalan-terputus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          geometry: { coordinates: coords },
          alasan: alasanJalan,
          deskripsi: deskripsiJalan || `Ruas jalan terputus akibat ${alasanJalan}.`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail?.error?.message || 'Gagal mencatat jalan.');

      setSuccessMsg('Ruas jalan terputus berhasil ditambahkan! Rute evakuasi otomatis menghindar.');
      setDeskripsiJalan('');
      loadJalan();
      if (onJalanCreated) onJalanCreated();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmittingJalan(false);
    }
  };

  const handleUpdateStatusJalan = async (id: number, statusTarget: 'aktif' | 'sebagian' | 'pulih') => {
    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch(`/api/jalan-terputus/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: statusTarget })
      });
      if (!res.ok) throw new Error('Gagal update status jalan');
      setSuccessMsg(`Status penanganan ruas jalan berhasil diubah menjadi: ${statusTarget.toUpperCase()}`);
      loadJalan();
      if (onJalanCreated) onJalanCreated();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteJalan = async (id: number) => {
    if (!confirm('Hapus pencatatan ruas jalan terputus ini?')) return;
    try {
      const token = localStorage.getItem('gis_auth_token');
      const res = await fetch(`/api/jalan-terputus/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Gagal menghapus jalan');
      setSuccessMsg('Ruas jalan berhasil dihapus.');
      loadJalan();
      if (onJalanCreated) onJalanCreated();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Sync BMKG Manual (Admin)
  const handleSyncBmkg = async () => {
    setSyncingBmkg(true);
    try {
      const res = await fetch('/api/eksternal/sync-gempa', { method: 'POST' });
      if (!res.ok) throw new Error('Gagal sinkronisasi');
      setSuccessMsg('Sensor gempa BMKG berhasil disinkronkan seketika!');
    } catch {
      setErrorMsg('Gagal menyinkronkan data sensor BMKG.');
    } finally {
      setSyncingBmkg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl xl:max-w-6xl max-h-[90vh] bg-[#0F1720] border border-[#243444] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* HEADER MODAL */}
        <header className="flex items-center justify-between px-5 py-3.5 border-b border-[#243444] bg-[#141E28]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-display">
                PUSAT KOMANDO PUSDALOPS PB
                {currentUser && (
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded uppercase tracking-wider ${
                    currentUser.role === 'pimpinan'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : currentUser.role === 'admin'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {currentUser.role}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {currentUser ? `${currentUser.nama} • BPBD Prov. Sumatera Barat` : 'Portal Akses & Manajemen Geospasial'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-lg transition-all"
                title="Keluar dari sesi"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* NOTIFIKASI TOAST BANNER */}
        {errorMsg && (
          <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800/50 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">&times;</button>
          </div>
        )}
        {successMsg && (
          <div className="px-4 py-2 bg-emerald-950/80 border-b border-emerald-800/50 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">&times;</button>
          </div>
        )}

        {/* KONTEN UTAMA */}
        {!currentUser ? (
          /* ========================================================================= */
          /* FORM LOGIN MULTI-ROLE                                                     */
          /* ========================================================================= */
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="max-w-md mx-auto space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-white font-display">Autentikasi Akses Petugas</h3>
                <p className="text-xs text-slate-400">
                  Masuk untuk mengelola data posko, sirine EWS, blokade jalan, dan validasi kebencanaan.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3.5 bg-[#141E28] p-5 rounded-xl border border-[#243444]">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Kedinasan BPBD</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator.padang@sumbarprov.go.id"
                      className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kata Sandi</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Masuk ke Dashboard Komando</span>
                </button>
              </form>

              {/* QUICK ACCESS PRESET BUTTONS UNTUK DEMO & PRESENTASI */}
              <div className="space-y-2 border-t border-[#243444] pt-4">
                <span className="text-[11px] font-mono text-slate-400 block text-center uppercase tracking-wider">
                  Preset Akun Simulasi Cepat (1-Click)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('operator')}
                    className="p-2 rounded-lg bg-[#141E28] hover:bg-[#1B2733] border border-[#243444] hover:border-emerald-500/50 text-left transition-all"
                  >
                    <div className="text-[11px] font-bold text-emerald-400">Operator</div>
                    <div className="text-[10px] text-slate-400 truncate">Kota Padang</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className="p-2 rounded-lg bg-[#141E28] hover:bg-[#1B2733] border border-[#243444] hover:border-blue-500/50 text-left transition-all"
                  >
                    <div className="text-[11px] font-bold text-blue-400">Admin Pusdalops</div>
                    <div className="text-[10px] text-slate-400 truncate">Pusat Sumbar</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('pimpinan')}
                    className="p-2 rounded-lg bg-[#141E28] hover:bg-[#1B2733] border border-[#243444] hover:border-amber-500/50 text-left transition-all"
                  >
                    <div className="text-[11px] font-bold text-amber-400">Pimpinan</div>
                    <div className="text-[10px] text-slate-400 truncate">Forkopimda</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* PUSAT KENDALI OPERASIONAL MULTI-TAB (PUSDALOPS)                            */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* NAVBAR TAB OPERASIONAL (8 TAB KOMANDO) */}
            <div className="flex items-center gap-1 px-4 pt-2.5 border-b border-[#243444] bg-[#111A24] overflow-x-auto text-xs font-semibold scrollbar-thin scrollbar-thumb-[#243444] scrollbar-track-transparent">
              <button
                onClick={() => setActiveTab('posko')}
                className={`flex items-center gap-1.5 px-2.5 py-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'posko'
                    ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Posko & Shelter</span>
              </button>

              <button
                onClick={() => setActiveTab('sirine')}
                className={`flex items-center gap-1.5 px-2.5 py-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'sirine'
                    ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Sirine EWS ({sirineMeta.total})</span>
              </button>

              <button
                onClick={() => setActiveTab('bencana')}
                className={`flex items-center gap-1.5 px-2.5 py-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'bencana'
                    ? 'border-rose-500 text-rose-300 bg-rose-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Lapor Bencana</span>
              </button>

              <button
                onClick={() => setActiveTab('blokade')}
                className={`flex items-center gap-1.5 px-2.5 py-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'blokade'
                    ? 'border-rose-400 text-rose-300 bg-rose-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Blokade Jalan</span>
              </button>

              <button
                onClick={() => setActiveTab('verifikasi')}
                className={`flex items-center gap-1.5 px-2.5 py-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'verifikasi'
                    ? 'border-blue-500 text-blue-300 bg-blue-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Antrean Verifikasi {queueItems.length > 0 && `(${queueItems.length})`}</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-1.5 px-2.5 py-2 border-b-2 transition-all shrink-0 ${
                  activeTab === 'audit'
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Jejak Audit</span>
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('pengguna')}
                  className={`flex items-center gap-1.5 px-2.5 py-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'pengguna'
                      ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Personel</span>
                </button>
              )}

              {(currentUser.role === 'pimpinan' || currentUser.role === 'admin') && (
                <button
                  onClick={() => setActiveTab('eksekutif')}
                  className={`flex items-center gap-1.5 px-2.5 py-2 border-b-2 transition-all shrink-0 ${
                    activeTab === 'eksekutif'
                      ? 'border-amber-400 text-amber-200 bg-amber-500/10'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>KPI Eksekutif</span>
                </button>
              )}
            </div>

            {/* ISI TAB CONTAINER */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* ============================================================= */}
              {/* TAB 1: POSKO & SHELTER EVAKUASI                               */}
              {/* ============================================================= */}
              {activeTab === 'posko' && (
                <div className="space-y-4">
                  {/* Toolbar & Search */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#141E28] p-3 rounded-xl border border-[#243444]">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={poskoSearch}
                        onChange={(e) => setPoskoSearch(e.target.value)}
                        placeholder="Cari posko atau shelter..."
                        className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={poskoFilterJenis}
                        onChange={(e) => setPoskoFilterJenis(e.target.value)}
                        className="bg-[#0F1720] border border-[#2D3F52] rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                      >
                        <option value="semua">Semua Kategori</option>
                        <option value="posko_utama">Posko Utama</option>
                        <option value="shelter_tes_tea">Shelter TES/TEA Tsunami</option>
                        <option value="fasilitas_kesehatan">Faskes Darurat</option>
                        <option value="titik_kumpul">Titik Kumpul</option>
                      </select>

                      <button
                        onClick={() => setIsAddingPosko(!isAddingPosko)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isAddingPosko ? 'Batal' : 'Tambah Posko'}</span>
                      </button>
                    </div>
                  </div>

                  {/* FORM TAMBAH POSKO BARU */}
                  {isAddingPosko && (
                    <form onSubmit={handleSimpanPosko} className="p-4 rounded-xl bg-[#141E28] border-2 border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Pendaftaran Titik Posko / Shelter Baru
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nama Fasilitas/Posko *</label>
                          <input
                            type="text"
                            required
                            value={namaPosko}
                            onChange={(e) => setNamaPosko(e.target.value)}
                            placeholder="Contoh: Shelter TES Pasia Nan Tigo"
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Kategori Fasilitas</label>
                          <select
                            value={jenisPosko}
                            onChange={(e) => setJenisPosko(e.target.value)}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          >
                            <option value="posko_utama">Posko Utama / Pengungsian</option>
                            <option value="shelter_tes_tea">Shelter Vertikal TES/TEA Tsunami</option>
                            <option value="fasilitas_kesehatan">Fasilitas Kesehatan Lapangan</option>
                            <option value="titik_kumpul">Titik Kumpul Evakuasi Awal</option>
                          </select>
                        </div>
                      </div>

                      {/* Baris Koordinat & Tombol Titik Peta */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Latitude (Lintang)</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={poskoLat}
                            onChange={(e) => setPoskoLat(e.target.value)}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Longitude (Bujur)</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={poskoLon}
                            onChange={(e) => setPoskoLon(e.target.value)}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (onRequestPickLocation) onRequestPickLocation('posko');
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                            title="Tutup dialog sementara dan klik sembarang lokasi di peta untuk mengambil koordinat"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                            <span>Tentukan di Peta</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Daya Tampung (Kapasitas Jiwa)</label>
                          <input
                            type="number"
                            required
                            min={10}
                            value={kapasitasPosko}
                            onChange={(e) => setKapasitasPosko(Number(e.target.value))}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nama PIC Lapangan</label>
                          <input
                            type="text"
                            value={picPosko}
                            onChange={(e) => setPicPosko(e.target.value)}
                            placeholder="Ahmad Fauzi (TRC BPBD)"
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Telepon PIC</label>
                          <input
                            type="text"
                            value={telpPosko}
                            onChange={(e) => setTelpPosko(e.target.value)}
                            placeholder="081234567890"
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-[#243444]">
                        <button
                          type="button"
                          onClick={() => setIsAddingPosko(false)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={submittingPosko}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          {submittingPosko && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>Simpan Posko ke Database</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* DAFTAR POSKO TABLE */}
                  <div className="bg-[#141E28] rounded-xl border border-[#243444] overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-[#0F1720] text-slate-400 text-[11px] uppercase tracking-wider font-mono sticky top-0 border-b border-[#243444]">
                          <tr>
                            <th className="py-2.5 px-3">Nama & Jenis</th>
                            <th className="py-2.5 px-3">Kapasitas</th>
                            <th className="py-2.5 px-3">Kontak PIC</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#243444]">
                          {poskoList
                            .filter((f) => {
                              const p = f.properties;
                              if (poskoFilterJenis !== 'semua' && p.jenis !== poskoFilterJenis) return false;
                              if (poskoSearch && !p.nama?.toLowerCase().includes(poskoSearch.toLowerCase())) return false;
                              return true;
                            })
                            .map((f) => {
                              const p = f.properties;
                              const isPenuh = p.status === 'penuh';
                              return (
                                <tr key={p.id} className="hover:bg-[#1B2733]/50 transition-colors">
                                  <td className="py-2 px-3">
                                    <div className="font-bold text-white">{p.nama}</div>
                                    <div className="text-[10px] text-slate-400 font-mono capitalize">
                                      {p.jenis?.replace(/_/g, ' ') || 'Posko'}
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 font-mono text-emerald-300">
                                    {p.kapasitas ? `${p.kapasitas.toLocaleString()} Jiwa` : '-'}
                                  </td>
                                  <td className="py-2 px-3 text-slate-300">
                                    <div>{p.kontak_pic || '-'}</div>
                                    {p.kontak_telepon && <div className="text-[10px] text-slate-400 font-mono">{p.kontak_telepon}</div>}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      p.status === 'aktif'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : isPenuh
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                    }`}>
                                      {p.status || 'aktif'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right space-x-1">
                                    <button
                                      onClick={() => handleUpdateStatusPosko(p.id, p.status)}
                                      className="px-2 py-1 rounded bg-[#0F1720] hover:bg-[#243444] border border-[#2D3F52] text-[10px] font-mono transition-colors"
                                      title="Ubah Status Keterisian"
                                    >
                                      {p.status === 'aktif' ? 'Tandai Penuh' : 'Tandai Aktif'}
                                    </button>
                                    <button
                                      onClick={() => handleDeletePosko(p.id, p.nama)}
                                      className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-900/50 transition-colors"
                                      title="Hapus Posko"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 2: MONITORING SIRINE EWS TSUNAMI                          */}
              {/* ============================================================= */}
              {activeTab === 'sirine' && (
                <div className="space-y-4">
                  {/* Banner Ringkasan Telemetri */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#141E28] border border-[#243444]">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Total Unit Beacon</span>
                      <div className="text-xl font-bold text-white font-display mt-0.5">{sirineMeta.total} Unit</div>
                      <span className="text-[10px] text-slate-400">Pesisir Barat Sumbar</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                      <span className="text-[10px] font-mono uppercase text-emerald-400">Siaga Aktif</span>
                      <div className="text-xl font-bold text-emerald-300 font-display mt-0.5">{sirineMeta.aktif} Unit</div>
                      <span className="text-[10px] text-emerald-400/80">Siap Bunyi Darurat</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30">
                      <span className="text-[10px] font-mono uppercase text-amber-400">Pemeliharaan / Aki</span>
                      <div className="text-xl font-bold text-amber-300 font-display mt-0.5">{sirineMeta.pemeliharaan} Unit</div>
                      <span className="text-[10px] text-amber-400/80">Jadwal Servis BPBD</span>
                    </div>
                  </div>

                  {/* Filter & List Sirine */}
                  <div className="flex items-center justify-between gap-3 bg-[#141E28] p-3 rounded-xl border border-[#243444]">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400 font-mono">Filter Status:</span>
                      <button
                        onClick={() => setSirineFilter('semua')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          sirineFilter === 'semua' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Semua ({sirineList.length})
                      </button>
                      <button
                        onClick={() => setSirineFilter('aktif')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          sirineFilter === 'aktif' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Siaga Aktif
                      </button>
                      <button
                        onClick={() => setSirineFilter('pemeliharaan')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          sirineFilter === 'pemeliharaan' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Pemeliharaan
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Radius Suara: <strong>2.0 KM</strong> / Menara
                    </span>
                  </div>

                  {/* List Cards Sirine */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                    {sirineList
                      .filter((s) => {
                        if (sirineFilter === 'aktif') return s.status === 'aktif';
                        if (sirineFilter === 'pemeliharaan') return s.status !== 'aktif';
                        return true;
                      })
                      .map((s) => {
                        const isAktif = s.status === 'aktif';
                        return (
                          <div key={s.id} className="p-3 rounded-xl bg-[#141E28] border border-[#243444] hover:border-slate-600 transition-all flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Radio className={`w-3.5 h-3.5 ${isAktif ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                                <span className="font-bold text-white text-xs">{s.nama}</span>
                              </div>
                              <div className="text-[11px] text-slate-400">{s.wilayah}</div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Koordinat: {s.lat?.toFixed(4)}, {s.lon?.toFixed(4)}
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase shrink-0 ${
                              isAktif
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {isAktif ? 'Siaga Aktif' : 'Pemeliharaan'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 3: LAPOR KEJADIAN BENCANA & DAMPAK                        */}
              {/* ============================================================= */}
              {activeTab === 'bencana' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-[#141E28] p-3 rounded-xl border border-[#243444]">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Pusat Data Kejadian & Rekapitulasi Kerusakan</h3>
                      <p className="text-[11px] text-slate-400">Data terverifikasi langsung teragregasi ke peta choropleth dan laporan SITREP BNPB.</p>
                    </div>

                    <button
                      onClick={() => setIsAddingBencana(!isAddingBencana)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingBencana ? 'Tutup Form' : 'Lapor Kejadian Baru'}</span>
                    </button>
                  </div>

                  {/* FORM BENCANA BARU */}
                  {isAddingBencana && (
                    <form onSubmit={handleSimpanBencana} className="p-4 rounded-xl bg-[#141E28] border-2 border-rose-500/40 space-y-3 animate-in fade-in duration-200">
                      <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Formulir Pelaporan Kejadian Bencana Lapangan
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Jenis Bencana *</label>
                          <select
                            value={jenisBencana}
                            onChange={(e) => setJenisBencana(e.target.value)}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          >
                            <option value="longsor">Tanah Longsor</option>
                            <option value="banjir">Banjir Luapan / Genangan</option>
                            <option value="erupsi">Erupsi / Galodo (Lahar Dingin)</option>
                            <option value="gempa">Gempa Bumi Darat/Laut</option>
                            <option value="tsunami">Tsunami</option>
                            <option value="angin_puting_beliung">Angin Puting Beliung</option>
                            <option value="kebakaran">Kebakaran Hutan / Pemukiman</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Wilayah Terdampak</label>
                          <select
                            value={wilayahIdBencana}
                            onChange={(e) => setWilayahIdBencana(Number(e.target.value))}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                          >
                            <option value={1}>Provinsi Sumatera Barat</option>
                            <option value={2}>Kota Padang</option>
                            <option value={3}>Kab. Agam</option>
                            <option value={4}>Kab. Tanah Datar</option>
                            <option value={5}>Kab. Padang Pariaman</option>
                            <option value={6}>Kab. Pesisir Selatan</option>
                            <option value={7}>Kab. Solok</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Status Rilis Data</label>
                          <select
                            value={statusVerifBencana}
                            onChange={(e) => setStatusVerifBencana(e.target.value)}
                            disabled={currentUser.role === 'operator'}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none disabled:opacity-60"
                          >
                            <option value="menunggu">Menunggu Verifikasi Supervisor</option>
                            <option value="terverifikasi">Langsung Rilis ke Peta Publik</option>
                          </select>
                        </div>
                      </div>

                      {/* Baris Koordinat & Tombol Peta */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={bencanaLat}
                            onChange={(e) => setBencanaLat(e.target.value)}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={bencanaLon}
                            onChange={(e) => setBencanaLon(e.target.value)}
                            className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              if (onRequestPickLocation) onRequestPickLocation('bencana');
                            }}
                            className="w-full py-1.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                            <span>Tentukan di Peta</span>
                          </button>
                        </div>
                      </div>

                      {/* Rincian Dampak & Korban */}
                      <div className="p-3 rounded-xl bg-[#0F1720] border border-[#2D3F52] space-y-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                          Disagregasi Korban Jiwa & Kerusakan Infrastruktur
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] text-slate-400 block">Meninggal</label>
                            <input
                              type="number"
                              min={0}
                              value={korbanMeninggal}
                              onChange={(e) => setKorbanMeninggal(Number(e.target.value))}
                              className="w-full bg-[#141E28] border border-[#2D3F52] rounded px-2 py-1 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block">Luka-luka</label>
                            <input
                              type="number"
                              min={0}
                              value={korbanLuka}
                              onChange={(e) => setKorbanLuka(Number(e.target.value))}
                              className="w-full bg-[#141E28] border border-[#2D3F52] rounded px-2 py-1 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block">Pengungsi</label>
                            <input
                              type="number"
                              min={0}
                              value={jumlahPengungsi}
                              onChange={(e) => setJumlahPengungsi(Number(e.target.value))}
                              className="w-full bg-[#141E28] border border-[#2D3F52] rounded px-2 py-1 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block">Rumah Rusak</label>
                            <input
                              type="number"
                              min={0}
                              value={rumahRusakBerat}
                              onChange={(e) => setRumahRusakBerat(Number(e.target.value))}
                              className="w-full bg-[#141E28] border border-[#2D3F52] rounded px-2 py-1 text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block">Kerugian (Rp)</label>
                            <input
                              type="number"
                              min={0}
                              step={1000000}
                              value={kerugianRupiah}
                              onChange={(e) => setKerugianRupiah(Number(e.target.value))}
                              className="w-full bg-[#141E28] border border-[#2D3F52] rounded px-2 py-1 text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Deskripsi / Kronologi Kejadian</label>
                        <textarea
                          rows={2}
                          value={deskripsiBencana}
                          onChange={(e) => setDeskripsiBencana(e.target.value)}
                          placeholder="Rincian kondisi di lapangan, penanganan tim TRC, dan kebutuhan logistik darurat..."
                          className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-[#243444]">
                        <button
                          type="button"
                          onClick={() => setIsAddingBencana(false)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={submittingBencana}
                          className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                        >
                          {submittingBencana && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>Kirim Laporan Kejadian</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* DAFTAR RIWAYAT KEJADIAN BENCANA */}
                  <div className="bg-[#141E28] rounded-xl border border-[#243444] overflow-hidden">
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#243444]">
                      {bencanaList.map((b) => (
                        <div key={b.id} className="p-3 hover:bg-[#1B2733]/40 transition-colors flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs uppercase">{b.jenis_bencana}</span>
                              <span className="text-[10px] text-slate-400 font-mono">#{b.id} • {b.wilayah}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                                b.status_verifikasi === 'terverifikasi'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {b.status_verifikasi}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 line-clamp-1">{b.deskripsi}</p>
                            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                              <span>Meninggal: <strong className="text-rose-400">{b.dampak?.korban_meninggal || 0}</strong></span>
                              <span>Pengungsi: <strong className="text-emerald-400">{(b.dampak?.jumlah_pengungsi || 0).toLocaleString()}</strong></span>
                              <span>Kerugian: <strong className="text-amber-300">Rp {((b.dampak?.kerugian_rp || 0) / 1_000_000).toFixed(1)} Jt</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 4: MANAJEMEN RUAS JALAN TERPUTUS (BLOKADE)                */}
              {/* ============================================================= */}
              {activeTab === 'blokade' && (
                <div className="space-y-4">
                  {/* FORM TAMBAH JALAN */}
                  <form onSubmit={handleSimpanJalan} className="p-4 rounded-xl bg-[#141E28] border border-[#243444] space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-rose-400" />
                      Penandaan Ruas Jalan Terputus (Blokade Dinamis)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Penyebab Blokade</label>
                        <select
                          value={alasanJalan}
                          onChange={(e) => setAlasanJalan(e.target.value)}
                          className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="longsor">Tanah Longsor / Tebing Runtuh</option>
                          <option value="banjir">Banjir Bandang / Genangan Air</option>
                          <option value="jembatan_putus">Jembatan Putus / Roboh</option>
                          <option value="kerusakan_jalan">Jalan Amblas / Patahan Gempa</option>
                          <option value="lainnya">Pohon Tumbang / Lainnya</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Segmen Arteri Strategis</label>
                        <select
                          value={presetLokasiJalan}
                          onChange={(e) => setPresetLokasiJalan(e.target.value)}
                          className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="sitinjau">Sitinjau Lauik (Padang - Solok KM 18)</option>
                          <option value="anai">Lembah Anai (Padang Panjang - Padang)</option>
                          <option value="malalak">Jalur Alternatif Malalak (Agam - Pariaman)</option>
                          <option value="khatib">Jl. Khatib Sulaiman Padang (Genangan Banjir)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Catatan Lapangan & Jalur Alternatif</label>
                      <input
                        type="text"
                        value={deskripsiJalan}
                        onChange={(e) => setDeskripsiJalan(e.target.value)}
                        placeholder="Alat berat sedang diterjunkan, arahkan kendaraan melalui jalur alternatif..."
                        className="w-full bg-[#0F1720] border border-[#2D3F52] rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingJalan}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-lg"
                      >
                        {submittingJalan && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Tandai Jalan Terputus (Alihkan Rute)</span>
                      </button>
                    </div>
                  </form>

                  {/* DAFTAR BLOKADE AKTIF */}
                  <div className="bg-[#141E28] rounded-xl border border-[#243444] overflow-hidden">
                    <div className="p-3 border-b border-[#243444] flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Ruas Jalan Sedang Terhambat</span>
                      <span className="text-[11px] font-mono text-rose-400">{jalanList.length} Titik Blokade</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-[#243444]">
                      {jalanList.map((j) => {
                        const p = j.properties;
                        return (
                          <div key={p.id} className="p-3 hover:bg-[#1B2733]/40 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-rose-400 uppercase font-mono">{p.alasan}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                                  p.status === 'aktif' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {p.status}
                                </span>
                              </div>
                              <p className="text-slate-300">{p.deskripsi}</p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleUpdateStatusJalan(p.id, 'sebagian')}
                                className="px-2 py-1 rounded bg-[#0F1720] hover:bg-[#243444] border border-[#2D3F52] text-[10px] font-mono"
                                title="Buka-Tutup 1 Arah"
                              >
                                Buka Sebagian
                              </button>
                              <button
                                onClick={() => handleUpdateStatusJalan(p.id, 'pulih')}
                                className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono"
                                title="Buka Total"
                              >
                                Pulihkan
                              </button>
                              <button
                                onClick={() => handleDeleteJalan(p.id)}
                                className="p-1 text-rose-400 hover:text-white"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 5: ANTREAN VERIFIKASI (SUPERVISOR TRIAGE)                 */}
              {/* ============================================================= */}
              {activeTab === 'verifikasi' && (
                <div className="space-y-4">
                  {/* PANDUAN EDUKASI SOP QUALITY CONTROL DATA PUSDALOPS */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#132130] to-[#101A24] border border-blue-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            SOP Quality Control: Fungsi Antrean Verifikasi
                          </h4>
                          <p className="text-[11px] text-slate-300">
                            Penyaringan dan validasi silang berjenjang sebelum laporan dirilis ke publik & SITREP BNPB.
                          </p>
                        </div>
                      </div>
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        Two-Eye QC Workflow
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                      <div className="p-2.5 rounded-lg bg-[#0E1722]/80 border border-[#233547]">
                        <span className="text-[10px] font-mono font-bold text-amber-400 block mb-1">
                          1. INPUT OPERATOR
                        </span>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          Operator mencatat bencana, korban, dan koordinat. Status awal: <b className="text-amber-300">Menunggu</b> agar tidak langsung tayang tanpa verifikasi.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#0E1722]/80 border border-[#233547]">
                        <span className="text-[10px] font-mono font-bold text-blue-400 block mb-1">
                          2. TRIAGE SUPERVISOR
                        </span>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          Supervisor Pusdalops memeriksa keabsahan foto/titik di antrean ini untuk menyaring laporan palsu atau duplikasi.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-[#0E1722]/80 border border-[#233547]">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 block mb-1">
                          3. RILIS RESMI
                        </span>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          Setelah diverifikasi, data otomatis tayang di <b className="text-emerald-300">Peta Publik</b> dan terakumulasi di dokumen <b className="text-emerald-300">SITREP BNPB</b>.
                        </p>
                      </div>
                    </div>

                    {currentUser.role === 'operator' && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <span>
                          <strong>Peran Akun Operator:</strong> Halaman ini menampilkan laporan lapangan yang sedang mengantre ditinjau. Anda dapat memeriksa apakah laporan yang Anda input sudah diproses atau disetujui oleh Supervisor Pusdalops.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-[#141E28] p-3.5 rounded-xl border border-[#243444]">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Kotak Masuk Verifikasi Lapangan</h3>
                      <p className="text-[11px] text-slate-400">Pemeriksaan dan validasi silang sebelum laporan diterbitkan ke publik.</p>
                    </div>

                    <button
                      onClick={loadQueue}
                      disabled={loadingQueue}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0F1720] hover:bg-[#1B2733] border border-[#243444] text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? 'animate-spin' : ''}`} />
                      <span>Segarkan</span>
                    </button>
                  </div>

                  {queueItems.length === 0 ? (
                    <div className="p-10 text-center rounded-xl bg-[#141E28] border border-[#243444] space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <h4 className="text-sm font-bold text-white">Seluruh Laporan Telah Terverifikasi</h4>
                      <p className="text-xs text-slate-400">Tidak ada antrean laporan lapangan berstatus 'menunggu' saat ini.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {queueItems.map((q) => (
                        <div key={q.id} className="p-4 rounded-xl bg-[#141E28] border-2 border-amber-500/30 space-y-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold uppercase text-[10px] font-mono">
                                {q.jenis}
                              </span>
                              <span className="font-bold text-white text-xs">{q.wilayah}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                Pelapor: <strong>{q.pelapor}</strong>
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold uppercase">
                              Menunggu Verifikasi
                            </span>
                          </div>

                          <p className="text-xs text-slate-200 bg-[#0F1720] p-2.5 rounded-lg border border-[#243444]">
                            {q.deskripsi}
                          </p>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-[11px] font-mono text-slate-400">
                              Koordinat: {q.lat ? `${q.lat.toFixed(4)}, ${q.lon.toFixed(4)}` : 'Tidak tercatat'}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleVerifikasiLaporan(q.id, 'ditolak')}
                                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold"
                              >
                                Tolak Laporan
                              </button>
                              <button
                                onClick={() => handleVerifikasiLaporan(q.id, 'terverifikasi')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verifikasi & Rilis ke Peta</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 6: JEJAK AUDIT DIGITAL                                    */}
              {/* ============================================================= */}
              {activeTab === 'audit' && (
                <div className="space-y-4">
                  <div className="bg-[#141E28] p-3 rounded-xl border border-[#243444] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Jejak Rekam Mutasi Data Geospasial</h3>
                      <p className="text-[11px] text-slate-400">Audit trail kepatuhan integritas data operasional Pusdalops BPBD.</p>
                    </div>

                    <button
                      onClick={loadAudit}
                      className="px-2.5 py-1 text-xs rounded bg-[#0F1720] border border-[#243444] text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh Log</span>
                    </button>
                  </div>

                  <div className="bg-[#141E28] rounded-xl border border-[#243444] overflow-hidden">
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#243444]">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="p-3 text-xs flex items-start justify-between gap-3 hover:bg-[#1B2733]/40 transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-300 text-[11px]">{log.aksi}</span>
                              <span className="text-[10px] text-slate-400 font-mono">Tabel: {log.tabel} #{log.record_id || '-'}</span>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              Oleh: <strong className="text-white">{log.operator}</strong> ({log.role.toUpperCase()})
                            </div>
                          </div>

                          <div className="text-right text-[10px] font-mono text-slate-400 shrink-0">
                            <div className="flex items-center gap-1 justify-end">
                              <Clock className="w-3 h-3" />
                              <span>{log.waktu ? new Date(log.waktu).toLocaleTimeString('id-ID') : '-'}</span>
                            </div>
                            <div>{log.ip_address || '127.0.0.1'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 7: KELOLA PERSONEL (ADMIN)                                */}
              {/* ============================================================= */}
              {activeTab === 'pengguna' && currentUser.role === 'admin' && (
                <div className="space-y-4">
                  <div className="bg-[#141E28] p-3 rounded-xl border border-[#243444]">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Daftar Personel & Hak Akses Berjenjang (RBAC)</h3>
                    <p className="text-[11px] text-slate-400">Pengelolaan otoritas operator lapangan, admin pusdalops, dan pimpinan daerah.</p>
                  </div>

                  <div className="bg-[#141E28] rounded-xl border border-[#243444] overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#0F1720] text-slate-400 text-[11px] uppercase font-mono border-b border-[#243444]">
                        <tr>
                          <th className="py-2.5 px-3">Nama Petugas</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Wilayah Tugas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#243444]">
                        {userList.map((u) => (
                          <tr key={u.id} className="hover:bg-[#1B2733]/40">
                            <td className="py-2 px-3 font-bold text-white">{u.nama}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{u.email}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                {u.role}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{u.wilayah_tugas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Sync Sensor BMKG Card */}
                  <div className="p-4 rounded-xl bg-[#141E28] border border-[#243444] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Sinkronisasi Sensor BMKG TEWS</h4>
                      <p className="text-[11px] text-slate-400">Paksa pembaruan data gempa terkini dan parameter isoseismal dari BMKG pusat.</p>
                    </div>
                    <button
                      onClick={handleSyncBmkg}
                      disabled={syncingBmkg}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingBmkg ? 'animate-spin' : ''}`} />
                      <span>Tarik Data BMKG</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 8: KPI EKSEKUTIF & SITREP (PIMPINAN)                      */}
              {/* ============================================================= */}
              {activeTab === 'eksekutif' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#141E28] border border-[#243444]">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Total Kejadian</span>
                      <div className="text-xl font-bold text-white font-display mt-0.5">
                        {statistikData?.ringkasan?.total_kejadian || 0}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30">
                      <span className="text-[10px] font-mono uppercase text-rose-400">Korban Jiwa</span>
                      <div className="text-xl font-bold text-rose-300 font-display mt-0.5">
                        {statistikData?.ringkasan?.total_meninggal || 0} Jiwa
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                      <span className="text-[10px] font-mono uppercase text-emerald-400">Total Pengungsi</span>
                      <div className="text-xl font-bold text-emerald-300 font-display mt-0.5">
                        {(statistikData?.ringkasan?.total_pengungsi || 0).toLocaleString()} Jiwa
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30">
                      <span className="text-[10px] font-mono uppercase text-amber-400">Estimasi Kerugian</span>
                      <div className="text-xl font-bold text-amber-300 font-display mt-0.5">
                        Rp {((statistikData?.ringkasan?.total_kerugian || 0) / 1_000_000_000).toFixed(2)} M
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
