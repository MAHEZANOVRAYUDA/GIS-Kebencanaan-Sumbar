import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { LayerVisibilityState } from './LayerControlPanel';

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
  choroplethUrl?: string;
  flyToCoords?: { lat: number; lng: number } | null;
  routeGeometry?: any | null;
  userCoords?: { lat: number; lng: number } | null;
  poskoCoords?: { lat: number; lng: number; nama?: string } | null;
  jalanVersion?: number;
  gempaData?: GempaInfo | null;
  styleVariant?: BasemapStyle;
  is3DTerrain?: boolean;
  modeHematDaya?: boolean;
  layerVisibility?: LayerVisibilityState;
  onCoordinatesChange?: (coords: { lng: number; lat: number; zoom: number }) => void;
  onSelectWilayah?: (wilayahId: number, properties?: any) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  selectedWilayahId,
  flyToCoords,
  routeGeometry,
  userCoords,
  poskoCoords,
  jalanVersion = 0,
  gempaData,
  styleVariant = 'satelit',
  is3DTerrain = false,
  modeHematDaya,
  layerVisibility,
  onCoordinatesChange,
  onSelectWilayah,
}) => {
  // 3D Terrain mati secara default untuk performa ringan & dingin
  const active3D = is3DTerrain ?? (modeHematDaya !== undefined ? !modeHematDaya : false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Markers
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const poskoMarkerRef = useRef<maplibregl.Marker | null>(null);
  const gempaMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Helper untuk menambahkan seluruh layer spasial kustom kebencanaan
  const setupCustomLayers = useCallback((mapInstance: maplibregl.Map) => {
    // 1. Source & Layer Vector Tile Choropleth (Fase 4 - ST_AsMVT Native)
    if (!mapInstance.getSource('choropleth-kecamatan')) {
      mapInstance.addSource('choropleth-kecamatan', {
        type: 'vector',
        tiles: ['/api/tiles/choropleth/{z}/{x}/{y}.mvt?v=2'],
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
          'fill-opacity': styleVariant === 'satelit' ? 0.45 : 0.65,
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
          'line-color': styleVariant === 'satelit' ? '#FFFFFF' : styleVariant === 'terang' ? '#1E3A5F' : '#38BDF8',
          'line-width': styleVariant === 'satelit' ? 1.5 : 1.2,
          'line-opacity': styleVariant === 'satelit' ? 0.9 : 0.8,
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
        filter: ['==', ['get', 'id'], selectedWilayahId || -1],
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

    // 3. Source & Layer Posko Evakuasi Umum (Faskes & Posko Utama)
    if (!mapInstance.getSource('posko-evakuasi-src')) {
      mapInstance.addSource('posko-evakuasi-src', {
        type: 'geojson',
        data: '/api/posko',
      });
    }

    if (!mapInstance.getLayer('posko-evakuasi-circle')) {
      mapInstance.addLayer({
        id: 'posko-evakuasi-circle',
        type: 'circle',
        source: 'posko-evakuasi-src',
        filter: ['all', ['!=', ['get', 'jenis'], 'sirine_tsunami'], ['!=', ['get', 'jenis'], 'shelter_tes_tea']],
        paint: {
          'circle-radius': 7,
          'circle-color': '#10B981',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }

    // 4. Source & Layer Shelter TES/TEA Tsunami (Gedung Evakuasi Vertikal)
    if (!mapInstance.getSource('shelter-tes-src')) {
      mapInstance.addSource('shelter-tes-src', {
        type: 'geojson',
        data: '/api/posko?jenis=shelter_tes_tea',
      });
    }

    if (!mapInstance.getLayer('shelter-tes-halo')) {
      mapInstance.addLayer({
        id: 'shelter-tes-halo',
        type: 'circle',
        source: 'shelter-tes-src',
        paint: {
          'circle-radius': 14,
          'circle-color': '#0284C7',
          'circle-opacity': 0.35,
        },
      });
    }

    if (!mapInstance.getLayer('shelter-tes-circle')) {
      mapInstance.addLayer({
        id: 'shelter-tes-circle',
        type: 'circle',
        source: 'shelter-tes-src',
        paint: {
          'circle-radius': 8.5,
          'circle-color': '#0284C7',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }

    // 5. Source & Layer Sirine EWS Tsunami BPBD
    if (!mapInstance.getSource('sirine-tsunami-src')) {
      mapInstance.addSource('sirine-tsunami-src', {
        type: 'geojson',
        data: '/api/posko?jenis=sirine_tsunami&include_nonaktif=true',
      });
    }

    if (!mapInstance.getLayer('sirine-tsunami-halo')) {
      mapInstance.addLayer({
        id: 'sirine-tsunami-halo',
        type: 'circle',
        source: 'sirine-tsunami-src',
        paint: {
          'circle-radius': 12,
          'circle-color': [
            'match',
            ['get', 'status'],
            'aktif',
            '#F59E0B',
            '#64748B'
          ],
          'circle-opacity': 0.3,
        },
      });
    }

    if (!mapInstance.getLayer('sirine-tsunami-circle')) {
      mapInstance.addLayer({
        id: 'sirine-tsunami-circle',
        type: 'circle',
        source: 'sirine-tsunami-src',
        paint: {
          'circle-radius': 6.5,
          'circle-color': [
            'match',
            ['get', 'status'],
            'aktif',
            '#F59E0B',
            '#64748B'
          ],
          'circle-stroke-width': 2.0,
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

    // 5. 3D Terrain (Topografi Elevasi Sumbar) jika mode 3D diaktifkan pengguna
    try {
      if (active3D && mapInstance.getSource('terrain-dem')) {
        mapInstance.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
      } else {
        mapInstance.setTerrain(null);
      }
    } catch (e) {
      console.debug('Terrain status:', e);
    }
  }, [styleVariant, active3D, selectedWilayahId]);

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
      offset: 12,
      className: 'gis-hover-popup',
    });

    mapInstance.on('load', () => {
      setMapLoaded(true);
      setupCustomLayers(mapInstance);

      // Tooltip Posko
      mapInstance.on('mousemove', 'posko-evakuasi-circle', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', sans-serif; padding: 3px 6px;">
                <div style="font-weight: 700; color: #10B981; font-size: 11px;">POSKO EVAKUASI / FASKES</div>
                <div style="font-weight: 700; color: #FFF; font-size: 12px;">${p.nama}</div>
                <div style="color: #94A3B8; font-size: 10px;">Kapasitas: ${p.kapasitas || '-'} Jiwa</div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'posko-evakuasi-circle', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip & Popup Shelter TES/TEA Tsunami
      mapInstance.on('mousemove', 'shelter-tes-circle', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', sans-serif; padding: 4px 6px; min-width: 190px;">
                <div style="font-weight: 800; color: #38BDF8; font-size: 11px;">🏢 SHELTER TES/TEA TSUNAMI</div>
                <div style="font-weight: 700; color: #FFF; font-size: 12px; margin-top: 1px;">${p.nama}</div>
                <div style="color: #E2E8F0; font-size: 11px; margin-top: 2px;">Daya Tampung: <strong style="color:#38BDF8">${p.kapasitas || '-'}</strong> Jiwa</div>
                <div style="color: #94A3B8; font-size: 9.5px; margin-top: 1px;">Evakuasi Vertikal Bebas Rendaman Tsunami</div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'shelter-tes-circle', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip & Popup Sirine EWS Tsunami BPBD
      mapInstance.on('mousemove', 'sirine-tsunami-circle', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const p = e.features[0].properties;
          const isAktif = p.status === 'aktif';
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', sans-serif; padding: 4px 6px; min-width: 180px;">
                <div style="font-weight: 800; color: ${isAktif ? '#F59E0B' : '#94A3B8'}; font-size: 11px;">
                  🚨 SIRINE EWS TSUNAMI ${isAktif ? '(SIAGA AKTIF)' : '(PEMELIHARAAN)'}
                </div>
                <div style="font-weight: 700; color: #FFF; font-size: 12px; margin-top: 1px;">${p.nama}</div>
                <div style="color: #94A3B8; font-size: 10px; margin-top: 2px;">Pemilik: BPBD Provinsi Sumatera Barat</div>
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'sirine-tsunami-circle', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Tooltip Jalan Terputus
      mapInstance.on('mousemove', 'jalan-terputus-line', (e) => {
        mapInstance.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: 'Inter', sans-serif; padding: 2px 4px;">
                <div style="font-weight: 700; color: #EF4444; font-size: 11px;">RUAS JALAN TERPUTUS</div>
                <div style="font-weight: bold; color: #F59E0B; font-size: 12px; text-transform: uppercase;">${props.alasan}</div>
                <div style="color: #E2E8F0; font-size: 10px;">${props.deskripsi || ''}</div>
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
              <div style="font-family: 'Inter', sans-serif; padding: 2px 4px; min-width: 140px;">
                <div style="font-weight: 700; color: #FFFFFF; font-size: 12px; margin-bottom: 2px;">
                  ${props.nama}
                </div>
                <div style="color: #94A3B8; font-size: 10px; margin-bottom: 4px;">
                  Tingkat Risiko: <strong style="text-transform: uppercase; color: ${color};">${props.tingkat_risiko || 'rendah'}</strong>
                </div>
                <div style="font-weight: 600; font-size: 11px; color: ${color}; font-family: monospace;">
                  ${rpText}
                </div>
                ${props.total_meninggal > 0 ? `<div style="color: #E74C3C; font-size: 10px; font-weight: bold; margin-top: 2px;">&bull; Korban: ${props.total_meninggal} Jiwa</div>` : ''}
              </div>
            `)
            .addTo(mapInstance);
        }
      });

      mapInstance.on('mouseleave', 'choropleth-kecamatan-fill', () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.remove();
      });

      // Klik Poligon Vector Tile Wilayah
      mapInstance.on('click', 'choropleth-kecamatan-fill', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const wilayahId = feature.properties?.id;
          if (wilayahId && onSelectWilayah) {
            onSelectWilayah(wilayahId, feature.properties);
          }
        }
      });

      // Spatial Lookup jika klik area peta di luar poligon
      mapInstance.on('click', (e) => {
        const features = mapInstance.queryRenderedFeatures(e.point, {
          layers: ['choropleth-kecamatan-fill', 'posko-evakuasi-circle', 'shelter-tes-circle', 'sirine-tsunami-circle', 'jalan-terputus-line'],
        });

        if (features.length === 0 && onSelectWilayah) {
          fetch(`/api/wilayah/lookup?lat=${e.lngLat.lat}&lon=${e.lngLat.lng}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && data.id) {
                onSelectWilayah(data.id, data);
              }
            })
            .catch(() => {});
        }
      });
    });

    mapInstance.on('mousemove', (e: maplibregl.MapMouseEvent) => {
      if (onCoordinatesChange) {
        onCoordinatesChange({
          lng: parseFloat(e.lngLat.lng.toFixed(5)),
          lat: parseFloat(e.lngLat.lat.toFixed(5)),
          zoom: parseFloat(mapInstance.getZoom().toFixed(2)),
        });
      }
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
    const targetStyle = `/styles/${styleVariant}.json`;
    map.current.setStyle(targetStyle);

    // Pasang kembali seluruh layer kustom begitu style baru selesai dimuat
    map.current.once('style.load', () => {
      if (map.current) {
        setupCustomLayers(map.current);
      }
    });
  }, [styleVariant, mapLoaded, setupCustomLayers]);

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
    }
  }, [selectedWilayahId, mapLoaded]);

  // Update Jalan Terputus saat versi bertambah
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const source = map.current.getSource('jalan-terputus-src') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(`/api/jalan-terputus?t=${Date.now()}`);
    }
  }, [jalanVersion, mapLoaded]);

  // Update Layer Visibility Dinamis dari LayerControlPanel
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const v = layerVisibility || {
      choropleth: true,
      shelterTes: true,
      sirineTsunami: true,
      jalanTerputus: true,
      gempa: true,
      cuaca: true,
    };

    const setLayerVis = (id: string, isVisible: boolean) => {
      try {
        if (map.current?.getLayer(id)) {
          map.current.setLayoutProperty(id, 'visibility', isVisible ? 'visible' : 'none');
        }
      } catch {}
    };

    setLayerVis('choropleth-kecamatan-fill', v.choropleth);
    setLayerVis('choropleth-kecamatan-line', v.choropleth);
    setLayerVis('shelter-tes-circle', v.shelterTes);
    setLayerVis('shelter-tes-halo', v.shelterTes);
    setLayerVis('sirine-tsunami-circle', v.sirineTsunami);
    setLayerVis('sirine-tsunami-halo', v.sirineTsunami);
    setLayerVis('jalan-terputus-line', v.jalanTerputus);
    setLayerVis('jalan-terputus-line-casing', v.jalanTerputus);
    setLayerVis('posko-evakuasi-circle', v.shelterTes || v.choropleth);

    if (gempaMarkerRef.current) {
      gempaMarkerRef.current.getElement().style.display = v.gempa ? 'flex' : 'none';
    }
  }, [layerVisibility, mapLoaded]);

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

        const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
          <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 170px;">
            <div style="font-weight: 800; color: #EF4444; font-size: 12px; margin-bottom: 2px;">
              ⚠️ GEMPA TERKINI BMKG
            </div>
            <div style="font-weight: bold; font-size: 13px; color: #FFFFFF; margin-bottom: 4px;">
              Magnitudo ${gempaData.magnitude} SR
            </div>
            <div style="font-size: 11px; color: #CBD5E1; margin-bottom: 4px;">
              ${gempaData.wilayah_teks}
            </div>
            <div style="font-size: 10px; color: #94A3B8;">
              Kedalaman: ${gempaData.kedalaman_km} km<br/>
              Waktu: ${gempaData.waktu_kejadian}
            </div>
            ${
              gempaData.potensi_tsunami
                ? `<div style="background: #DC2626; color: white; font-size: 10px; font-weight: bold; padding: 2px 4px; border-radius: 3px; margin-top: 5px; text-align: center;">POTENSI TSUNAMI</div>`
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
      zoom: 11.5,
      pitch: modeHematDaya ? 0 : 45,
      essential: true,
      duration: 1200,
    });
  }, [flyToCoords, modeHematDaya]);

  return (
    <div className="relative w-full h-full bg-[#0F1720]">
      <div ref={mapContainer} className="w-full h-full" id="maplibre-container" />
    </div>
  );
};
