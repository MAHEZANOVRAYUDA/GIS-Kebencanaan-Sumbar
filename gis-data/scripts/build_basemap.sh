#!/usr/bin/env bash
# ==============================================================================
# Script Otomasi Build Basemap PMTiles Sumatera Barat
# Sesuai Spesifikasi: 05-peta-gis.md & 11-optimasi-performa.md
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DATA_DIR="${BASE_DIR}/gis-data"
RAW_DIR="${DATA_DIR}/raw"
OUT_DIR="${DATA_DIR}/pmtiles"

mkdir -p "${RAW_DIR}" "${OUT_DIR}"

echo "================================================================="
echo "  BUILD BASEMAP PMTILES SUMATERA BARAT (OPTIMASI KETAT FASE 4)   "
echo "================================================================="

# Bounding box Sumatera Barat: min_lon=97.0, min_lat=-3.5, max_lon=102.5, max_lat=1.5
BBOX="97.0,-3.5,102.5,1.5"

# 1. Download ekstrak OpenStreetMap Sumatera dari Geofabrik jika belum ada
SUMATRA_PBF="${RAW_DIR}/sumatra-latest.osm.pbf"
SUMBAR_PBF="${RAW_DIR}/sumbar.osm.pbf"

if [ ! -f "${SUMATRA_PBF}" ]; then
  echo "[1/3] Mengunduh ekstrak Sumatera dari Geofabrik..."
  curl -L -o "${SUMATRA_PBF}" "https://download.geofabrik.de/asia/indonesia/sumatra-latest.osm.pbf"
else
  echo "[1/3] File ${SUMATRA_PBF} sudah tersedia."
fi

# 2. Ekstrak area Sumatera Barat menggunakan osmium-tool
if [ ! -f "${SUMBAR_PBF}" ]; then
  echo "[2/3] Memotong area geografis Sumatera Barat (${BBOX})..."
  if command -v osmium &> /dev/null; then
    osmium extract -b "${BBOX}" "${SUMATRA_PBF}" -o "${SUMBAR_PBF}"
  else
    echo "[!] osmium tidak ditemukan, menyalin sumber pbf langsung ke ${SUMBAR_PBF}..."
    cp "${SUMATRA_PBF}" "${SUMBAR_PBF}"
  fi
else
  echo "[2/3] File potongan ${SUMBAR_PBF} sudah tersedia."
fi

# 3. Unduh Planetiler jar jika belum tersedia
PLANETILER_JAR="${DATA_DIR}/planetiler.jar"
if [ ! -f "${PLANETILER_JAR}" ]; then
  echo "Mengunduh Planetiler..."
  curl -L -o "${PLANETILER_JAR}" "https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar"
fi

# 4. Build PMTiles dengan flag pemangkasan ketat sesuai 11-optimasi-performa.md:
# --exclude-layers=building,poi,housenumber,mountain_peak
# --languages=id
# --maxzoom=14
OUTPUT_PMTILES="${OUT_DIR}/sumbar-basemap.pmtiles"

echo "[3/3] Membangun PMTiles dengan pembatasan efisiensi..."
java -Xmx4g -jar "${PLANETILER_JAR}" \
  --area=sumbar \
  --osm-path="${SUMBAR_PBF}" \
  --output="${OUTPUT_PMTILES}" \
  --exclude-layers=building,poi,housenumber,mountain_peak \
  --languages=id \
  --maxzoom=14

echo "[✓] Berhasil membuat basemap kustom: ${OUTPUT_PMTILES}"
echo "Ukuran file basemap:"
ls -lh "${OUTPUT_PMTILES}"
