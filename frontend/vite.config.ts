import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'styles/*.json'],
      manifest: {
        name: 'GIS Kebencanaan Sumatera Barat',
        short_name: 'GIS BPBD Sumbar',
        description: 'Sistem Informasi Geografis & Evakuasi Bencana BPBD Provinsi Sumatera Barat (LPPM UPI YPTK)',
        theme_color: '#0F1720',
        background_color: '#0F1720',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6 MiB (mendukung bundle MapLibre GL + ECharts)
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(mt[0-3]\.google\.com|server\.arcgisonline\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'basemap-tiles-cache',
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 hari
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/api\/tiles\/.*\.mvt/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'vector-tiles-mvt-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 hari
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\/styles\/.*\.json/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-styles-cache'
            }
          },
          {
            urlPattern: /\/api\/posko.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'posko-data-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 3 // 3 hari
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/demotiles\.maplibre\.org\/font\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maplibre-glyphs-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'terrain-dem-cache',
              expiration: {
                maxEntries: 800,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/maplibre-gl') || id.includes('node_modules/pmtiles')) {
            return 'vendor-maplibre';
          }
          if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) {
            return 'vendor-echarts';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/provinsi': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/kota': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/kecamatan': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
