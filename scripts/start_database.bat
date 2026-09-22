@echo off
echo ===================================================
echo Memeriksa Layanan PostgreSQL + PostGIS (Port 5433)
echo ===================================================

netstat -ano | findstr :5433 | findstr LISTENING > nul
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL/PostGIS telah aktif berjalan di port 5433!
    echo Layanan siap digunakan oleh backend API.
    timeout /t 3 > nul
    exit /b 0
)

echo Port 5433 belum aktif. Memulai instance PostgreSQL...
if exist "E:\pgsql\bin\postgres.exe" (
    E:\pgsql\bin\postgres.exe -D E:\pgsql\data
) else (
    echo [INFO] Jalur E:\pgsql\bin\postgres.exe tidak ditemukan.
    echo Silakan jalankan service PostgreSQL Anda melalui Windows Services (services.msc).
    pause
)
