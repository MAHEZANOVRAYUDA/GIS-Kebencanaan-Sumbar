@echo off
echo ===================================================
echo Memulai Seluruh Layanan GIS Kebencanaan Sumbar
echo ===================================================

echo [1/3] Menjalankan Database PostgreSQL (Port 5433)...
start "GIS DB (PostgreSQL+PostGIS)" cmd /k "%~dp0start_database.bat"

timeout /t 3 /nobreak > nul

echo [2/3] Menjalankan Backend API (Port 8000)...
start "GIS Backend (FastAPI)" cmd /k "%~dp0start_backend.bat"

timeout /t 2 /nobreak > nul

echo [3/3] Menjalankan Frontend Web (Port 5173)...
start "GIS Frontend (Vite/React)" cmd /k "%~dp0start_frontend.bat"

echo ===================================================
echo Seluruh layanan telah diluncurkan!
echo Frontend: http://127.0.0.1:5173/
echo Backend:  http://127.0.0.1:8000/docs
echo ===================================================
pause
