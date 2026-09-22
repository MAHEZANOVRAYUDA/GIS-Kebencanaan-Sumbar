import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { LayerVisibilityState } from './LayerControlPanel';
import { 
  sesarSemangkoGeoJSON, 
  megathrustMentawaiGeoJSON, 
  zonaTsunamiPadangGeoJSON,
  cuacaAlertZonesGeoJSON,
  tsunamiRunUpGeoJSON,
  sesarBufferGeoJSON
} from './data/geologiData';
import { registerCartoIcons } from './cartoIcons';

// Registrasi Protokol PMTiles untuk MapLibre GL JS (05-peta-gis.md)
try {
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
} catch {
  // Protokol mungkin sudah terdaftar pada siklus HMR
}

export interface GempaInfo {
  id: number;
  magnitude: number;
  kedalaman_km: number;
  lon: number;
  lat: number;
  wilayah_teks: string;
  waktu_kejadian: string;
  potensi_tsunami: boolean;
  dirasakan: boolean;
  shakemap_url?: string;
  atribusi?: string;
}

export type BasemapStyle = 'satelit' | 'terang' | 'gelap';

interface MapCanvasProps {
  selectedWilayahId?: number | null;
  selectedBoundariesGeoJSON?: any | null;
  selectedKecamatanHighlightId?: number | string | null;
  choroplethUrl?: string;
  flyToCoords?: { lat: number; lng: number; zoom?: number } | null;
  routeGeometry?: any | null;
  userCoords?: { lat: number; lng: number } | null;
  poskoCoords?: { lat: number; lng: number; nama?: string } | null;
  jalanVersion?: number;
  poskoVersion?: number;
  gempaData?: GempaInfo | null;
  styleVariant?: BasemapStyle;
  is3DTerrain?: boolean;
  modeHematDaya?: boolean;
  layerVisibility?: LayerVisibilityState;
  isPickingLocation?: boolean;
  onPickLocation?: (coords: { lat: number; lng: number }) => void;
  onCoordinatesChange?: (coords: { lng: number; lat: number; zoom: number }) => void;
  onSelectWilayah?: (wilayahId: number, properties?: any) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  selectedWilayahId,
  selectedBoundariesGeoJSON,
  selectedKecamatanHighlightId,
  flyToCoords,
  routeGeometry,
  userCoords,
  poskoCoords,
  jalanVersion = 0,
  poskoVersion = 0,
  gempaData,
  styleVariant = 'satelit',
  is3DTerrain = false,
  modeHematDaya,
  layerVisibility,
  isPickingLocation = false,
  onPickLocation,
  onCoordinatesChange,
  onSelectWilayah,
}) => {
  // 3D Terrain mati secara default untuk performa ringan & dingin
  const active3D = is3DTerrain ?? (modeHematDaya !== undefined ? !modeHematDaya : false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Sync ref untuk interaksi klik peta dinamis & isolasi siklus render reaktif
  const isPickingLocationRef = useRef(isPickingLocation);
  isPickingLocationRef.current = isPickingLocation;
  const onPickLocationRef = useRef(onPickLocation);
  onPickLocationRef.current = onPickLocation;
  const onSelectWilayahRef = useRef(onSelectWilayah);
  onSelectWilayahRef.current = onSelectWilayah;
  const selectedWilayahIdRef = useRef(selectedWilayahId);
  selectedWilayahIdRef.current = selectedWilayahId;
  const styleVariantRef = useRef(styleVariant);
  styleVariantRef.current = styleVariant;
  const currentStyleVariantRef = useRef<BasemapStyle>(styleVariant);
  const layerVisibilityRef = useRef(layerVisibility);
  layerVisibilityRef.current = layerVisibility;
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);

  // Markers
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const poskoMarkerRef = useRef<maplibregl.Marker | null>(null);
  const gempaMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Helper fungsi terisolasi untuk sinkronisasi visibilitas seluruh layer dari LayerControlPanel
  const applyLayerVisibility = useCallback((mapInstance: maplibregl.Map, v?: LayerVisibilityState) => {
    if (!mapInstance) return;
    const currentVis = v || {
      choropleth: true,
      poskoEvakuasi: true,
      shelterTes: true,
      sirineTsunami: true,
      jalanTerputus: true,
      gempa: true,
      cuaca: true,
      sesarSemangko: true,
      sesarBuffer: false,
      megathrust: true,
      zonaTsunami: true,
      tsunamiRunup: false,
    };

    const setLayerVis = (id: string, isVisible: boolean) => {
      try {
        if (mapInstance.getLayer(id)) {
          mapInstance.setLayoutProperty(id, 'visibility', isVisible ? 'visible' : 'none');
        }
      } catch (err) {
        console.debug(`Error setting visibility on ${id}:`, err);
      }
    };

    // 1. Wilayah Choropleth & Highlight Seleksi
    setLayerVis('choropleth-kecamatan-fill', currentVis.choropleth);
    setLayerVis('choropleth-kecamatan-line', currentVis.choropleth);
    setLayerVis('choropleth-kecamatan-highlight', currentVis.choropleth && !!selectedWilayahIdRef.current);

    // 2. Fasilitas & Mitigasi (Posko Pengungsi, Faskes, Shelter TES, Sirine EWS)
    setLayerVis('posko-evakuasi-symbol', currentVis.poskoEvakuasi ?? true);
    setLayerVis('posko-evakuasi-circle', currentVis.poskoEvakuasi ?? true);
    setLayerVis('posko-evakuasi-label', currentVis.poskoEvakuasi ?? true);
    setLayerVis('shelter-tes-symbol', currentVis.shelterTes);
    setLayerVis('shelter-tes-circle', currentVis.shelterTes);
    setLayerVis('shelter-tes-halo', currentVis.shelterTes);
    setLayerVis('sirine-tsunami-symbol', currentVis.sirineTsunami);
    setLayerVis('sirine-tsunami-circle', currentVis.sirineTsunami);
    setLayerVis('sirine-tsunami-halo', currentVis.sirineTsunami);
    setLayerVis('jalan-terputus-line', currentVis.jalanTerputus);
    setLayerVis('jalan-terputus-line-casing', currentVis.jalanTerputus);

    // 3. Cuaca & Galodo
    setLayerVis('cuaca-zone-fill', currentVis.cuaca);
    setLayerVis('cuaca-zone-line', currentVis.cuaca);
    setLayerVis('cuaca-point-halo', currentVis.cuaca);
    setLayerVis('cuaca-point-circle', currentVis.cuaca);

    // 4. Struktur Geologi & Tsunami
    setLayerVis('sesar-semangko-casing', currentVis.sesarSemangko ?? true);
    setLayerVis('sesar-semangko-core', currentVis.sesarSemangko ?? true);
    setLayerVis('sesar-buffer-fill', currentVis.sesarBuffer ?? false);
    setLayerVis('sesar-buffer-line', currentVis.sesarBuffer ?? false);
    setLayerVis('megathrust-zone-fill', currentVis.megathrust ?? true);
    setLayerVis('megathrust-trench-line', currentVis.megathrust ?? true);
    setLayerVis('tsunami-zona-merah-fill', currentVis.zonaTsunami ?? true);
    setLayerVis('tsunami-zona-merah-line', currentVis.zonaTsunami ?? true);
    setLayerVis('tsunami-bypass-casing', currentVis.zonaTsunami ?? true);
    setLayerVis('tsunami-bypass-line', currentVis.zonaTsunami ?? true);
    setLayerVis('tsunami-runup-fill', currentVis.tsunamiRunup ?? false);
    setLayerVis('tsunami-runup-line', currentVis.tsunamiRunup ?? false);

    // 5. Episentrum Gempa BMKG
    if (gempaMarkerRef.current) {
      gempaMarkerRef.current.getElement().style.display = currentVis.gempa ? 'flex' : 'none';
    }

    // Tutup popup tooltip jika layer terkait dinonaktifkan
    if (hoverPopupRef.current && !currentVis.choropleth) {
      hoverPopupRef.current.remove();
    }
  }, []);

  // Helper untuk menambahkan seluruh layer spasial kustom kebencanaan
  const setupCustomLayers = useCallback((mapInstance: maplibregl.Map, variant?: BasemapStyle) => {
    const currentVariant = variant || styleVariantRef.current;

    // 1. Source & Layer Vector Tile Choropleth (Fase 4 - ST_AsMVT Native Makro Kabupaten)
    if (!mapInstance.getSource('choropleth-kecamatan')) {
      mapInstance.addSource('choropleth-kecamatan', {
        type: 'vector',
        tiles: ['/api/tiles/choropleth/{z}/{x}/{y}.mvt?level=kabupaten&v=3'],
        minzoom: 5,
        maxzoom: 14,
      });
    }

    if (!mapInstance.getLayer('choropleth-kecamatan-fill')) {
      mapInstance.addLayer({
        id: 'choropleth-kecamatan-fill',
        type: 'fill',
        source: 'choropleth-kecamatan',
        'source-layer': 'choropleth_kecamatan',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'total_kerugian'],
            0,
            '#10B981', // Aman: Hijau
            400000000,
            '#F59E0B', // Waspada: Kuning Oranye
            1500000000,
            '#EF4444', // Bahaya: Merah Semantik
          ],
          'fill-opacity': currentVariant === 'satelit' ? 0.45 : 0.65,
        },
      });
    }

    if (!mapInstance.getLayer('choropleth-kecamatan-line')) {
      mapInstance.addLayer({
        id: 'choropleth-kecamatan-line',
        type: 'line',
        source: 'choropleth-kecamatan',
        'source-layer': 'choropleth_kecamatan',
        paint: {
          'line-color': currentVariant === 'satelit' ? '#FFFFFF' : currentVariant === 'terang' ? '#1E3A5F' : '#38BDF8',
          'line-width': currentVariant === 'satelit' ? 1.8 : 1.5,
          'line-opacity': currentVariant === 'satelit' ? 0.95 : 0.85,
        },
      });
    }

    if (!mapInstance.getLayer('choropleth-kecamatan-highlight')) {
      mapInstance.addLayer({
        id: 'choropleth-kecamatan-highlight',
        type: 'line',
        source: 'choropleth-kecamatan',
        'source-layer': 'choropleth_kecamatan',
        paint: {
          'line-color': '#F4B400',
          'line-width': 3.5,
          'line-opacity': 1,
        },
        filter: ['==', ['get', 'id'], selectedWilayahIdRef.current || -1],
      });
    }

    // 1b. Source & Layers Garis Batas Wilayah Kabupaten/Kota & Seluruh Kecamatan (Pewarnaan Tematik per Risiko)
    if (!mapInstance.getSource('selected-boundaries-src')) {
      mapInstance.addSource('selected-boundaries-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!mapInstance.getLayer('selected-boundaries-fill')) {
      mapInstance.addLayer({
        id: 'selected-boundaries-fill',
        type: 'fill',
        source: 'selected-boundaries-src',
        paint: {
          'fill-color': [
            'case',
            ['>=', ['coalesce', ['get', 'total_kerugian'], 0], 1500000000],
            '#EF4444', // Risiko Tinggi: Merah
            ['>=', ['coalesce', ['get', 'total_kerugian'], 0], 400000000],
            '#F59E0B', // Risiko Sedang: Kuning Oranye
            '#10B981'  // Risiko Rendah: Hijau
          ],
          'fill-opacity': currentVariant === 'satelit' ? 0.48 : 0.60,
        },
      });
    }

    if (!mapInstance.getLayer('selected-boundaries-line')) {
      mapInstance.addLayer({
        id: 'selected-boundaries-line',
        type: 'line',
        source: 'selected-boundaries-src',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': currentVariant === 'satelit' ? 2.5 : 2.0,
          'line-opacity': 0.95,
        },
      });
    }

    if (!mapInstance.getLayer('selected-boundaries-subdistrict-highlight')) {
      mapInstance.addLayer({
        id: 'selected-boundaries-subdistrict-highlight',
        type: 'line',
        source: 'selected-boundaries-src',
        paint: {
          'line-color': '#F59E0B',
          'line-width': 4.5,
          'line-opacity': 1,
        },
        filter: ['==', ['get', 'id'], -1],
      });
    }

    if (!mapInstance.getLayer('selected-boundaries-labels')) {
      mapInstance.addLayer({
        id: 'selected-boundaries-labels',
        type: 'symbol',
        source: 'selected-boundaries-src',
        layout: {
          'text-field': ['get', 'nama'],
          'text-size': 11,
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#0B131D',
          'text-halo-width': 2,
        },
      });
    }

    // 2. Source & Layer Jalan Terputus (Peringatan Garis Merah Putus-putus)
    if (!mapInstance.getSource('jalan-terputus-src')) {
      mapInstance.addSource('jalan-terputus-src', {
        type: 'geojson',
        data: '/api/jalan-terputus',
      });
    }

    if (!mapInstance.getLayer('jalan-terputus-line-casing')) {
      mapInstance.addLayer({
        id: 'jalan-terputus-line-casing',
        type: 'line',
        source: 'jalan-terputus-src',
        paint: {
          'line-color': '#7F1D1D',
          'line-width': 6.0,
          'line-opacity': 0.8,
        },
      });
    }

    if (!mapInstance.getLayer('jalan-terputus-line')) {
      mapInstance.addLayer({
        id: 'jalan-terputus-line',
        type: 'line',
        source: 'jalan-terputus-src',
        paint: {
          'line-color': '#EF4444',
          'line-width': 3.5,
          'line-dasharray': [2, 2],
        },
      });
    }

    // 3. Source & Layer Posko Pengungsi Resmi (Kantor Camat & Faskes - UN OCHA / BNPB Standar)
    if (!mapInstance.getSource('posko-evakuasi-src')) {
      mapInstance.addSource('posko-evakuasi-src', {
        type: 'geojson',
        data: '/api/posko',
      });
    }

    if (!mapInstance.getLayer('posko-evakuasi-symbol')) {
      mapInstance.addLayer({
        id: 'posko-evakuasi-symbol',
        type: 'symbol',
        source: 'posko-evakuasi-src',
        filter: ['all', ['!=', ['get', 'jenis'], 'sirine_tsunami'], ['!=', ['get', 'jenis'], 'shelter_tes_tea']],
        layout: {
          'icon-image': [
            'match',
            ['get', 'jenis'],
            'fasilitas_kesehatan',
            'carto-faskes-pengungsi',
            'carto-posko-pengungsi'
          ],
          'icon-size': 0.72,
          'icon-allow-overlap': true,
          'text-field': ['get', 'nama'],
          'text-size': 11,
          'text-offset': [0, 1.45],
          'text-anchor': 'top',
          'text-max-width': 12,
        },
        minzoom: 10,
        paint: {
          'text-color': '#F8FAFC',
          'text-halo-color': '#0B131D',
          'text-halo-width': 2.2,
        },
      });
    }

    if (!mapInstance.getLayer('posko-evakuasi-circle')) {
      mapInstance.addLayer({
        id: 'posko-evakuasi-circle',
        type: 'circle',
        source: 'posko-evakuasi-src',
        filter: ['all', ['!=', ['get', 'jenis'], 'sirine_tsunami'], ['!=', ['get', 'jenis'], 'shelter_tes_tea']],
        maxzoom: 10,
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'jenis'],
            'fasilitas_kesehatan', '#059669',
            '#EA580C'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }

    // 4. Source & Layer Shelter TES/TEA Tsunami (UNESCO-IOC & ISO 20712-1)
    if (!mapInstance.getSource('shelter-tes-src')) {
      mapInstance.addSource('shelter-tes-src', {
        type: 'geojson',
        data: '/api/posko?jenis=shelter_tes_tea',
      });
    }

    if (!mapInstance.getLayer('shelter-tes-symbol')) {
      mapInstance.addLayer({
        id: 'shelter-tes-symbol',
        type: 'symbol',
        source: 'shelter-tes-src',
        layout: {
          'icon-image': 'carto-shelter-tes',
          'icon-size': 0.8,
          'icon-allow-overlap': true,
          'text-field': ['get', 'nama'],
          'text-size': 11,
          'text-offset': [0, 1.45],
          'text-anchor': 'top',
          'text-max-width': 12,
        },
        minzoom: 10,
        paint: {
          'text-color': '#BAE6FD',
          'text-halo-color': '#0B131D',
          'text-halo-width': 2.2,
        },
      });
    }

    if (!mapInstance.getLayer('shelter-tes-circle')) {
      mapInstance.addLayer({
        id: 'shelter-tes-circle',
        type: 'circle',
        source: 'shelter-tes-src',
        maxzoom: 10,
        paint: {
          'circle-radius': 7,
          'circle-color': '#0284C7',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }

    // 5. Source & Layer Sirine EWS Tsunami BPBD (ISO 22324 / BMKG)
    if (!mapInstance.getSource('sirine-tsunami-src')) {
      mapInstance.addSource('sirine-tsunami-src', {
        type: 'geojson',
        data: '/api/posko?jenis=sirine_tsunami&include_nonaktif=true',
      });
    }

    if (!mapInstance.getLayer('sirine-tsunami-symbol')) {
      mapInstance.addLayer({
        id: 'sirine-tsunami-symbol',
        type: 'symbol',
        source: 'sirine-tsunami-src',
        layout: {
          'icon-image': [
            'match',
            ['get', 'status'],
            'aktif',
            'carto-sirine-aktif',
            'carto-sirine-maint'
          ],
          'icon-size': 0.7,
          'icon-allow-overlap': true,
          'text-field': ['get', 'nama'],
          'text-size': 10,
          'text-offset': [0, 1.45],
          'text-anchor': 'top',
          'text-max-width': 12,
        },
        minzoom: 11,
        paint: {
          'text-color': '#FEF08A',
          'text-halo-color': '#0B131D',
          'text-halo-width': 2.0,
        },
      });
    }

    if (!mapInstance.getLayer('sirine-tsunami-circle')) {
      mapInstance.addLayer({
        id: 'sirine-tsunami-circle',
        type: 'circle',
        source: 'sirine-tsunami-src',
        maxzoom: 11,
        paint: {
          'circle-radius': 5.5,
          'circle-color': [
            'match',
            ['get', 'status'],
            'aktif',
            '#D97706',
            '#64748B'
          ],
          'circle-stroke-width': 1.8,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }

    // 4. Source & Layer Rute Evakuasi
    if (!mapInstance.getSource('route-evakuasi-src')) {
      mapInstance.addSource('route-evakuasi-src', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });
    }

    if (!mapInstance.getLayer('route-evakuasi-casing')) {
      mapInstance.addLayer({
        id: 'route-evakuasi-casing',
        type: 'line',
        source: 'route-evakuasi-src',
        paint: {
          'line-color': '#0F1720',
          'line-width': 8.0,
          'line-opacity': 0.9,
        },
      });
    }

    if (!mapInstance.getLayer('route-evakuasi-core')) {
      mapInstance.addLayer({
        id: 'route-evakuasi-core',
        type: 'line',
        source: 'route-evakuasi-src',
        paint: {
          'line-color': '#00F0FF', // Cyan Neon Kontras Tinggi
          'line-width': 4.5,
          'line-opacity': 1.0,
        },
      });
    }

    // 5. Patahan Aktif Sesar Semangko (The Great Sumatran Fault)
    if (!mapInstance.getSource('sesar-semangko-src')) {
      mapInstance.addSource('sesar-semangko-src', {
        type: 'geojson',
        data: sesarSemangkoGeoJSON,
      });
    }

    if (!mapInstance.getLayer('sesar-semangko-casing')) {
      mapInstance.addLayer({
        id: 'sesar-semangko-casing',
        type: 'line',
        source: 'sesar-semangko-src',
        paint: {
          'line-color': '#78350F',
          'line-width': 5.5,
          'line-opacity': 0.85,
        },
      });
    }

    if (!mapInstance.getLayer('sesar-semangko-core')) {
      mapInstance.addLayer({
        id: 'sesar-semangko-core',
        type: 'line',
        source: 'sesar-semangko-src',
        paint: {
          'line-color': '#F59E0B',
          'line-width': 2.8,
          'line-dasharray': [4, 2],
        },
      });
    }

    // 6. Zona Subduksi Megathrust Mentawai (Palung & Kuncian Seismik)
    if (!mapInstance.getSource('megathrust-src')) {
      mapInstance.addSource('megathrust-src', {
        type: 'geojson',
        data: megathrustMentawaiGeoJSON,
      });
    }

    if (!mapInstance.getLayer('megathrust-zone-fill')) {
      mapInstance.addLayer({
        id: 'megathrust-zone-fill',
        type: 'fill',
        source: 'megathrust-src',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': '#E11D48',
          'fill-opacity': 0.15,
        },
      });
    }

    if (!mapInstance.getLayer('megathrust-trench-line')) {
      mapInstance.addLayer({
        id: 'megathrust-trench-line',
        type: 'line',
        source: 'megathrust-src',
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#E11D48',
          'line-width': 4.0,
          'line-dasharray': [5, 2.5],
        },
      });
    }

    // 7. Zonasi Bahaya Rendaman & Garis Evakuasi Aman Bypass Tsunami
    if (!mapInstance.getSource('tsunami-zona-src')) {
      mapInstance.addSource('tsunami-zona-src', {
        type: 'geojson',
        data: zonaTsunamiPadangGeoJSON,
      });
    }

    if (!mapInstance.getLayer('tsunami-zona-merah-fill')) {
      mapInstance.addLayer({
        id: 'tsunami-zona-merah-fill',
        type: 'fill',
        source: 'tsunami-zona-src',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': '#EF4444',
          'fill-opacity': 0.14,
        },
      });
    }

    if (!mapInstance.getLayer('tsunami-zona-merah-line')) {
      mapInstance.addLayer({
        id: 'tsunami-zona-merah-line',
        type: 'line',
        source: 'tsunami-zona-src',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': '#EF4444',
          'line-width': 1.8,
          'line-dasharray': [4, 2],
        },
      });
    }

    if (!mapInstance.getLayer('tsunami-bypass-casing')) {
      mapInstance.addLayer({
        id: 'tsunami-bypass-casing',
        type: 'line',
        source: 'tsunami-zona-src',
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#064E3B',
          'line-width': 6.0,
          'line-opacity': 0.75,
        },
      });
    }

    if (!mapInstance.getLayer('tsunami-bypass-line')) {
      mapInstance.addLayer({
        id: 'tsunami-bypass-line',
        type: 'line',
        source: 'tsunami-zona-src',
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#10B981',
          'line-width': 3.5,
        },
      });
    }

    // 8. Peringatan Dini Cuaca & Banjir Lahar Hujan (Galodo Marapi-Singgalang)
    if (!mapInstance.getSource('cuaca-zone-src')) {
      mapInstance.addSource('cuaca-zone-src', {
        type: 'geojson',
        data: cuacaAlertZonesGeoJSON,
      });
    }

    if (!mapInstance.getLayer('cuaca-zone-fill')) {
      mapInstance.addLayer({
        id: 'cuaca-zone-fill',
        type: 'fill',
        source: 'cuaca-zone-src',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': ['get', 'warna'],
          'fill-opacity': 0.22,
        },
      });
    }

    if (!mapInstance.getLayer('cuaca-zone-line')) {
      mapInstance.addLayer({
        id: 'cuaca-zone-line',
        type: 'line',
        source: 'cuaca-zone-src',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': ['get', 'warna'],
          'line-width': 2.2,
          'line-dasharray': [3, 2],
        },
      });
    }

    if (!mapInstance.getLayer('cuaca-point-halo')) {
      mapInstance.addLayer({
        id: 'cuaca-point-halo',
        type: 'circle',
        source: 'cuaca-zone-src',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 14,
          'circle-color': '#DC2626',
          'circle-opacity': 0.35,
        },
      });
    }

    if (!mapInstance.getLayer('cuaca-point-circle')) {
      mapInstance.addLayer({
        id: 'cuaca-point-circle',
        type: 'circle',
        source: 'cuaca-zone-src',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 7.5,
          'circle-color': '#DC2626',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }

    // 9. Skenario Run-Up Tsunami (Inundasi Bertingkat 6m, 8m, 12m)
    if (!mapInstance.getSource('tsunami-runup-src')) {
      mapInstance.addSource('tsunami-runup-src', {
        type: 'geojson',
        data: tsunamiRunUpGeoJSON,
      });
    }

    if (!mapInstance.getLayer('tsunami-runup-fill')) {
      mapInstance.addLayer({
        id: 'tsunami-runup-fill',
        type: 'fill',
        source: 'tsunami-runup-src',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': ['get', 'warna'],
          'fill-opacity': ['get', 'opacity'],
        },
      });
    }

    if (!mapInstance.getLayer('tsunami-runup-line')) {
      mapInstance.addLayer({
        id: 'tsunami-runup-line',
        type: 'line',
        source: 'tsunami-runup-src',
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': ['get', 'warna_stroke'],
          'line-width': 2.0,
          'line-opacity': 0.85,
        },
      });
    }

    // 10. Buffer Sempadan Aktif Sesar Semangko 100m (Setback Patahan)
    if (!mapInstance.getSource('sesar-buffer-src')) {
      mapInstance.addSource('sesar-buffer-src', {
        type: 'geojson',
        data: sesarBufferGeoJSON,
      });
    }

    if (!mapInstance.getLayer('sesar-buffer-fill')) {
      mapInstance.addLayer({
        id: 'sesar-buffer-fill',
        type: 'fill',
        source: 'sesar-buffer-src',
        paint: {
          'fill-color': '#B45309',
          'fill-opacity': 0.18,
        },
      });
    }

    if (!mapInstance.getLayer('sesar-buffer-line')) {
      mapInstance.addLayer({
        id: 'sesar-buffer-line',
        type: 'line',
        source: 'sesar-buffer-src',
        paint: {
          'line-color': '#F59E0B',
          'line-width': 1.2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.65,
        },
      });
    }

    // 8. 3D Terrain (Topografi Elevasi Sumbar) jika mode 3D diaktifkan pengguna
    try {
      if (mapInstance.getSource('terrain-dem')) {
        mapInstance.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
      }
    } catch (e) {
      console.debug('Terrain status:', e);
    }
  }, []);

  // Inisialisasi Peta MapLibre GL JS
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const sumbarMaxBounds: [number, number, number, number] = [96.5, -4.2, 103.0, 2.0];

    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: `/styles/${styleVariant}.json`,
      center: [100.38, -0.92],
      zoom: 8.8,
      minZoom: 6.0,
      maxZoom: 19,
      maxBounds: sumbarMaxBounds,
      pitch: active3D ? 35 : 0,
      fadeDuration: 0,
      maxTileCacheSize: 80,
    });

    mapInstance.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
      }),
      'top-right'
    );

    mapInstance.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    mapInstance.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 120,
        unit: 'metric',
      }),
      'bottom-left'
    );

    const hoverPopup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      maxWidth: 'none',
      className: 'gis-hover-popup',
    });
    hoverPopupRef.current = hoverPopup;

    mapInstance.on('load', async () => {
      setMapLoaded(true);
      await registerCartoIcons(mapInstance);
      setupCustomLayers(mapInstance, styleVariantRef.current);
      applyLayerVisibility(mapInstance, layerVisibilityRef.current);

      // Helper Tooltip Posko Pengungsi & Faskes (Standar UN OCHA & BNPB)
      const handlePoskoHover = (e: any) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          const isFaskes = p.jenis === 'fasilitas_kesehatan';
          const headerBadge = isFaskes
            ? '<span style="font-weight: 800; color: #10B981; font-size: 10.5px; letter-spacing: 0.02em;">🏥 POSKO MEDIS &amp; FASKES PENGUNGSI</span>'
            : '<span style="font-weight: 800; color: #FB923C; font-size: 10.5px; letter-spacing: 0.02em;">⛺ POSKO PENGUNGSI RESMI (UN OCHA/BNPB)</span>';
          const subBadge = isFaskes
            ? '<span style="font-size: 9px; font-weight: 700; background: rgba(16,185,129,0.2); color: #6EE7B7; padding: 1.5px 6px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.4);">ISO 7001 MEDIS</span>'
            : '<span style="font-size: 9px; font-weight: 700; background: rgba(234,88,12,0.2); color: #FDBA74; padding: 1.5px 6px; border-radius: 4px; border: 1px solid rgba(234,88,12,0.4);">SHELTER EVAKUASI</span>';

          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 250px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 5px; margin-bottom: 6px;">
                  ${headerBadge}
                  ${subBadge}
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 13px; margin-bottom: 5px; line-height: 1.3;">${p.nama}</div>
                <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 4px;">
                  <span style="color: #94A3B8;">Daya Tampung:</span>
                  <strong style="color: ${isFaskes ? '#34D399' : '#FB923C'}; font-weight: 800;">${p.kapasitas || '500'} Jiwa</strong>
                </div>
                <div style="color: #94A3B8; font-size: 10px; line-height: 1.35; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 4px;">
                  Logistik: Tenda Pengungsi, Dapur Umum, Air Bersih, MCK, Genset BPBD
                </div>
              </div>
            `)
            .addTo(mapInstance);
        }
      };

      const handlePoskoLeave = () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      };

      mapInstance.on('mousemove', 'posko-evakuasi-symbol', handlePoskoHover);
      mapInstance.on('mouseleave', 'posko-evakuasi-symbol', handlePoskoLeave);
      mapInstance.on('mousemove', 'posko-evakuasi-circle', handlePoskoHover);
      mapInstance.on('mouseleave', 'posko-evakuasi-circle', handlePoskoLeave);

      // Helper Tooltip & Popup Shelter TES/TEA Tsunami (UNESCO-IOC)
      const handleShelterHover = (e: any) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 260px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(56,189,248,0.3); padding-bottom: 5px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: #38BDF8; font-size: 10px; letter-spacing: 0.02em;">🏢 SHELTER VERTIKAL TES TSUNAMI</span>
                  <span style="font-size: 9px; font-weight: 700; background: rgba(56,189,248,0.2); color: #BAE6FD; padding: 1.5px 6px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.4);">UNESCO-IOC</span>
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 13px; margin-bottom: 5px; line-height: 1.3;">${p.nama}</div>
                <div style="color: #E2E8F0; font-size: 11px; margin-bottom: 4px;">
                  Daya Tampung Vertikal: <strong style="color:#38BDF8; font-weight: 800;">${p.kapasitas || '-'}</strong> Jiwa
                </div>
                <div style="color: #94A3B8; font-size: 10px; line-height: 1.35; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 4px;">
                  Gedung Evakuasi Vertikal Bebas Rendaman KRB III-I Tsunami Padang
                </div>
              </div>
            `)
            .addTo(mapInstance);
        }
      };

      const handleShelterLeave = () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      };

      mapInstance.on('mousemove', 'shelter-tes-symbol', handleShelterHover);
      mapInstance.on('mouseleave', 'shelter-tes-symbol', handleShelterLeave);
      mapInstance.on('mousemove', 'shelter-tes-circle', handleShelterHover);
      mapInstance.on('mouseleave', 'shelter-tes-circle', handleShelterLeave);

      // Helper Tooltip & Popup Sirine EWS Tsunami BPBD (ISO 22324 / BMKG)
      const handleSirineHover = (e: any) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          const isAktif = p.status === 'aktif';
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 250px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(245,158,11,0.3); padding-bottom: 5px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: ${isAktif ? '#F59E0B' : '#94A3B8'}; font-size: 10px; letter-spacing: 0.02em;">
                    🚨 SIRINE EWS TSUNAMI BPBD
                  </span>
                  <span style="font-size: 9px; font-weight: 700; padding: 1.5px 6px; border-radius: 4px; ${isAktif ? 'background: rgba(245,158,11,0.2); color: #FCD34D; border: 1px solid rgba(245,158,11,0.4);' : 'background: rgba(148,163,184,0.2); color: #94A3B8; border: 1px solid rgba(148,163,184,0.3);'}">
                    ${isAktif ? 'SIAGA AKTIF' : 'PEMELIHARAAN'}
                  </span>
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 13px; margin-bottom: 4px;">${p.nama}</div>
                <div style="color: #94A3B8; font-size: 10px;">Standar ISO 22324 &bull; Radius Akustik Efektif: 2.0 km</div>
              </div>
            `)
            .addTo(mapInstance);
        }
      };

      const handleSirineLeave = () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      };

      mapInstance.on('mousemove', 'sirine-tsunami-symbol', handleSirineHover);
      mapInstance.on('mouseleave', 'sirine-tsunami-symbol', handleSirineLeave);
      mapInstance.on('mousemove', 'sirine-tsunami-circle', handleSirineHover);
      mapInstance.on('mouseleave', 'sirine-tsunami-circle', handleSirineLeave);

      // Tooltip Jalan Terputus
      mapInstance.on('mousemove', 'jalan-terputus-line', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 240px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(239,68,68,0.3); padding-bottom: 4px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: #EF4444; font-size: 10.5px; letter-spacing: 0.02em;">⚠️ RUAS JALAN TERPUTUS</span>
                </div>
                <div style="font-weight: 800; color: #F59E0B; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">${props.alasan}</div>
                <div style="color: #CBD5E1; font-size: 10px; line-height: 1.35;">${props.deskripsi || ''}</div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'jalan-terputus-line', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip Vector Tile Choropleth
      mapInstance.on('mousemove', 'choropleth-kecamatan-fill', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const nominal = Number(props.total_kerugian || 0);
          let rpText = 'Bebas Kerugian Tercatat';
          let color = '#2ECC71';
          if (nominal >= 1_500_000_000) {
            rpText = `Kerugian: Rp ${(nominal / 1_000_000_000).toFixed(2)} Miliar`;
            color = '#E74C3C';
          } else if (nominal >= 400_000_000) {
            rpText = `Kerugian: Rp ${(nominal / 1_000_000_000).toFixed(2)} Miliar`;
            color = '#F39C12';
          } else if (nominal > 0) {
            rpText = `Kerugian: Rp ${(nominal / 1_000_000).toFixed(0)} Juta`;
            color = '#F39C12';
          }

          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 230px; box-sizing: border-box; color: #F8FAFC;">
                <div style="font-weight: 800; color: #FFFFFF; font-size: 13px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
                  ${props.nama}
                </div>
                <div style="color: #94A3B8; font-size: 10px; margin-bottom: 4px;">
                  Tingkat Risiko: <strong style="text-transform: uppercase; color: ${color};">${props.tingkat_risiko || 'rendah'}</strong>
                </div>
                <div style="font-weight: 700; font-size: 11.5px; color: ${color}; font-family: monospace;">
                  ${rpText}
                </div>
                ${props.total_meninggal > 0 ? `<div style="color: #EF4444; font-size: 10px; font-weight: bold; margin-top: 4px;">&bull; Korban Jiwa: ${props.total_meninggal} Jiwa</div>` : ''}
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'choropleth-kecamatan-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip Patahan Sesar Semangko
      mapInstance.on('mousemove', 'sesar-semangko-core', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 290px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(245,158,11,0.3); padding-bottom: 4px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: #F59E0B; font-size: 10.5px; letter-spacing: 0.02em;">
                    ⚡ PATAHAN AKTIF SESAR SEMANGKO
                  </span>
                  <span style="font-size: 9px; font-weight: 700; background: rgba(245,158,11,0.2); color: #FCD34D; padding: 1.5px 6px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.4); white-space: nowrap;">
                    DARAT
                  </span>
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 13px; margin-bottom: 4px;">${p.nama}</div>
                <div style="display: flex; align-items: center; gap: 6px; font-size: 10px; margin-bottom: 4px;">
                  <span style="background: rgba(245,158,11,0.15); color: #FBBF24; padding: 1.5px 6px; border-radius: 4px; font-weight: 700;">
                    Potensi: ${p.potensi_mag}
                  </span>
                  <span style="color: #94A3B8;">${p.kedalaman}</span>
                </div>
                <div style="color: #94A3B8; font-size: 10px; margin-bottom: 4px;">
                  Slip Rate: <b style="color: #E2E8F0;">${p.slip_rate}</b> &bull; Lintasan: <span style="color: #E2E8F0;">${p.wilayah_lintasan}</span>
                </div>
                ${p.karakteristik ? `
                  <div style="color: #CBD5E1; font-size: 9.5px; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; line-height: 1.35;">
                    ${p.karakteristik}
                  </div>
                ` : ''}
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'sesar-semangko-core', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Helper Generator HTML Tooltip Megathrust Mentawai (Zero-Overflow & Calibrated Typography)
      const renderMegathrustTooltipHTML = (p: any, isTrench: boolean) => `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; width: 350px; max-width: 360px; box-sizing: border-box; color: #F8FAFC;">
          <!-- Header Badge -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid rgba(244,63,94,0.3); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: #FB7185; font-size: 11px; letter-spacing: 0.03em; text-transform: uppercase;">
              <span style="font-size: 13px;">🌊</span> MEGATHRUST MENTAWAI
            </div>
            <span style="font-size: 9.5px; font-weight: 800; background: rgba(225,29,72,0.25); color: #FDA4AF; padding: 2px 8px; border-radius: 6px; border: 1px solid rgba(225,29,72,0.5); white-space: nowrap; letter-spacing: 0.02em;">
              ${isTrench ? 'SUNDA TRENCH' : 'LOCKED PATCH'}
            </span>
          </div>

          <!-- Title & Magnitude -->
          <div style="font-weight: 800; color: #FFFFFF; font-size: 13px; line-height: 1.35; margin-bottom: 5px;">
            ${p.nama || (isTrench ? 'Garis Palung Megathrust Mentawai (Sunda Trench)' : 'Zona Kuncian Seismik Megathrust Mentawai')}
          </div>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 10px; margin-bottom: 6px;">
            <span style="background: rgba(244,63,94,0.2); color: #FDA4AF; border: 1px solid rgba(244,63,94,0.4); border-radius: 4px; padding: 1.5px 6px; font-weight: 700;">
              ⚡ Potensi M 8.8 – 8.9 SR
            </span>
            <span style="background: rgba(245,158,11,0.2); color: #FCD34D; border: 1px solid rgba(245,158,11,0.4); border-radius: 4px; padding: 1.5px 6px; font-weight: 700;">
              Seismic Gap Aktif
            </span>
          </div>
          <div style="font-size: 10.5px; color: #CBD5E1; margin-bottom: 8px;">
            Tinggi Gelombang: <strong style="color: #FBBF24; font-weight: 800;">6 – 12 Meter</strong> di Bibir Pantai
          </div>

          <!-- Golden Time Grid Terpilah -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(56,189,248,0.35); border-radius: 8px; padding: 6px 8px; box-sizing: border-box;">
              <div style="font-size: 9px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.02em;">🏝️ Kep. Mentawai</div>
              <div style="font-size: 12px; font-weight: 800; color: #FFFFFF; margin: 2px 0 1px;">5 – 10 Menit</div>
              <div style="font-size: 9px; color: #94A3B8; line-height: 1.25;">Tiba sangat cepat (near-field)</div>
            </div>
            <div style="background: rgba(15,23,42,0.85); border: 1px solid rgba(148,163,184,0.35); border-radius: 8px; padding: 6px 8px; box-sizing: border-box;">
              <div style="font-size: 9px; font-weight: 700; color: #CBD5E1; text-transform: uppercase; letter-spacing: 0.02em;">🏙️ Daratan Pesisir</div>
              <div style="font-size: 12px; font-weight: 800; color: #FFFFFF; margin: 2px 0 1px;">20 – 30 Menit</div>
              <div style="font-size: 9px; color: #94A3B8; line-height: 1.25;">Padang, Pariaman, Pessel</div>
            </div>
          </div>

          <!-- Panduan Evakuasi Terpadu Berdasarkan Lokasi Pengguna -->
          <div style="border-radius: 8px; background: rgba(225,29,72,0.14); border: 1px solid rgba(225,29,72,0.4); padding: 7px 9px; font-size: 10px; line-height: 1.4; box-sizing: border-box;">
            <div style="font-weight: 800; color: #FECDD3; margin-bottom: 5px; display: flex; align-items: center; gap: 5px;">
              <span>⚠️</span> <span>PANDUAN PENYELAMATAN (JIKA GEMPA &gt; 1 MENIT):</span>
            </div>
            <div style="color: #F1F5F9; margin-bottom: 5px;">
              <strong style="color: #38BDF8;">🏝️ Khusus Kepulauan Mentawai:</strong><br/>
              Segera lari ke <strong style="color: #FDE047;">perbukitan / dataran tinggi alami di pedalaman pulau (&gt; 15 mdpl)</strong>. JANGAN menunggu sirine &amp; jangan mencari Bypass.
            </div>
            <div style="color: #F1F5F9;">
              <strong style="color: #CBD5E1;">🏙️ Daratan Pesisir (Padang, Pariaman, Pessel):</strong><br/>
              Naik ke <strong style="color: #FDE047;">Lantai 3+ Gedung Shelter TES</strong> terdekat, atau evakuasi horizontal ke arah Timur melewati <strong style="color: #FDE047;">Jalur Bypass Padang</strong>.
            </div>
          </div>
        </div>
      `;

      // Tooltip Megathrust Mentawai (Garis Palung & Zona Kuncian Seismik)
      mapInstance.on('mousemove', 'megathrust-trench-line', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(renderMegathrustTooltipHTML(p, true))
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'megathrust-trench-line', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      mapInstance.on('mousemove', 'megathrust-zone-fill', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(renderMegathrustTooltipHTML(p, false))
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'megathrust-zone-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip Garis Bypass & Zona Tsunami Padang
      mapInstance.on('mousemove', 'tsunami-bypass-line', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 270px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; gap: 5px; border-bottom: 1px solid rgba(16,185,129,0.3); padding-bottom: 4px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: #10B981; font-size: 10.5px;">🛡️ BATAS EVAKUASI AMAN TSUNAMI</span>
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 12.5px; margin-bottom: 4px;">${p.nama}</div>
                <div style="color: #CBD5E1; font-size: 10px; line-height: 1.4;">
                  ${p.karakteristik || 'Wilayah di sebelah Timur garis Bypass Padang berada pada elevasi > 15m dpl dan aman dari tsunami.'}
                </div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'tsunami-bypass-line', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip Peringatan Cuaca Ekstrem & Banjir Lahar Hujan (Galodo)
      mapInstance.on('mousemove', 'cuaca-zone-fill', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 290px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; gap: 5px; border-bottom: 1px solid rgba(245,158,11,0.3); padding-bottom: 4px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: ${p.warna || '#F59E0B'}; font-size: 10.5px;">⛈️ PERINGATAN DINI CUACA BMKG</span>
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 12.5px; margin-bottom: 4px;">${p.nama}</div>
                <div style="color: #FEF08A; font-size: 10.5px; font-weight: 700; margin-bottom: 3px;">
                  Status: ${p.tingkat_bahaya} &bull; ${p.curah_hujan || ''}
                </div>
                <div style="color: #94A3B8; font-size: 10px; margin-bottom: 3px;">
                  Wilayah: ${p.wilayah_terdampak || ''}
                </div>
                <div style="color: #CBD5E1; font-size: 9.5px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px; line-height: 1.35;">
                  ⚠️ ${p.ancaman || ''}
                </div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'cuaca-zone-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip Titik Pos Pantau Lahar / Sensor Anai
      mapInstance.on('mousemove', 'cuaca-point-circle', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 240px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; gap: 5px; border-bottom: 1px solid rgba(239,68,68,0.3); padding-bottom: 4px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: #EF4444; font-size: 10.5px;">🚨 POS PANTAU LAHAR ANAI</span>
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 12.5px; margin-bottom: 3px;">${p.nama}</div>
                <div style="color: #F87171; font-size: 10.5px; font-weight: bold; margin-bottom: 2px;">
                  Curah Hujan: ${p.curah_hujan} (${p.tingkat_bahaya})
                </div>
                <div style="color: #CBD5E1; font-size: 9.5px;">${p.kondisi || ''}</div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'cuaca-point-circle', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip Skenario Run-Up Tsunami (Inundasi Bertingkat KRB Tsunami)
      mapInstance.on('mousemove', 'tsunami-runup-fill', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          const badgeBg = p.warna || '#EF4444';
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 310px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: #FFF; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px; background: ${badgeBg}; padding: 2px 7px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                    ${p.tingkat_bahaya || 'ZONASI TSUNAMI'}
                  </span>
                  <span style="font-size: 9.5px; color: #94A3B8; font-weight: 600;">${p.krb_label || 'KRB BPBD'}</span>
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 13px; line-height: 1.3;">${p.skenario}</div>
                <div style="color: #E2E8F0; font-size: 10.5px; margin-top: 6px; background: rgba(255,255,255,0.06); padding: 5px 8px; border-radius: 6px; border-left: 3px solid ${badgeBg};">
                  Kedalaman Rendaman: <strong style="color:${badgeBg}; font-size: 11.5px;">${p.kedalaman_rendaman}</strong>
                </div>
                <div style="color: #CBD5E1; font-size: 10px; margin-top: 5px; line-height: 1.35;">
                  📍 <strong>Kawasan:</strong> ${p.zona}
                </div>
                <div style="color: #94A3B8; font-size: 9.5px; margin-top: 4px; font-style: italic;">
                  ⚡ ${p.dampak_fisik}
                </div>
                <div style="color: #38BDF8; font-size: 9.5px; margin-top: 5px; font-weight: 600; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 4px;">
                  🛡️ ${p.protokol_evakuasi}
                </div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'tsunami-runup-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip Buffer Sempadan Aktif Sesar
      mapInstance.on('mousemove', 'sesar-buffer-fill', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 260px; box-sizing: border-box; color: #F8FAFC;">
                <div style="display: flex; align-items: center; gap: 5px; border-bottom: 1px solid rgba(245,158,11,0.3); padding-bottom: 4px; margin-bottom: 6px;">
                  <span style="font-weight: 800; color: #F59E0B; font-size: 10.5px;">📐 SEMPADAN AKTIF SESAR (100M)</span>
                </div>
                <div style="font-weight: 800; color: #FFF; font-size: 12px; margin-bottom: 3px;">${p.nama}</div>
                <div style="color: #CBD5E1; font-size: 9.5px; line-height: 1.35;">
                  ${p.ketetapan}
                </div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'sesar-buffer-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Klik Poligon Vector Tile Wilayah
      mapInstance.on('click', 'choropleth-kecamatan-fill', (e) => {
        // Jika mode penentuan titik awal evakuasi aktif, jangan drill-down wilayah
        if (isPickingLocationRef.current) {
          return;
        }
        // Jika layer choropleth sedang dimatikan (ikon mata tertutup), jangan aktifkan drill-down wilayah
        if (layerVisibilityRef.current && !layerVisibilityRef.current.choropleth) {
          return;
        }
        // FIX: Tutup tooltip & stop propagasi agar tidak memicu spatial lookup ganda
        hoverPopup.remove();
        e.originalEvent.stopPropagation();
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const wilayahId = feature.properties?.id;
          if (wilayahId && onSelectWilayahRef.current) {
            onSelectWilayahRef.current(wilayahId, feature.properties);
          }
        }
      });

      // Handler Klik pada Poligon Garis Batas Kecamatan yang sedang aktif
      mapInstance.on('click', 'selected-boundaries-fill', (e) => {
        if (isPickingLocationRef.current) return;
        // FIX: Tutup tooltip hover agar tidak menggantung setelah klik
        hoverPopup.remove();
        // FIX: Hentikan event bubbling ke global click handler agar tidak memicu spatial lookup ganda
        e.originalEvent.stopPropagation();
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const wid = feature.properties?.id;
          if (wid && onSelectWilayahRef.current) {
            const props = {
              ...feature.properties,
              lat: feature.properties?.lat || feature.properties?.center_lat || feature.properties?.y || e.lngLat.lat,
              lon: feature.properties?.lon || feature.properties?.center_lon || feature.properties?.x || e.lngLat.lng,
              parent_nama: feature.properties?.kabupaten || feature.properties?.parent_nama || 'Sumatera Barat'
            };
            onSelectWilayahRef.current(wid, props);
          }
        }
      });

      // Tooltip Hover pada Garis Batas Perkecamatan
      mapInstance.on('mousemove', 'selected-boundaries-fill', (e) => {
        if (isPickingLocationRef.current) return;
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const namaKecamatan = props.name || props.nama || 'Kecamatan';
          const namaKabupaten = props.kabupaten || props.parent_nama || 'Sumatera Barat';
          const nominal = Number(props.total_kerugian || 0);
          let rpText = 'Wilayah Pantauan Kebencanaan';
          let color = '#38BDF8';
          if (nominal >= 1_500_000_000 || props.total_meninggal > 0) {
            rpText = nominal > 0 ? `Estimasi Kerugian: Rp ${(nominal / 1_000_000_000).toFixed(2)} M` : 'Zona Rawan Bencana';
            color = '#EF4444';
          } else if (nominal >= 400_000_000) {
            rpText = `Estimasi Kerugian: Rp ${(nominal / 1_000_000_000).toFixed(2)} M`;
            color = '#F59E0B';
          }

          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', -apple-system, sans-serif; width: 220px; box-sizing: border-box; color: #F8FAFC; padding: 2px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(56,189,248,0.3); padding-bottom: 4px; margin-bottom: 5px;">
                  <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: #38BDF8; letter-spacing: 0.5px;">${namaKabupaten}</span>
                  <span style="font-size: 9px; font-family: monospace; background: rgba(56,189,248,0.2); color: #BAE6FD; padding: 1px 5px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.4);">Kecamatan</span>
                </div>
                <div style="font-weight: 800; color: #FFFFFF; font-size: 13.5px; margin-bottom: 4px; line-height: 1.25;">
                  Kecamatan ${namaKecamatan}
                </div>
                <div style="font-size: 10.5px; color: ${color}; font-weight: 700; margin-bottom: 4px;">
                  &bull; ${rpText}
                </div>
                <div style="font-size: 9.5px; color: #94A3B8; font-family: monospace; display: flex; align-items: center; gap: 4px;">
                  <span>🔍</span> Klik untuk detail & fasilitas evakuasi
                </div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseenter', 'selected-boundaries-fill', () => {
        if (!isPickingLocationRef.current) {
          mapInstance.getCanvas().style.cursor = 'pointer';
        }
      });

      mapInstance.on('mouseleave', 'selected-boundaries-fill', () => {
        if (!isPickingLocationRef.current) {
          mapInstance.getCanvas().style.cursor = '';
          hoverPopup.remove();
        }
      });

      // Global Map Click Handler
      mapInstance.on('click', (e) => {
        // 1. Prioritas Utama: Penentuan Titik Awal Evakuasi Pengguna di Peta
        if (isPickingLocationRef.current) {
          if (onPickLocationRef.current) {
            onPickLocationRef.current({
              lat: parseFloat(e.lngLat.lat.toFixed(5)),
              lng: parseFloat(e.lngLat.lng.toFixed(5)),
            });
          }
          return;
        }

        // Jika layer choropleth sedang dimatikan oleh pengguna, abaikan pencarian wilayah otomatis
        if (layerVisibilityRef.current && !layerVisibilityRef.current.choropleth) {
          return;
        }

        // 2. Spatial Lookup jika klik area peta di luar poligon
        // Amankan: Hanya query layer yang benar-benar ada di map untuk mencegah fatal error MapLibre:
        // "The layer '...' does not exist in the map's style and cannot be queried for features."
        const validCandidateLayers = [
          'choropleth-kecamatan-fill', 
          'selected-boundaries-fill',  // FIX: Sertakan layer kecamatan aktif agar klik tidak memicu lookup ganda
          'posko-evakuasi-symbol',
          'posko-evakuasi-circle', 
          'shelter-tes-symbol',
          'shelter-tes-circle', 
          'sirine-tsunami-symbol',
          'sirine-tsunami-circle', 
          'jalan-terputus-line',
          'sesar-semangko-core',
          'megathrust-trench-line',
          'tsunami-bypass-line',
          'cuaca-zone-fill',
          'cuaca-point-circle'
        ].filter((id) => {
          try {
            return !!mapInstance.getLayer(id);
          } catch {
            return false;
          }
        });

        let features: any[] = [];
        try {
          if (validCandidateLayers.length > 0) {
            features = mapInstance.queryRenderedFeatures(e.point, {
              layers: validCandidateLayers,
            });
          }
        } catch (err) {
          console.debug('Error in queryRenderedFeatures:', err);
        }

        if (features.length === 0 && onSelectWilayahRef.current) {
          fetch(`/api/wilayah/lookup?lat=${e.lngLat.lat}&lon=${e.lngLat.lng}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && data.id && onSelectWilayahRef.current) {
                // Pastikan choropleth masih aktif saat respons backend diterima
                if (layerVisibilityRef.current?.choropleth) {
                  onSelectWilayahRef.current(data.id, data);
                }
              }
            })
            .catch(() => {});
        }
      });
    });

    mapInstance.on('mousemove', (e: maplibregl.MapMouseEvent) => {
      if (isPickingLocationRef.current) {
        setMousePos({ x: e.point.x, y: e.point.y });
      }
      if (onCoordinatesChange) {
        onCoordinatesChange({
          lng: parseFloat(e.lngLat.lng.toFixed(5)),
          lat: parseFloat(e.lngLat.lat.toFixed(5)),
          zoom: parseFloat(mapInstance.getZoom().toFixed(2)),
        });
      }
    });

    mapInstance.on('mouseout', () => {
      setMousePos(null);
    });

    map.current = mapInstance;

    return () => {
      hoverPopup.remove();
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  // Handler Pergantian Style Terang / Gelap Kustom (05-peta-gis.md)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    // Mencegah reload style jika styleVariant tidak benar-benar berubah
    if (currentStyleVariantRef.current === styleVariant) return;
    currentStyleVariantRef.current = styleVariant;

    const targetStyle = `/styles/${styleVariant}.json`;
    map.current.setStyle(targetStyle);

    // Pasang kembali seluruh layer kustom begitu style baru selesai dimuat
    map.current.once('style.load', async () => {
      if (map.current) {
        await registerCartoIcons(map.current);
        setupCustomLayers(map.current, styleVariant);
        applyLayerVisibility(map.current, layerVisibilityRef.current);
        if (map.current.getLayer('choropleth-kecamatan-highlight')) {
          map.current.setFilter('choropleth-kecamatan-highlight', [
            '==',
            ['get', 'id'],
            selectedWilayahIdRef.current || -1,
          ]);
        }
      }
    });
  }, [styleVariant, mapLoaded, setupCustomLayers, applyLayerVisibility]);

  // Handler Mode 3D Terrain (Topografi 3D vs 2D Dingin & Ringan)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (active3D) {
      try {
        if (map.current.getSource('terrain-dem')) {
          map.current.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
          map.current.easeTo({ pitch: 38, duration: 600 });
        }
      } catch (e) {
        console.debug('Terrain activation error:', e);
      }
    } else {
      map.current.setTerrain(null);
      map.current.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  }, [active3D, mapLoaded]);

  // Update Highlight Wilayah Terpilih pada Vector Tile
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (map.current.getLayer('choropleth-kecamatan-highlight')) {
      map.current.setFilter('choropleth-kecamatan-highlight', [
        '==',
        ['get', 'id'],
        selectedWilayahId || -1,
      ]);
      const isChoroplethVisible = layerVisibility?.choropleth ?? true;
      map.current.setLayoutProperty(
        'choropleth-kecamatan-highlight',
        'visibility',
        isChoroplethVisible && selectedWilayahId ? 'visible' : 'none'
      );
    }
  }, [selectedWilayahId, mapLoaded, layerVisibility?.choropleth]);

  // Update Source Data Poligon Garis Batas Wilayah Kabupaten/Kota & Seluruh Kecamatan (Isolasi Fokus)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('selected-boundaries-src') as maplibregl.GeoJSONSource;
    const isChoroplethVisible = layerVisibility?.choropleth ?? true;

    if (source) {
      if (selectedBoundariesGeoJSON && selectedBoundariesGeoJSON.features && selectedBoundariesGeoJSON.features.length > 0) {
        source.setData(selectedBoundariesGeoJSON);

        // 1. Tampilkan poligon & garis pembatas kecamatan di dalam wilayah yang dicari
        if (map.current.getLayer('selected-boundaries-fill')) {
          map.current.setLayoutProperty('selected-boundaries-fill', 'visibility', 'visible');
        }
        if (map.current.getLayer('selected-boundaries-line')) {
          map.current.setLayoutProperty('selected-boundaries-line', 'visibility', 'visible');
        }
        if (map.current.getLayer('selected-boundaries-labels')) {
          map.current.setLayoutProperty('selected-boundaries-labels', 'visibility', 'visible');
        }

        // 2. ISOLASI FOKUS TOTAL: Nonaktifkan sepenuhnya batas & fill kabupaten lain agar user fokus
        if (map.current.getLayer('choropleth-kecamatan-line')) {
          map.current.setLayoutProperty('choropleth-kecamatan-line', 'visibility', 'none');
        }
        if (map.current.getLayer('choropleth-kecamatan-fill')) {
          map.current.setLayoutProperty('choropleth-kecamatan-fill', 'visibility', 'none');
        }
      } else {
        source.setData({ type: 'FeatureCollection', features: [] });
        if (map.current.getLayer('selected-boundaries-fill')) {
          map.current.setLayoutProperty('selected-boundaries-fill', 'visibility', 'none');
        }
        if (map.current.getLayer('selected-boundaries-line')) {
          map.current.setLayoutProperty('selected-boundaries-line', 'visibility', 'none');
        }
        if (map.current.getLayer('selected-boundaries-labels')) {
          map.current.setLayoutProperty('selected-boundaries-labels', 'visibility', 'none');
        }

        // Kembalikan batas-batas makro 19 Kabupaten/Kota saat filter direset
        if (map.current.getLayer('choropleth-kecamatan-line')) {
          map.current.setLayoutProperty(
            'choropleth-kecamatan-line',
            'visibility',
            isChoroplethVisible ? 'visible' : 'none'
          );
        }
        if (map.current.getLayer('choropleth-kecamatan-fill')) {
          map.current.setLayoutProperty(
            'choropleth-kecamatan-fill',
            'visibility',
            isChoroplethVisible ? 'visible' : 'none'
          );
          map.current.setPaintProperty('choropleth-kecamatan-fill', 'fill-opacity', styleVariant === 'satelit' ? 0.45 : 0.65);
        }
      }
    }
  }, [selectedBoundariesGeoJSON, mapLoaded, layerVisibility?.choropleth, styleVariant]);

  // Update Highlight Kecamatan Spesifik pada Poligon Batas Wilayah
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    if (map.current.getLayer('selected-boundaries-subdistrict-highlight')) {
      if (selectedKecamatanHighlightId) {
        const targetId = Number(selectedKecamatanHighlightId);
        map.current.setFilter('selected-boundaries-subdistrict-highlight', [
          'any',
          ['==', ['get', 'id'], isNaN(targetId) ? -1 : targetId],
          ['==', ['to-string', ['get', 'id']], String(selectedKecamatanHighlightId)],
          ['==', ['get', 'nama'], String(selectedKecamatanHighlightId)]
        ]);
        map.current.setLayoutProperty('selected-boundaries-subdistrict-highlight', 'visibility', 'visible');
      } else {
        map.current.setLayoutProperty('selected-boundaries-subdistrict-highlight', 'visibility', 'none');
      }
    }
  }, [selectedKecamatanHighlightId, mapLoaded]);

  // Update Jalan Terputus saat versi bertambah
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('jalan-terputus-src') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(`/api/jalan-terputus?t=${Date.now()}`);
    }
  }, [jalanVersion, mapLoaded]);

  // Update Posko, Shelter TES, & Sirine EWS saat versi posko bertambah
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const pSrc = map.current.getSource('posko-evakuasi-src') as maplibregl.GeoJSONSource;
    if (pSrc) {
      pSrc.setData(`/api/posko?t=${Date.now()}`);
    }
    const sSrc = map.current.getSource('shelter-tes-src') as maplibregl.GeoJSONSource;
    if (sSrc) {
      sSrc.setData(`/api/posko?jenis=shelter_tes_tea&t=${Date.now()}`);
    }
    const sirSrc = map.current.getSource('sirine-tsunami-src') as maplibregl.GeoJSONSource;
    if (sirSrc) {
      sirSrc.setData(`/api/posko?jenis=sirine_tsunami&include_nonaktif=true&t=${Date.now()}`);
    }
  }, [poskoVersion, mapLoaded]);

  // Update Layer Visibility Dinamis dari LayerControlPanel
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    applyLayerVisibility(map.current, layerVisibility);
  }, [layerVisibility, mapLoaded, applyLayerVisibility]);

  // Efek Kursor saat Mode Penentuan Titik Evakuasi di Peta Aktif
  useEffect(() => {
    if (!map.current) return;
    const canvas = map.current.getCanvas();
    if (isPickingLocation) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = '';
    }
  }, [isPickingLocation]);

  // Update Rute Evakuasi
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('route-evakuasi-src') as maplibregl.GeoJSONSource;
    if (source) {
      if (routeGeometry) {
        source.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: routeGeometry,
              properties: {},
            },
          ],
        });

        if (routeGeometry.coordinates && routeGeometry.coordinates.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          routeGeometry.coordinates.forEach((coord: number[]) => {
            bounds.extend([coord[0], coord[1]]);
          });
          map.current.fitBounds(bounds, {
            padding: { top: 70, bottom: 90, left: 340, right: 70 },
            duration: 1000,
          });
        }
      } else {
        source.setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
    }
  }, [routeGeometry, mapLoaded]);

  // Marker Lokasi Pengguna
  useEffect(() => {
    if (!map.current) return;
    if (userCoords) {
      if (!userMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'gis-user-location-marker';
        el.innerHTML = `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(0, 240, 255, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background: #00F0FF; border: 2.5px solid #FFFFFF; box-shadow: 0 0 10px rgba(0,240,255,0.8);"></div>
          </div>
        `;
        userMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([userCoords.lng, userCoords.lat])
          .addTo(map.current);
      } else {
        userMarkerRef.current.setLngLat([userCoords.lng, userCoords.lat]);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  }, [userCoords]);

  // Marker Posko Tujuan
  useEffect(() => {
    if (!map.current) return;
    if (poskoCoords) {
      if (!poskoMarkerRef.current) {
        const el = document.createElement('div');
        el.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="background: #10B981; color: white; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.5); white-space: nowrap; border: 1px solid #34D399; margin-bottom: 2px;">
              🏁 ${poskoCoords.nama || 'Posko Tujuan'}
            </div>
            <div style="width: 14px; height: 14px; background: #10B981; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(16,185,129,0.8);"></div>
          </div>
        `;
        poskoMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([poskoCoords.lng, poskoCoords.lat])
          .addTo(map.current);
      } else {
        poskoMarkerRef.current.setLngLat([poskoCoords.lng, poskoCoords.lat]);
      }
    } else if (poskoMarkerRef.current) {
      poskoMarkerRef.current.remove();
      poskoMarkerRef.current = null;
    }
  }, [poskoCoords]);

  // Marker Gempa BMKG
  useEffect(() => {
    if (!map.current) return;
    if (gempaData && gempaData.lon && gempaData.lat) {
      if (!gempaMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'gis-gempa-epicenter-marker';
        el.title = `Pusat Gempa M ${gempaData.magnitude} - ${gempaData.wilayah_teks}`;
        el.innerHTML = `
          <div style="position: relative; width: 42px; height: 42px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(239, 68, 68, 0.35); animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(239, 68, 68, 0.85); border: 2.5px solid #FFFFFF; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 10.5px; box-shadow: 0 0 12px rgba(239, 68, 68, 0.9);">
              M${gempaData.magnitude}
            </div>
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 20, className: 'gis-hover-popup', maxWidth: 'none' }).setHTML(`
          <div style="font-family: 'Inter', -apple-system, sans-serif; width: 250px; box-sizing: border-box; color: #F8FAFC;">
            <div style="display: flex; align-items: center; gap: 5px; border-bottom: 1px solid rgba(239,68,68,0.3); padding-bottom: 4px; margin-bottom: 6px;">
              <span style="font-weight: 800; color: #EF4444; font-size: 11px;">⚠️ GEMPA TERKINI BMKG</span>
            </div>
            <div style="font-weight: 800; font-size: 13.5px; color: #FFFFFF; margin-bottom: 3px;">
              Magnitudo ${gempaData.magnitude} SR
            </div>
            <div style="font-size: 11px; color: #CBD5E1; margin-bottom: 4px; line-height: 1.35;">
              ${gempaData.wilayah_teks}
            </div>
            <div style="font-size: 10px; color: #94A3B8; line-height: 1.4;">
              Kedalaman: <b style="color: #E2E8F0;">${gempaData.kedalaman_km} km</b><br/>
              Waktu: <span style="color: #E2E8F0;">${gempaData.waktu_kejadian}</span>
            </div>
            ${
              gempaData.potensi_tsunami
                ? `<div style="background: rgba(220,38,38,0.25); color: #FCA5A5; border: 1px solid rgba(220,38,38,0.5); font-size: 9.5px; font-weight: 800; padding: 3px 6px; border-radius: 4px; margin-top: 6px; text-align: center; letter-spacing: 0.05em;">POTENSI TSUNAMI AKTIF</div>`
                : ''
            }
          </div>
        `);

        gempaMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat([gempaData.lon, gempaData.lat])
          .setPopup(popup)
          .addTo(map.current);
      } else {
        gempaMarkerRef.current.setLngLat([gempaData.lon, gempaData.lat]);
      }
    } else if (gempaMarkerRef.current) {
      gempaMarkerRef.current.remove();
      gempaMarkerRef.current = null;
    }
  }, [gempaData]);

  // FlyTo Koordinat Terpilih
  useEffect(() => {
    if (!map.current || !flyToCoords) return;
    map.current.flyTo({
      center: [flyToCoords.lng, flyToCoords.lat],
      zoom: flyToCoords.zoom || 11.5,
      pitch: modeHematDaya ? 0 : 45,
      essential: true,
      duration: 1200,
    });
  }, [flyToCoords, modeHematDaya]);

  return (
    <div className="relative w-full h-full bg-[#0F1720]">
      <div ref={mapContainer} className="w-full h-full" id="maplibre-container" />

      {/* Floating Follower Tooltip saat Mode Penentuan Titik Aktif */}
      {isPickingLocation && mousePos && (
        <div 
          className="pointer-events-none absolute z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl border-2 border-amber-200 transform -translate-x-1/2 -translate-y-12 animate-in fade-in duration-75 select-none"
          style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          <span>Klik titik ini sebagai asal evakuasi</span>
        </div>
      )}
    </div>
  );
};
