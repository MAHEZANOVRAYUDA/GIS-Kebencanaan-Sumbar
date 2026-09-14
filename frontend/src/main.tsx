import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Registrasi Service Worker PWA secara otomatis (01-arsitektur.md & 11-optimasi-performa.md)
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('Pembaruan basemap/dashboard tersedia.');
  },
  onOfflineReady() {
    console.info('GIS Kebencanaan Sumbar: Seluruh cache offline (basemap, style, posko) siap digunakan.');
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
