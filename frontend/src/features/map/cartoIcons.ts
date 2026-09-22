/**
 * STANDAR KARTOGRAFI KEBENCANAAN SPASIAL BPBD PROV. SUMBAR & LPPM UPI YPTK
 * Standar Internasional:
 * - UN OCHA Humanitarian Iconography (Emergency Shelter / IDP Camp)
 * - ISO 7001 Public Information & Medical Facilities
 * - UNESCO-IOC & ISO 20712-1 Tsunami Vertical Evacuation Building
 * - ISO 22324 / BMKG Acoustic Siren Early Warning Tower
 *
 * Rendered at 64x64 Retina resolution (pixelRatio 2) for ultra-crisp display on all devices.
 */

import type { Map } from 'maplibre-gl';

// 1. Posko Pengungsi (UN OCHA Emergency Shelter / IDP Camp & BNPB)
export const SVG_POSKO_PENGUNGSI = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow-posko" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Squircle Base Pin (Oranye Tanggap Darurat BNPB/OCHA) -->
  <rect x="4" y="4" width="56" height="56" rx="14" fill="#EA580C" stroke="#FFFFFF" stroke-width="3" filter="url(#shadow-posko)"/>
  
  <!-- Fasad Atap Pelindung Shelter (UN OCHA Standard) -->
  <path d="M 32 14 L 49 27 L 46 29.5 L 32 18.5 L 18 29.5 L 15 27 Z" fill="#FFFFFF"/>
  
  <!-- Tiang Struktur Kiri & Kanan -->
  <rect x="19" y="30" width="3.5" height="15" rx="1" fill="#FFFFFF"/>
  <rect x="41.5" y="30" width="3.5" height="15" rx="1" fill="#FFFFFF"/>
  <rect x="16" y="44" width="32" height="3" rx="1.5" fill="#FFFFFF"/>
  
  <!-- Figur Pengungsi di Dalam Shelter (Keluarga/Individu Terlindungi) -->
  <circle cx="32" cy="27" r="3.5" fill="#FFFFFF"/>
  <path d="M 27 41 C 27 34 37 34 37 41 Z" fill="#FFFFFF"/>
</svg>
`;

// 2. Faskes Pengungsi (ISO 7001 Medical / PMI Standar)
export const SVG_FASKES_PENGUNGSI = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow-faskes" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Squircle Base Pin (Hijau Medis Kemanusiaan) -->
  <rect x="4" y="4" width="56" height="56" rx="14" fill="#059669" stroke="#FFFFFF" stroke-width="3" filter="url(#shadow-faskes)"/>
  
  <!-- Bold Swiss Cross / Medical Cross (ISO 7001) -->
  <path d="M 28 17 L 36 17 L 36 28 L 47 28 L 47 36 L 36 36 L 36 47 L 28 47 L 28 36 L 17 36 L 17 28 L 28 28 Z" fill="#FFFFFF"/>
</svg>
`;

// 3. Shelter Vertikal TES Tsunami (UNESCO-IOC & ISO 20712-1)
export const SVG_SHELTER_TES = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow-tes" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Squircle Base Pin (Biru Maritim / UNESCO Tsunami) -->
  <rect x="4" y="4" width="56" height="56" rx="14" fill="#0284C7" stroke="#FFFFFF" stroke-width="3" filter="url(#shadow-tes)"/>
  
  <!-- Bangunan 3 Lantai Beton Bertulang -->
  <rect x="17" y="17" width="18" height="27" rx="1.5" fill="none" stroke="#FFFFFF" stroke-width="2.8"/>
  <line x1="17" y1="26" x2="35" y2="26" stroke="#FFFFFF" stroke-width="2.2"/>
  <line x1="17" y1="35" x2="35" y2="35" stroke="#FFFFFF" stroke-width="2.2"/>
  
  <!-- Jendela Lantai Evakuasi -->
  <rect x="21" y="20.5" width="3" height="3" fill="#FFFFFF"/>
  <rect x="28" y="20.5" width="3" height="3" fill="#FFFFFF"/>
  <rect x="21" y="29.5" width="3" height="3" fill="#FFFFFF"/>
  <rect x="28" y="29.5" width="3" height="3" fill="#FFFFFF"/>
  
  <!-- Panah Evakuasi Vertikal Menuju Lantai Atas / Atap Bebas Tsunami -->
  <path d="M 44 38 L 44 20 L 39.5 24 M 44 20 L 48.5 24" fill="none" stroke="#FDE047" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Gelombang Air Tsunami di Bawah Bangunan -->
  <path d="M 12 47 C 16 45 20 49 24 47 C 28 45 32 49 36 47 C 40 45 44 49 48 47" fill="none" stroke="#BAE6FD" stroke-width="2.5" stroke-linecap="round"/>
</svg>
`;

// 4. Sirine EWS Tsunami BPBD - Siaga Aktif (ISO 22324 / BMKG)
export const SVG_SIRINE_AKTIF = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow-sirine" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Squircle Base Pin (Kuning Amber Peringatan Dini) -->
  <rect x="4" y="4" width="56" height="56" rx="14" fill="#D97706" stroke="#FFFFFF" stroke-width="3" filter="url(#shadow-sirine)"/>
  
  <!-- Menara Kisi Baja Sirine (Lattice Tower) -->
  <line x1="26" y1="48" x2="30" y2="28" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="38" y1="48" x2="34" y2="28" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="28" y1="36" x2="36" y2="36" stroke="#FFFFFF" stroke-width="2"/>
  <line x1="27" y1="44" x2="37" y2="44" stroke="#FFFFFF" stroke-width="2"/>
  
  <!-- Kepala Pemancar & Speaker Corong Sirine 4 Arah -->
  <rect x="29.5" y="21" width="5" height="8" rx="1.5" fill="#FFFFFF"/>
  <!-- Corong Kiri -->
  <path d="M 29.5 22.5 L 20 18.5 L 20 29.5 L 29.5 25.5 Z" fill="#FFFFFF"/>
  <!-- Corong Kanan -->
  <path d="M 34.5 22.5 L 44 18.5 L 44 29.5 L 34.5 25.5 Z" fill="#FFFFFF"/>
  
  <!-- Gelombang Suara Akustik (Acoustic Shockwaves) -->
  <path d="M 16 19 C 13.5 21.5 13.5 26.5 16 29" fill="none" stroke="#FEF08A" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M 48 19 C 50.5 21.5 50.5 26.5 48 29" fill="none" stroke="#FEF08A" stroke-width="2.4" stroke-linecap="round"/>
</svg>
`;

// 5. Sirine EWS Tsunami BPBD - Dalam Pemeliharaan (Muted Slate)
export const SVG_SIRINE_MAINT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <filter id="shadow-maint" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>
  <!-- Squircle Base Pin (Slate Muted) -->
  <rect x="4" y="4" width="56" height="56" rx="14" fill="#475569" stroke="#94A3B8" stroke-width="3" filter="url(#shadow-maint)"/>
  
  <!-- Menara Sirine Abu-Abu -->
  <line x1="26" y1="48" x2="30" y2="28" stroke="#E2E8F0" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="38" y1="48" x2="34" y2="28" stroke="#E2E8F0" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="28" y1="36" x2="36" y2="36" stroke="#E2E8F0" stroke-width="2"/>
  <rect x="29.5" y="21" width="5" height="8" rx="1.5" fill="#E2E8F0"/>
  <path d="M 29.5 22.5 L 20 18.5 L 20 29.5 L 29.5 25.5 Z" fill="#E2E8F0"/>
  <path d="M 34.5 22.5 L 44 18.5 L 44 29.5 L 34.5 25.5 Z" fill="#E2E8F0"/>
  
  <!-- Badge Kunci Pas Inspeksi / Pemeliharaan Teknis -->
  <circle cx="45" cy="45" r="7.5" fill="#0F172A" stroke="#CBD5E1" stroke-width="2"/>
  <path d="M 42 48 L 48 42" stroke="#FDE047" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="47" cy="43" r="1.5" fill="#0F172A"/>
</svg>
`;

/**
 * Daftarkan seluruh 5 ikon kartografis resmi ke MapLibre GL instance
 */
export async function registerCartoIcons(map: Map): Promise<void> {
  const icons: { id: string; svg: string }[] = [
    { id: 'carto-posko-pengungsi', svg: SVG_POSKO_PENGUNGSI },
    { id: 'carto-faskes-pengungsi', svg: SVG_FASKES_PENGUNGSI },
    { id: 'carto-shelter-tes', svg: SVG_SHELTER_TES },
    { id: 'carto-sirine-aktif', svg: SVG_SIRINE_AKTIF },
    { id: 'carto-sirine-maint', svg: SVG_SIRINE_MAINT },
  ];

  await Promise.all(
    icons.map(
      ({ id, svg }) =>
        new Promise<void>((resolve) => {
          if (map.hasImage(id)) {
            resolve();
            return;
          }

          const img = new Image(64, 64);
          img.onload = () => {
            if (!map.hasImage(id)) {
              map.addImage(id, img, { pixelRatio: 2 });
            }
            resolve();
          };
          img.onerror = () => {
            console.warn(`[GIS] Gagal memuat ikon kartografi ${id}`);
            resolve();
          };
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
        })
    )
  );
}
