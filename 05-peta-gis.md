# 05 — Peta & GIS Teknis (MapLibre GL JS)

## Instalasi

```bash
npm install maplibre-gl pmtiles
```

## Setup dasar MapLibre + protokol PMTiles

```typescript
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';

const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const map = new maplibregl.Map({
  container: 'map',
  style: '/styles/terang.json',   // style JSON kustom, lihat di bawah
  center: [100.3543, -0.9471],     // Padang, sebagai pusat default
  zoom: 8,
  maxBounds: [[97.0, -3.5], [102.5, 1.5]],  // batasi ke sekitar wilayah Sumbar
});

map.addControl(new maplibregl.NavigationControl(), 'top-right');
map.addControl(new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
}), 'top-right');
```

## Membangun basemap PMTiles kustom (langkah lengkap)

Ini bagian paling penting untuk menjawab permintaan "peta yang bagus dan bisa dikustomisasi" — **jangan langsung pakai tile provider gratis apa adanya**, bangun basemap sendiri.

### Langkah 1 — Ekstrak data OpenStreetMap wilayah Sumbar

```bash
# Unduh ekstrak region Sumatera dari Geofabrik (gratis)
wget https://download.geofabrik.de/asia/indonesia/sumatra-latest.osm.pbf

# Potong hanya area Sumatera Barat menggunakan osmium (lebih ringan diproses)
osmium extract -b 97.0,-3.5,102.5,1.5 sumatra-latest.osm.pbf -o sumbar.osm.pbf
```

### Langkah 2 — Build file .pmtiles menggunakan Planetiler (jauh lebih cepat dari tippecanoe untuk area sebesar ini)

```bash
java -jar planetiler.jar --area=sumbar --download \
  --osm-path=sumbar.osm.pbf \
  --output=sumbar-basemap.pmtiles
```

Planetiler menghasilkan skema data mirip OpenMapTiles (layer: water, landuse, roads, buildings, place labels, dst) — skema ini yang akan dirujuk oleh style JSON.

### Langkah 3 — Hosting file .pmtiles

Untuk demo/development: taruh langsung di folder `public/` frontend dan sajikan sebagai file statis.

Untuk tahap lebih matang: hosting di object storage (MinIO self-hosted, kompatibel S3) dengan HTTP Range Request diaktifkan — PMTiles dirancang untuk dibaca sebagian (byte range), bukan diunduh utuh, sehingga performa tetap baik meski file berukuran ratusan MB.

### Langkah 4 — Referensikan di source MapLibre

```json
{
  "sources": {
    "basemap": {
      "type": "vector",
      "url": "pmtiles://https://storage.contoh.go.id/sumbar-basemap.pmtiles"
    }
  }
}
```

## Style JSON kustom — struktur dasar (3 varian wajib)

Buat 3 file: `styles/terang.json`, `styles/gelap.json`, `styles/satelit.json`. Style mengikuti [MapLibre Style Specification](https://maplibre.org/maplibre-style-spec/). Gunakan tool **Maputnik** (editor visual open-source untuk MapLibre style) agar desainer/GIS analyst tidak perlu menulis JSON manual satu-satu.

Contoh sebagian style mode gelap (fokus pada warna semantik konsisten dengan design tokens di `04-frontend-ui-ux.md`):

```json
{
  "version": 8,
  "name": "Sumbar Gelap",
  "sources": { "basemap": { "type": "vector", "url": "pmtiles://..." } },
  "glyphs": "/fonts/{fontstack}/{range}.pbf",
  "layers": [
    { "id": "background", "type": "background", "paint": { "background-color": "#0F1720" } },
    { "id": "water", "type": "fill", "source": "basemap", "source-layer": "water",
      "paint": { "fill-color": "#1A2F42" } },
    { "id": "landuse-vegetation", "type": "fill", "source": "basemap", "source-layer": "landuse",
      "filter": ["==", "class", "wood"], "paint": { "fill-color": "#16241C" } },
    { "id": "roads-major", "type": "line", "source": "basemap", "source-layer": "transportation",
      "filter": ["in", "class", "motorway", "trunk", "primary"],
      "paint": { "line-color": "#3A5A82", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 16, 5] } },
    { "id": "place-labels", "type": "symbol", "source": "basemap", "source-layer": "place",
      "layout": { "text-field": ["get", "name"], "text-font": ["Inter Regular"], "text-size": 13 },
      "paint": { "text-color": "#E8ECF1", "text-halo-color": "#0F1720", "text-halo-width": 1.2 } }
  ]
}
```

Prinsip styling data-driven ala Google Maps: **lebar jalan bertambah seiring zoom** (`interpolate` + `zoom`), label kota **ukuran proporsional dengan tingkat kepentingan** (`text-size` dari properti populasi), dan warna kategori lahan konsisten dan enak dipandang (bukan warna default OSM yang mentah).

## Layer visualisasi data kebencanaan

> **Penting — baca `11-optimasi-performa.md` sebelum implementasi bagian ini.** Contoh di bawah untuk choropleth/heatmap ditulis dengan asumsi data sudah disajikan lewat vector tile (MVT) hasil pre-build, BUKAN GeoJSON mentah langsung dari query database. Untuk data 147 kecamatan Sumbar, GeoJSON mentah kemungkinan masih bisa ditoleransi untuk prototipe awal/demo cepat, tapi untuk versi yang dianggap "siap production", ganti source `geojson` di bawah menjadi source `vector` yang menunjuk ke tile hasil `ST_AsMVT` pre-build — pola sama seperti basemap PMTiles, hanya datanya dari layer sendiri, bukan OSM.

### Choropleth (fill layer dengan data-driven color)

**Versi prototipe cepat (GeoJSON langsung — cukup untuk demo, database kecil):**

```typescript
map.addSource('choropleth-risiko', { type: 'geojson', data: '/api/wilayah/choropleth?level=kecamatan' });

map.addLayer({
  id: 'choropleth-risiko-fill',
  type: 'fill',
  source: 'choropleth-risiko',
  paint: {
    'fill-color': [
      'interpolate', ['linear'], ['get', 'total_kerugian'],
      0, '#1E7A46',           // aman — hijau
      500000000, '#D98E04',   // sedang — oranye
      2000000000, '#C0392B',  // tinggi — merah
    ],
    'fill-opacity': 0.65,
  },
});
```

**Versi vector tile (direkomendasikan untuk production — lebih ringan, lihat `11-optimasi-performa.md`):**

```typescript
map.addSource('choropleth-risiko', {
  type: 'vector',
  tiles: ['https://api.contoh.go.id/tiles/choropleth/{z}/{x}/{y}.mvt'],
  minzoom: 5,
  maxzoom: 12,
});

map.addLayer({
  id: 'choropleth-risiko-fill',
  type: 'fill',
  source: 'choropleth-risiko',
  'source-layer': 'choropleth_kecamatan',   // nama layer di dalam tile, ditentukan saat generate MVT
  paint: {
    'fill-color': [
      'interpolate', ['linear'], ['get', 'total_kerugian'],
      0, '#1E7A46', 500000000, '#D98E04', 2000000000, '#C0392B',
    ],
    'fill-opacity': 0.65,
  },
});
```

Perbedaan hanya di sisi `addSource` (vector tile vs GeoJSON) — kode `addLayer` untuk styling nyaris identik, sehingga migrasi dari versi prototipe ke versi production tidak butuh menulis ulang seluruh logic styling.

### Heatmap (native MapLibre, tidak perlu library tambahan)

```typescript
map.addLayer({
  id: 'heatmap-kejadian',
  type: 'heatmap',
  source: 'kejadian-bencana',
  paint: {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'magnitude'], 0, 0, 8, 1],
    'heatmap-intensity': 1,
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 15, 12, 30],
  },
});
```

### Clustering (native, built-in di GeoJSON source)

```typescript
map.addSource('kejadian-cluster', {
  type: 'geojson',
  data: '/api/bencana/heatmap',
  cluster: true,
  clusterMaxZoom: 12,
  clusterRadius: 50,
});

map.addLayer({
  id: 'clusters',
  type: 'circle',
  source: 'kejadian-cluster',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#1E7A46', 10, '#D98E04', 30, '#C0392B'],
    'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 30, 25],
  },
});
```

## 3D Terrain (untuk simulasi longsor/genangan)

```typescript
map.addSource('terrain-dem', {
  type: 'raster-dem',
  url: 'pmtiles://https://storage.contoh.go.id/sumbar-terrain.pmtiles',
  tileSize: 256,
});
map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
```

Data elevasi (DEM) untuk Sumbar dapat diambil dari sumber terbuka seperti **SRTM** (30m resolution, NASA, domain publik) dan diproses menjadi format raster-dem menggunakan `rio-rgbify` atau tool Planetiler yang sudah mendukung terrain.

## Performa — checklist wajib (ringkas — detail penuh & rasionalnya di `11-optimasi-performa.md`)

- Gunakan **vector tile**, bukan raster, untuk basemap — ukuran transfer jauh lebih kecil dan bisa di-style ulang tanpa build ulang gambar.
- Aktifkan clustering untuk titik data > 500 buah dalam satu view — jangan render ribuan marker individual.
- Simplify geometri poligon wilayah administratif untuk zoom level rendah (`ST_SimplifyPreserveTopology` di PostGIS) — poligon kecamatan detail penuh tidak perlu saat user zoom out ke level provinsi.
- Untuk data yang jarang berubah (choropleth, batas wilayah), sajikan sebagai vector tile pre-build (`ST_AsMVT`), bukan GeoJSON yang di-query ulang tiap request — lihat perbandingan dua versi kode choropleth di atas.
- Batasi ukuran basemap sejak proses build (`--exclude-layers`, `--maxzoom`, `--languages=id`) — jangan pakai konfigurasi default yang menyertakan seluruh bangunan/POI/multi-bahasa.
- Uji dengan **Chrome DevTools Performance tab + Network throttling "Slow 4G"** — target frame time < 16ms (60fps) saat pan/zoom, diuji pada kondisi jaringan lambat yang realistis, bukan hanya WiFi kantor developer.
