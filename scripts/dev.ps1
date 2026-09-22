# Skrip Peluncur Pengembangan Terpadu GIS Kebencanaan Sumatera Barat
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Memulai Sistem GIS Kebencanaan Sumatera Barat" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Cek Port Database (5433)
$dbTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 5433 -WarningAction SilentlyContinue
if ($dbTest.TcpTestSucceeded) {
    Write-Host "[1/3] PostgreSQL + PostGIS siap di port 5433." -ForegroundColor Green
} else {
    Write-Host "[1/3] Memulai PostgreSQL..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList "/k `"$PSScriptRoot\start_database.bat`""
    Start-Sleep -Seconds 3
}

# 2. Jalankan Backend
Write-Host "[2/3] Memulai Backend FastAPI (Port 8000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k `"$PSScriptRoot\start_backend.bat`""
Start-Sleep -Seconds 2

# 3. Jalankan Frontend
Write-Host "[3/3] Memulai Frontend Vite/React (Port 5173)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k `"$PSScriptRoot\start_frontend.bat`""

Write-Host "===================================================" -ForegroundColor Green
Write-Host " Seluruh layanan berhasil diluncurkan!" -ForegroundColor Green
Write-Host " Frontend: http://127.0.0.1:5173/" -ForegroundColor White
Write-Host " Backend:  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "===================================================" -ForegroundColor Green
