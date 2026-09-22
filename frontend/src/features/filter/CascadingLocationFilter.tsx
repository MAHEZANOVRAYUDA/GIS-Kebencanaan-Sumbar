import React, { useState, useEffect, useCallback } from 'react';
import { SearchableCombobox, type ComboboxOption } from './SearchableCombobox';
import { RotateCcw, Landmark, CheckCircle2, Navigation } from 'lucide-react';

export interface SelectedLocationResult {
  id_provinsi: string;
  nama_provinsi: string;
  id_kota: string;
  nama_kota: string;
  id_kecamatan: string;
  nama_kecamatan: string;
}

interface CascadingLocationFilterProps {
  onSearchLocation?: (result: SelectedLocationResult) => void;
  onSelectKota?: (kota: ComboboxOption) => void;
  onSelectKecamatan?: (kecamatan: ComboboxOption) => void;
  onLocationChange?: (partial: {
    provinsi: ComboboxOption;
    kota: ComboboxOption | null;
    kecamatan: ComboboxOption | null;
  }) => void;
  submitButtonText?: string;
  isSubmitting?: boolean;
  hideSubmitButton?: boolean;
  className?: string;
  initialKotaId?: string;
  initialKecamatanId?: string;
}

// Default Provinsi Sumatera Barat (Otomatis & Terkunci)
const DEFAULT_PROVINSI: ComboboxOption = {
  id: '13',
  nama: 'Sumatera Barat',
  extra: 'Provinsi Utama'
};

export const CascadingLocationFilter: React.FC<CascadingLocationFilterProps> = ({
  onSearchLocation,
  onSelectKota,
  onSelectKecamatan,
  onLocationChange,
  submitButtonText = 'Fokuskan Lokasi',
  isSubmitting = false,
  hideSubmitButton = false,
  className = '',
  initialKotaId,
  initialKecamatanId
}) => {
  // State Level 1: Kota / Kabupaten (Langsung Dimuat Tanpa Opsi Provinsi)
  const [kotaList, setKotaList] = useState<ComboboxOption[]>([]);
  const [selectedKota, setSelectedKota] = useState<ComboboxOption | null>(null);
  const [loadingKota, setLoadingKota] = useState<boolean>(false);
  const [errorKota, setErrorKota] = useState<string | null>(null);

  // State Level 2: Kecamatan
  const [kecamatanList, setKecamatanList] = useState<ComboboxOption[]>([]);
  const [selectedKecamatan, setSelectedKecamatan] = useState<ComboboxOption | null>(null);
  const [loadingKecamatan, setLoadingKecamatan] = useState<boolean>(false);
  const [errorKecamatan, setErrorKecamatan] = useState<string | null>(null);
  const [hasNoKecamatan, setHasNoKecamatan] = useState<boolean>(false);

  // ==========================================================================
  // FETCH TINGKAT 1: KOTA / KABUPATEN DI SUMATERA BARAT (Otomatis saat Load)
  // ==========================================================================
  const fetchKotaSumbar = useCallback(async () => {
    setLoadingKota(true);
    setErrorKota(null);
    try {
      // Panggil endpoint /api/kota?id_provinsi=13
      const res = await fetch('/api/kota?id_provinsi=13');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: ComboboxOption[] = Array.isArray(data)
        ? data.map((k: any) => ({
            id: String(k.id),
            nama: k.nama,
            extra: k.nama.startsWith('Kota') ? 'Kota Otonom' : 'Kabupaten'
          }))
        : [];
      setKotaList(items);

      // Inisialisasi awal jika ada props
      if (initialKotaId && items.length > 0) {
        const found = items.find((k) => k.id === initialKotaId);
        if (found) {
          setSelectedKota(found);
          fetchKecamatanByKota(found.id);
        }
      }
    } catch (err: any) {
      console.error('Gagal mengambil data kota Sumbar:', err);
      setErrorKota('Gagal memuat daftar Kota/Kabupaten. Periksa koneksi API.');
    } finally {
      setLoadingKota(false);
    }
  }, [initialKotaId]);

  useEffect(() => {
    fetchKotaSumbar();
  }, [fetchKotaSumbar]);

  // ==========================================================================
  // FETCH TINGKAT 2: KECAMATAN BERDASARKAN KOTA TERPILIH
  // ==========================================================================
  const fetchKecamatanByKota = useCallback(async (idKota: string) => {
    setLoadingKecamatan(true);
    setErrorKecamatan(null);
    setHasNoKecamatan(false);
    try {
      const res = await fetch(`/api/kecamatan?id_kota=${encodeURIComponent(idKota)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: ComboboxOption[] = Array.isArray(data)
        ? data.map((kc: any) => ({
            id: String(kc.id),
            nama: kc.nama,
            extra: `Kode: ${kc.id}`,
            // FIX: Sertakan metadata lengkap agar App.tsx dapat flyTo & loadKotaBoundaries
            lat: kc.lat,
            lon: kc.lon,
            kode_wilayah: kc.kode_wilayah,
          }))
        : [];

      setKecamatanList(items);

      if (items.length === 0) {
        setHasNoKecamatan(true);
      }

      if (initialKecamatanId && items.length > 0) {
        const found = items.find((kc) => kc.id === initialKecamatanId);
        if (found) setSelectedKecamatan(found);
      }
    } catch (err: any) {
      console.error('Gagal mengambil data kecamatan:', err);
      setErrorKecamatan('Gagal memuat daftar kecamatan. Silakan coba lagi.');
    } finally {
      setLoadingKecamatan(false);
    }
  }, [initialKecamatanId]);

  // ==========================================================================
  // HANDLERS PERUBAHAN CASCADING
  // ==========================================================================
  const handleKotaChange = (option: ComboboxOption | null) => {
    setSelectedKota(option);
    setSelectedKecamatan(null);
    setKecamatanList([]);
    setHasNoKecamatan(false);
    setErrorKecamatan(null);

    if (option) {
      fetchKecamatanByKota(option.id);
      onSelectKota?.(option);
    }
  };

  const handleKecamatanChange = (option: ComboboxOption | null) => {
    setSelectedKecamatan(option);
    if (option) {
      onSelectKecamatan?.(option);
    }
  };

  // Notifikasi perubahan ke parent
  useEffect(() => {
    if (onLocationChange) {
      onLocationChange({
        provinsi: DEFAULT_PROVINSI,
        kota: selectedKota,
        kecamatan: selectedKecamatan
      });
    }
  }, [selectedKota, selectedKecamatan, onLocationChange]);

  // Reset filter ke state awal
  const handleReset = () => {
    setSelectedKota(null);
    setSelectedKecamatan(null);
    setKecamatanList([]);
    setErrorKota(null);
    setErrorKecamatan(null);
    setHasNoKecamatan(false);
  };

  const isFormValid = Boolean(selectedKota && selectedKecamatan);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedKota || !selectedKecamatan) return;

    onSearchLocation?.({
      id_provinsi: DEFAULT_PROVINSI.id,
      nama_provinsi: DEFAULT_PROVINSI.nama,
      id_kota: selectedKota.id,
      nama_kota: selectedKota.nama,
      id_kecamatan: selectedKecamatan.id,
      nama_kecamatan: selectedKecamatan.nama
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-4 rounded-2xl bg-[#0B131D]/95 border border-[#223548] shadow-2xl space-y-3.5 text-slate-100 backdrop-blur-xl ${className}`}
    >
      {/* Header Elegan dengan Status Default Sumatera Barat */}
      <div className="flex items-center justify-between border-b border-[#1E2E3E] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-1.5">
              Pilih Wilayah Terfokus
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-emerald-950/70 border border-emerald-600/50 text-emerald-300">
                Sumatera Barat
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">
              Kabupaten / Kota &rarr; Kecamatan secara terarah
            </p>
          </div>
        </div>

        {(selectedKota || selectedKecamatan) && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#14202C] hover:bg-[#1A2A3A] border border-[#233547] text-[10px] text-slate-300 hover:text-amber-400 transition-colors font-mono cursor-pointer"
            title="Reset pilihan wilayah"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* 2 Combobox Bertingkat yang Lapang & Responsif (Stacked Vertikal Lebar Penuh) */}
      <div className="flex flex-col gap-3">
        {/* Tingkat 1: Kota / Kabupaten */}
        <SearchableCombobox
          label="1. Kabupaten / Kota"
          options={kotaList}
          selectedValue={selectedKota?.id || null}
          onSelect={handleKotaChange}
          loading={loadingKota}
          error={errorKota}
          onRetry={fetchKotaSumbar}
          placeholder="Cari atau pilih Kab/Kota..."
          emptyMessage="Kabupaten/Kota tidak ditemukan"
          required
        />

        {/* Tingkat 2: Kecamatan */}
        <SearchableCombobox
          label="2. Kecamatan"
          options={kecamatanList}
          selectedValue={selectedKecamatan?.id || null}
          onSelect={handleKecamatanChange}
          disabled={!selectedKota}
          loading={loadingKecamatan}
          error={errorKecamatan}
          onRetry={() => selectedKota && fetchKecamatanByKota(selectedKota.id)}
          placeholder={selectedKota ? `Kecamatan di ${selectedKota.nama}...` : 'Pilih Kab/Kota dahulu'}
          disabledPlaceholder="Pilih Kabupaten/Kota di samping terlebih dahulu"
          emptyMessage={
            hasNoKecamatan
              ? 'Belum ada data kecamatan terdaftar'
              : 'Tidak ditemukan kecamatan yang cocok'
          }
          required
        />
      </div>

      {/* Ringkasan Status Seleksi Aktif */}
      {selectedKota && (
        <div className="p-2.5 rounded-xl bg-[#0D1B2A]/90 border border-teal-600/30 flex items-center justify-between text-[11px] text-teal-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              Fokus: <strong>{selectedKota.nama}</strong>
              {selectedKecamatan ? (
                <> &bull; Kec. <strong className="text-white">{selectedKecamatan.nama}</strong></>
              ) : (
                <span className="text-slate-400 text-[10px] ml-1.5">(Silakan pilih kecamatan)</span>
              )}
            </span>
          </div>
          <span className="font-mono text-[10px] bg-teal-950/80 px-2 py-0.5 rounded text-teal-300 border border-teal-700/50 shrink-0 ml-2">
            Sumbar
          </span>
        </div>
      )}

      {/* Tombol Aksi Submit Opsional */}
      {!hideSubmitButton && onSearchLocation && (
        <div className="pt-1 flex items-center justify-end">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 shadow-lg ${
              isFormValid && !isSubmitting
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50 cursor-pointer active:scale-98'
                : 'bg-[#152332] text-slate-500 border border-[#233547] cursor-not-allowed opacity-60 shadow-none'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Mengarahkan Peta...' : submitButtonText}</span>
          </button>
        </div>
      )}
    </form>
  );
};

export default CascadingLocationFilter;
