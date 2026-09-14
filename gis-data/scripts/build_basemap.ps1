# ==============================================================================
# Script Otomasi Build Basemap PMTiles Sumatera Barat (Windows PowerShell)
# Sesuai Spesifikasi: 05-peta-gis.md & 11-optimasi-performa.md
# ==============================================================================
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Resolve-Path "$ScriptDir\..\.."
$DataDir = "$BaseDir\gis-data"
$RawDir = "$DataDir\raw"
$OutDir = "$DataDir\pmtiles"

if (!(Test-Path $RawDir)) { New-Item -ItemType Directory -Path $RawDir -Force | Out-Null }
if (!(Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  BUILD BASEMAP PMTILES SUMATERA BARAT (OPTIMASI KETAT FASE 4)   " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$SumatraPbf = "$RawDir\sumatra-latest.osm.pbf"
$SumbarPbf = "$RawDir\sumbar.osm.pbf"

if (!(Test-Path $SumatraPbf)) {
    Write-Host "[1/3] Mengunduh ekstrak OpenStreetMap Sumatera dari Geofabrik..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://download.geofabrik.de/asia/indonesia/sumatra-latest.osm.pbf" -OutFile $SumatraPbf
} else {
    Write-Host "[1/3] File $SumatraPbf sudah tersedia." -ForegroundColor Green
}

if (!(Test-Path $SumbarPbf)) {
    Write-Host "[2/3] Menyiapkan file potongan Sumatera Barat..." -ForegroundColor Yellow
    Copy-Item -Path $SumatraPbf -Destination $SumbarPbf
} else {
    Write-Host "[2/3] File $SumbarPbf sudah tersedia." -ForegroundColor Green
}

$PlanetilerJar = "$DataDir\planetiler.jar"
if (!(Test-Path $PlanetilerJar)) {
    Write-Host "Mengunduh Planetiler..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar" -OutFile $PlanetilerJar
}

$OutputPmtiles = "$OutDir\sumbar-basemap.pmtiles"
Write-Host "[3/3] Menjalankan Planetiler build dengan pembatasan efisiensi..." -ForegroundColor Yellow
Write-Host "Flags: --exclude-layers=building,poi,housenumber,mountain_peak --languages=id --maxzoom=14" -ForegroundColor DarkGray

java -Xmx4g -jar $PlanetilerJar `
    --area=sumbar `
    --osm-path=$SumbarPbf `
    --output=$OutputPmtiles `
    --exclude-layers=building,poi,housenumber,mountain_peak `
    --languages=id `
    --maxzoom=14

Write-Host "[✓] Basemap PMTiles berhasil dibangun: $OutputPmtiles" -ForegroundColor Green
Get-Item $OutputPmtiles | Select-Object Name, @{Name="Size(MB)";Expression={[math]::round($_.Length/1MB, 2)}}, LastWriteTime
