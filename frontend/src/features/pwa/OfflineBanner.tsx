import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2, CloudAlert } from 'lucide-react';

interface OfflineBannerProps {
  lastUpdated?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ lastUpdated }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnectedToast, setShowReconnectedToast] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
  });

  useEffect(() => {
    if (lastUpdated) {
      setLastSyncTime(lastUpdated);
    }
  }, [lastUpdated]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedToast(true);
      const now = new Date();
      setLastSyncTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`);

      const timer = setTimeout(() => {
        setShowReconnectedToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnectedToast) {
    return null;
  }

  if (showReconnectedToast) {
    return (
      <div 
        id="offline-banner-reconnected"
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 bg-[#1B2733] border border-[#1E7A46]/70 rounded-full shadow-2xl shadow-emerald-950/60 backdrop-blur-md text-sm text-[#E8ECF1] transition-all animate-bounce"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="w-4 h-4 text-[#1E7A46] shrink-0" />
        <span>Koneksi Pulih — Data peta & bencana tersinkronisasi otomatis.</span>
      </div>
    );
  }

  return (
    <div
      id="offline-banner-alert"
      className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#1B2733] border border-[#D98E04]/70 rounded-xl shadow-2xl shadow-amber-950/60 backdrop-blur-md text-sm text-[#E8ECF1] transition-all"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#D98E04]/20 text-[#D98E04] shrink-0">
        <WifiOff className="w-4 h-4" />
      </div>
      <div>
        <div className="font-semibold text-xs text-[#D98E04] uppercase tracking-wider flex items-center gap-1.5">
          <CloudAlert className="w-3.5 h-3.5 inline" />
          Mode Offline Tanggap Darurat
        </div>
        <div className="text-xs text-slate-300">
          Menggunakan data cache lokal — data terakhir diperbarui pukul <strong className="text-white font-mono">{lastSyncTime}</strong>
        </div>
      </div>
    </div>
  );
};
