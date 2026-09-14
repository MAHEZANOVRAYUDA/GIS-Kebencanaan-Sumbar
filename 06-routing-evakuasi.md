# 06 — Routing Evakuasi (OSRM & Valhalla)

## Kenapa dua engine, bukan satu

- **OSRM**: sangat cepat (~50–100ms per request), cocok sebagai mesin default untuk kasus normal (tidak ada blokade jalan).
- **Valhalla**: mendukung **exclude polygon/edge secara dinamis per-request** tanpa perlu rebuild graph — ini krusial untuk fitur "hindari jalan yang terputus akibat bencana", karena kondisi blokade berubah-ubah dan tidak realistis untuk rebuild graph OSRM setiap kali ada laporan baru.

Strategi: pakai OSRM sebagai default cepat. Saat ada entri aktif di tabel `jalan_terputus`, alihkan permintaan ke Valhalla dengan exclude polygon dari geometri jalan yang terputus.

## Setup OSRM (tanpa Docker, sesuai keputusan proyek)

```bash
# Build dari source atau unduh binary rilis OSRM (BSD-2-Clause)
wget https://github.com/Project-OSRM/osrm-backend/releases/latest/download/osrm-backend-linux.tar.gz
tar -xzf osrm-backend-linux.tar.gz

# Proses data OSM Sumbar (hasil ekstrak yang sama dengan basemap, lihat 05-peta-gis.md)
./osrm-extract -p profiles/car.lua sumbar.osm.pbf
./osrm-partition sumbar.osrm
./osrm-customize sumbar.osrm

# Jalankan sebagai service (systemd, bukan Docker)
./osrm-routed --algorithm mld sumbar.osrm --port 5000
```

Contoh unit systemd (`/etc/systemd/system/osrm-sumbar.service`):

```ini
[Unit]
Description=OSRM Routing Service - Sumbar
After=network.target

[Service]
ExecStart=/opt/osrm/osrm-routed --algorithm mld /opt/osrm/sumbar.osrm --port 5000
Restart=always
RestartSec=5
User=osrm

[Install]
WantedBy=multi-user.target
```

## Setup Valhalla (tanpa Docker)

```bash
# Build dari source (Valhalla, MIT license) — atau gunakan paket dari repo resmi jika tersedia untuk distro yang dipakai
git clone https://github.com/valhalla/valhalla --recurse-submodules
cd valhalla && mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)

# Generate config & build tiles dari data OSM Sumbar
valhalla_build_config --mjolnir-tile-dir /opt/valhalla/tiles > valhalla.json
valhalla_build_tiles -c valhalla.json sumbar.osm.pbf

# Jalankan server (juga sebagai systemd service, pola sama dengan OSRM di atas)
valhalla_service valhalla.json 1
```

## Kontrak API internal: `/api/routing/evakuasi`

**Request:**
```json
POST /api/routing/evakuasi
{ "lat": -0.9471, "lon": 100.3543, "moda": "mobil" }
```

**Logika backend (pseudocode):**

```python
async def evakuasi(lat: float, lon: float, moda: str = "mobil"):
    poskos = await get_nearest_posko(lat, lon, limit=3)
    jalan_putus = await get_active_road_closures()

    if jalan_putus:
        rute_hasil = [await hitung_rute_valhalla(lat, lon, p, exclude=jalan_putus) for p in poskos]
    else:
        rute_hasil = [await hitung_rute_osrm(lat, lon, p) for p in poskos]

    rute_terpilih = min(rute_hasil, key=lambda r: r.duration_detik)
    return {
        "posko": rute_terpilih.posko,
        "jarak_km": rute_terpilih.jarak_km,
        "estimasi_menit": rute_terpilih.durasi_menit,
        "geometry": rute_terpilih.geojson_linestring,
        "instruksi": rute_terpilih.turn_by_turn,   # list langkah, lihat format di bawah
        "menghindari_blokade": bool(jalan_putus),
    }
```

**Response:**
```json
{
  "posko": { "id": 12, "nama": "Posko Kecamatan Padang Barat" },
  "jarak_km": 3.4,
  "estimasi_menit": 9,
  "geometry": { "type": "LineString", "coordinates": [[100.354,-0.947], ...] },
  "instruksi": [
    { "teks": "Menuju Jl. Sudirman", "jarak_m": 250 },
    { "teks": "Belok kanan ke Jl. Veteran", "jarak_m": 800 },
    { "teks": "Tiba di tujuan, di sisi kiri", "jarak_m": 0 }
  ],
  "menghindari_blokade": true
}
```

Format `instruksi` ini yang dirender frontend sebagai panel turn-by-turn ala Google Maps (lihat `RouteInstructions.tsx` di `04-frontend-ui-ux.md`).

## Mekanisme exclude jalan terputus (Valhalla)

Valhalla mendukung parameter `exclude_polygons` di request routing — kirim geometri buffer di sekitar segmen jalan yang ditandai putus:

```python
def hitung_rute_valhalla(lat, lon, posko, exclude_segments):
    exclude_polygons = [buffer_geometri(seg.geom, radius_m=30) for seg in exclude_segments]
    payload = {
        "locations": [{"lat": lat, "lon": lon}, {"lat": posko.lat, "lon": posko.lon}],
        "costing": "auto",
        "exclude_polygons": exclude_polygons,
    }
    return call_valhalla_api(payload)
```

## Geocoding — pencarian alamat/desa (Photon)

```bash
# Setup Photon (Apache-2.0), berbasis index Elasticsearch dari data Nominatim/OSM
wget https://download1.graphhopper.com/public/photon-db-latest.tar.bz2
tar -xjf photon-db-latest.tar.bz2
java -jar photon-*.jar
```

Untuk skala provinsi (bukan nasional), disarankan membangun index Photon khusus dari ekstrak OSM Sumbar saja agar ukuran index jauh lebih kecil dan query lebih cepat.

```
GET http://localhost:2322/api?q=Kecamatan+Koto+Tangah&lat=-0.9&lon=100.4
```

## Update graph rutin

Jaringan jalan dari OSM tidak statis (jalan baru dibangun, dsb). Jadwalkan rebuild bulanan:

```bash
# Cron job bulanan
0 3 1 * * /opt/scripts/rebuild-routing-graph.sh
```

Script tersebut mengulangi langkah ekstrak → osrm-extract/partition/customize → restart service — dijalankan di jam sepi trafik dengan strategi blue-green sederhana (build ke file baru, baru swap dan restart service) agar tidak ada downtime.
