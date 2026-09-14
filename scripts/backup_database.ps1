# ==============================================================================
# Script Otomasi Backup Harian Database PostGIS (Windows PowerShell)
# Referensi: 08-keamanan-deployment.md
# ==============================================================================
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BaseDir = Resolve-Path "$ScriptDir\.."
$BackupDir = "$BaseDir\backups"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$BackupFile = "$BackupDir\gis_sumbar_$Timestamp.sql"
$ZipFile = "$BackupFile.gz"

$PgDumpPath = "E:\pgsql\bin\pg_dump.exe"
if (!(Test-Path $PgDumpPath)) {
    $PgDumpPath = "pg_dump"
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  MEMULAI BACKUP POSTGIS GIS KEBENCANAAN SUMBAR: $Timestamp       " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$env:PGPASSWORD = "postgres123"

# Dump database
& $PgDumpPath -h 127.0.0.1 -p 5433 -U postgres -d gis_sumbar -F p -f $BackupFile

if (Test-Path $BackupFile) {
    Write-Host "[OK] Dump SQL berhasil dibuat: $BackupFile" -ForegroundColor Green
    
    # Kompresi gzip menggunakan .NET
    $InputStream = [System.IO.File]::OpenRead($BackupFile)
    $OutputStream = [System.IO.File]::Create($ZipFile)
    $GzipStream = New-Object System.IO.Compression.GZipStream($OutputStream, [System.IO.Compression.CompressionMode]::Compress)
    $InputStream.CopyTo($GzipStream)
    $GzipStream.Close()
    $OutputStream.Close()
    $InputStream.Close()

    Remove-Item -Path $BackupFile -Force

    Write-Host "[OK] Backup terkompresi: $ZipFile" -ForegroundColor Green
    Get-Item $ZipFile | Select-Object Name, @{Name="Size(MB)";Expression={[math]::round($_.Length/1MB, 2)}}, LastWriteTime
}

# Retensi 14 hari
$LimitDate = (Get-Date).AddDays(-14)
Get-ChildItem -Path $BackupDir -Filter "gis_sumbar_*.sql.gz" | Where-Object { $_.LastWriteTime -lt $LimitDate } | ForEach-Object {
    Write-Host "[-] Menghapus backup lama: $($_.Name)" -ForegroundColor DarkGray
    Remove-Item $_.FullName -Force
}

Write-Host "[OK] Proses backup selesai dengan sukses." -ForegroundColor Green
