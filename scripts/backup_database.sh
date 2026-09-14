#!/usr/bin/env bash
# ==============================================================================
# Script Otomasi Backup Harian Database PostGIS GIS Kebencanaan Sumatera Barat
# Referensi: 08-keamanan-deployment.md
# Dijadwalkan via Cron (misal: 0 3 * * * /opt/scripts/backup_database.sh)
# ==============================================================================
set -euo pipefail

BACKUP_DIR="/var/backups/gis-sumbar"
DB_NAME="${DB_NAME:-gis_sumbar}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

TANGGAL=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/gis_sumbar_${TANGGAL}.sql.gz"

echo "================================================================="
echo "  MEMULAI BACKUP POSTGIS GIS KEBENCANAAN SUMBAR: ${TANGGAL}      "
echo "================================================================="

# Eksekusi pg_dump dengan kompresi gzip
pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -F c -b -v | gzip > "${BACKUP_FILE}"

echo "[✓] Backup berhasil disimpan: ${BACKUP_FILE}"
ls -lh "${BACKUP_FILE}"

# Hapus backup yang lebih tua dari 14 hari
echo "[-] Membersihkan arsip backup yang lebih tua dari ${RETENTION_DAYS} hari..."
find "${BACKUP_DIR}" -name "gis_sumbar_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} \;

echo "[✓] Pembersihan selesai."
