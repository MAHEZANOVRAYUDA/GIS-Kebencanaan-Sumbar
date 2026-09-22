import React, { useState, useRef, useEffect, useId } from 'react';
import { Search, ChevronDown, Check, X, RefreshCw, AlertCircle } from 'lucide-react';

export interface ComboboxOption {
  id: string;
  nama: string;
  extra?: string;
  // Metadata tambahan untuk geospatial flyTo & boundary loading
  lat?: number;
  lon?: number;
  kode_wilayah?: string;
  [key: string]: any; // Izinkan field tambahan lain (id_kota, nama_kota, dll)
}

interface SearchableComboboxProps {
  label: string;
  options: ComboboxOption[];
  selectedValue: string | null;
  onSelect: (option: ComboboxOption | null) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  placeholder?: string;
  disabledPlaceholder?: string;
  emptyMessage?: string;
  idPrefix?: string;
  required?: boolean;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  disabled = false,
  loading = false,
  error = null,
  onRetry,
  placeholder = 'Ketik atau pilih...',
  disabledPlaceholder = 'Pilih level sebelumnya terlebih dahulu',
  emptyMessage = 'Tidak ada opsi tersedia',
  idPrefix = 'combobox',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const uniqueId = useId();
  const inputId = `${idPrefix}-${uniqueId}`;
  const listboxId = `listbox-${uniqueId}`;

  // Cari opsi yang sedang terpilih
  const selectedOption = options.find((opt) => opt.id === selectedValue);

  // Sinkronisasi teks input saat selectedOption berubah atau dropdown tertutup
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(selectedOption ? selectedOption.nama : '');
    }
  }, [selectedOption, isOpen]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter opsi berdasarkan teks pencarian
  const filteredOptions = options.filter((opt) =>
    opt.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || loading) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  // Scroll otomatis ke item yang disorot
  useEffect(() => {
    if (isOpen && listboxRef.current && highlightedIndex >= 0) {
      const activeEl = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectOption = (option: ComboboxOption) => {
    onSelect(option);
    setSearchQuery(option.nama);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (!disabled && !loading) {
      setIsOpen(true);
    }
  };

  const effectivePlaceholder = disabled ? disabledPlaceholder : placeholder;

  return (
    <div className="space-y-1.5 w-full relative" ref={containerRef}>
      {/* Label & Header Status */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className={`text-[11px] font-semibold tracking-wide uppercase font-mono ${
            disabled ? 'text-slate-500' : 'text-slate-300'
          }`}
        >
          {label} {required && <span className="text-rose-400">*</span>}
        </label>

        {loading && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono animate-pulse">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span>Memuat...</span>
          </span>
        )}
      </div>

      {/* Input Field Box */}
      <div
        className={`relative flex items-center rounded-xl border transition-all duration-150 ${
          disabled
            ? 'bg-[#0E1622]/60 border-[#1C2B3A] opacity-60 cursor-not-allowed'
            : error
            ? 'bg-[#151D28] border-rose-500/80 focus-within:ring-2 focus-within:ring-rose-500/40'
            : isOpen
            ? 'bg-[#152334] border-amber-400/90 shadow-lg shadow-amber-950/20 ring-1 ring-amber-400/40'
            : 'bg-[#121E2C] border-[#253A50] hover:border-slate-500 focus-within:border-amber-400'
        }`}
      >
        <div className="pl-3 text-slate-400 pointer-events-none">
          <Search className="w-3.5 h-3.5" />
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-haspopup="listbox"
          disabled={disabled || loading}
          value={searchQuery}
          placeholder={effectivePlaceholder}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent px-2.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none ${
            disabled ? 'cursor-not-allowed text-slate-500' : ''
          }`}
        />

        {/* Clear Button & Dropdown Trigger */}
        <div className="flex items-center gap-1 pr-2">
          {!disabled && selectedOption && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Hapus pilihan"
              tabIndex={-1}
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled || loading}
            onClick={() => {
              if (!disabled && !loading) {
                setIsOpen(!isOpen);
                inputRef.current?.focus();
              }
            }}
            className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
            tabIndex={-1}
            aria-label="Buka pilihan"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-amber-400' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Pesan Error Singkat & Tombol Retry */}
      {error && !disabled && (
        <div className="flex items-center justify-between text-[11px] text-rose-400 bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-800/40 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span className="truncate">{error}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="ml-2 px-1.5 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-mono shrink-0 transition-colors"
            >
              Coba Lagi
            </button>
          )}
        </div>
      )}

      {/* Floating Dropdown Listbox */}
      {isOpen && !disabled && (
        <div
          className="absolute left-0 right-0 top-full mt-1 bg-[#0F1722]/98 backdrop-blur-xl border border-[#273D54] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-60 flex flex-col"
        >
          <ul
            id={listboxId}
            ref={listboxRef}
            role="listbox"
            className="overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-700"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.id === selectedValue;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <li
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors border-b border-[#182635] last:border-0 ${
                      isHighlighted
                        ? 'bg-[#1C2C3E] text-white'
                        : isSelected
                        ? 'bg-[#152333] text-amber-300 font-semibold'
                        : 'text-slate-200 hover:bg-[#162434]'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="truncate">{opt.nama}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Kode: {opt.id} {opt.extra ? `• ${opt.extra}` : ''}
                      </span>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-4 text-center text-xs text-slate-400 italic">
                {emptyMessage}
              </li>
            )}
          </ul>

          {filteredOptions.length > 0 && (
            <div className="px-3 py-1.5 bg-[#090F16] border-t border-[#1C2A3A] flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{filteredOptions.length} opsi ditemukan</span>
              <span>Gunakan ↑↓ dan Enter</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
