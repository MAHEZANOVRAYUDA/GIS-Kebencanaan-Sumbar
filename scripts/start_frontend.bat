@echo off
echo ===================================================
echo Menjalankan Frontend Vite + React + MapLibre (Port 5173)
echo ===================================================
cd /d "%~dp0\..\frontend"
npx vite --host 127.0.0.1 --port 5173
pause
