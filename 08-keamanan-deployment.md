# 08 — Keamanan & Deployment (Tanpa Docker)

## Kenapa tanpa Docker untuk tahap ini

Keputusan eksplisit user untuk fase riset/demo saat ini. Semua panduan di bawah dirancang agar sistem tetap terstruktur rapi dan mudah dikelola tanpa kontainerisasi — menggunakan **systemd** sebagai process manager di Linux, yang sudah tersedia native di hampir semua distro server modern.

## Struktur service systemd

Setiap komponen jalan sebagai service systemd terpisah, memudahkan restart/monitoring individual:

```
gis-backend.service        # FastAPI (via Uvicorn/Gunicorn)
gis-osrm.service           # OSRM routing engine
gis-valhalla.service       # Valhalla routing engine
gis-photon.service         # Geocoding
postgresql.service          # sudah service bawaan OS
```

Contoh `gis-backend.service`:

```ini
[Unit]
Description=GIS Sumbar Backend API
After=network.target postgresql.service

[Service]
Type=simple
User=gisapp
WorkingDirectory=/opt/gis-sumbar/backend
Environment="PATH=/opt/gis-sumbar/backend/venv/bin"
EnvironmentFile=/opt/gis-sumbar/backend/.env
ExecStart=/opt/gis-sumbar/backend/venv/bin/gunicorn app.main:app \
    -k uvicorn.workers.UvicornWorker \
    --workers 4 --bind 127.0.0.1:8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now gis-backend gis-osrm gis-valhalla gis-photon
sudo systemctl status gis-backend   # cek status kapan saja
```

## Reverse proxy — Nginx atau Caddy

Gunakan reverse proxy di depan seluruh service agar hanya satu port publik (443) terekspos, sementara backend/routing engine hanya listen di `127.0.0.1`.

**Caddy** direkomendasikan untuk kesederhanaan (HTTPS otomatis via Let's Encrypt, config minimal):

```
# /etc/caddy/Caddyfile
dashboard-gis.contoh.go.id {
    handle /api/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle {
        root * /opt/gis-sumbar/frontend/dist
        try_files {path} /index.html
        file_server
    }
}
```

## Checklist keamanan wajib

- [ ] **HTTPS/TLS** aktif di seluruh domain publik — tanpa kecuali, termasuk untuk tile server/object storage internal.
- [ ] **Password database** kuat, disimpan di `.env` (permission `600`, hanya dibaca user aplikasi), tidak pernah di-commit ke Git.
- [ ] **`.gitignore`** mencakup `.env`, `*.pem`, `*.key`, dan seluruh folder data mentah/tile hasil build (ukuran besar, tidak perlu di-version-control).
- [ ] **JWT secret key** panjang dan acak (minimal 32 byte random, bukan string yang mudah ditebak seperti "secret123").
- [ ] **Rate limiting** aktif di seluruh endpoint publik (lihat detail di `03-backend-api.md`).
- [ ] **CORS** dikonfigurasi ketat — hanya izinkan origin domain frontend resmi, bukan wildcard `*` di produksi.
- [ ] **Validasi input** di setiap endpoint yang menerima data dari Operator (form input kejadian, dsb) menggunakan Pydantic schema, tidak menerima data mentah tanpa validasi tipe/rentang.
- [ ] **Audit log** aktif untuk seluruh operasi tulis (create/update/delete) oleh Operator dan Admin.
- [ ] **Firewall** (`ufw`/`iptables`) hanya membuka port yang benar-benar perlu diakses publik (80, 443) — port database, OSRM, Valhalla, Photon **tidak** boleh terekspos ke internet.

## Monitoring & health check

Gunakan **Uptime Kuma** (open-source, self-hosted, instalasi ringan tanpa Docker juga dimungkinkan via Node.js langsung) untuk memantau:
- Endpoint `/api/health` backend
- Ketersediaan OSRM/Valhalla (`/route/v1/driving/...` test request sederhana)
- Ketersediaan PostgreSQL

```python
# Tambahkan endpoint health check sederhana di backend
@app.get("/api/health")
async def health_check():
    db_ok = await check_database_connection()
    return {"status": "ok" if db_ok else "degraded", "timestamp": datetime.utcnow()}
```

Konfigurasi notifikasi (email/Telegram bot — keduanya gratis) saat ada service down lebih dari beberapa menit.

## Backup & Disaster Recovery

```bash
#!/bin/bash
# /opt/scripts/backup-database.sh — dijadwalkan via cron harian
TANGGAL=$(date +%Y-%m-%d)
pg_dump -U gisapp gis_sumbar | gzip > /backup/gis_sumbar_${TANGGAL}.sql.gz

# Hapus backup lebih tua dari 14 hari
find /backup -name "gis_sumbar_*.sql.gz" -mtime +14 -delete

# (Opsional lanjutan) sinkronkan ke storage terpisah/off-site
# rclone copy /backup remote:gis-sumbar-backup/
```

```bash
# crontab -e
0 3 * * * /opt/scripts/backup-database.sh >> /var/log/gis-backup.log 2>&1
```

**Runbook pemulihan minimal** (dokumentasikan ini secara tertulis, jangan hanya mengandalkan satu orang yang hafal):
1. Restore database: `gunzip -c backup.sql.gz | psql -U gisapp gis_sumbar`
2. Restart seluruh service: `sudo systemctl restart gis-backend gis-osrm gis-valhalla gis-photon`
3. Verifikasi via `/api/health` dan uji manual fitur kritis (peta tampil, evakuasi berfungsi)
4. Jika data tile/routing graph korup, jalankan ulang script build dari `05-peta-gis.md`/`06-routing-evakuasi.md` — data ini bisa di-generate ulang dari sumber OSM, tidak perlu backup terpisah selama script build tersimpan aman.

## Load testing sebelum demo/go-live

Gunakan **k6** (open-source, skrip JavaScript sederhana) untuk mensimulasikan lonjakan trafik:

```javascript
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up normal
    { duration: '2m', target: 500 },  // simulasi lonjakan saat bencana
    { duration: '1m', target: 0 },    // ramp down
  ],
};

export default function () {
  http.get('https://dashboard-gis.contoh.go.id/api/bencana');
  http.get('https://dashboard-gis.contoh.go.id/api/posko/nearest?lat=-0.95&lon=100.35');
  sleep(1);
}
```

```bash
k6 run load-test.js
```

Target minimal: sistem tetap responsif (< 3 detik response time) pada beban 500 concurrent virtual users tanpa error rate signifikan.
