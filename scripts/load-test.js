import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Script Load Testing Lonjakan Trafik Bencana Sumatera Barat
 * Sesuai Spesifikasi: 08-keamanan-deployment.md
 * 
 * Menyimulasikan lonjakan akses publik saat terjadi bencana (gempa/tsunami/banjir)
 * Target: 500 Concurrent Virtual Users dengan p95 latency < 3 detik.
 * 
 * Cara menjalankan:
 *   k6 run scripts/load-test.js
 *   k6 run -e TARGET_URL=http://127.0.0.1:8000 scripts/load-test.js
 */

export const options = {
  stages: [
    { duration: '20s', target: 50 },  // Ramp-up kondisi normal (50 VU)
    { duration: '1m',  target: 500 }, // Lonjakan darurat bencana (500 VU)
    { duration: '20s', target: 0 },   // Ramp-down pemulihan
  ],
  thresholds: {
    // SLA Kritis: 95% request harus selesai di bawah 3 detik
    http_req_duration: ['p(95)<3000'],
    // Error rate maksimal di bawah 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://127.0.0.1:8000';

export default function () {
  // 1. Endpoint Statistik Ringkasan Bencana (Akses Beranda)
  const resStats = http.get(`${BASE_URL}/api/bencana/statistik`);
  check(resStats, {
    'Statistik bencana respons 200': (r) => r.status === 200,
  });

  // 2. Endpoint Pencarian Posko Terdekat KNN PostGIS (Akses Evakuasi)
  const resPosko = http.get(`${BASE_URL}/api/posko/nearest?lat=-0.9471&lon=100.3543&limit=3`);
  check(resPosko, {
    'Posko terdekat respons 200': (r) => r.status === 200,
  });

  // 3. Endpoint Vector Tile MVT Choropleth ST_AsMVT (Render Peta Cepat)
  const resTile = http.get(`${BASE_URL}/api/tiles/choropleth/8/199/128.mvt`);
  check(resTile, {
    'Vector tile respons 200': (r) => r.status === 200,
    'Header protobuf valid': (r) => r.headers['Content-Type']?.includes('application/x-protobuf'),
  });

  // 4. Endpoint Spatial Drill-Down ST_Contains (Klik Peta Wilayah)
  const resLookup = http.get(`${BASE_URL}/api/wilayah/lookup?lat=-0.9471&lon=100.3543`);
  check(resLookup, {
    'Lookup wilayah respons 200': (r) => r.status === 200,
  });

  // 5. Health Check Endpoint (Monitoring Heartbeat)
  const resHealth = http.get(`${BASE_URL}/api/health`);
  check(resHealth, {
    'Health check status OK': (r) => r.status === 200,
  });

  sleep(1);
}
