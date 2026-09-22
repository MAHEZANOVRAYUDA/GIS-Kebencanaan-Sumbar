# 03 — Backend & API

> **Baca juga `11-optimasi-performa.md`** sebelum implementasi endpoint yang menyajikan data spasial (`wilayah`, `bencana`, `tiles`) — beberapa endpoint di bawah punya dua versi (GeoJSON untuk prototipe cepat vs vector tile untuk production) yang dijelaskan detail di sana. Tabel di bawah hanya kontrak/rute API; keputusan cara menyajikannya ada di file performa.

## Stack

- **FastAPI** (Python 3.11+) — async, dokumentasi OpenAPI otomatis di `/docs`
- **SQLAlchemy 2.0** (async) + **Alembic** untuk migrasi
- **Pydantic v2** untuk validasi request/response
- **APScheduler** untuk job terjadwal (sinkronisasi data eksternal)
- **python-jose** atau **PyJWT** untuk token JWT
- **passlib[bcrypt]** untuk hashing password — **jangan pernah** simpan password plaintext

## Struktur endpoint

### Autentikasi (`/api/auth`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/api/auth/login` | Publik | Login, return JWT access + refresh token |
| POST | `/api/auth/refresh` | Punya refresh token | Perpanjang access token |
| POST | `/api/auth/logout` | Login | Invalidasi refresh token |

### Wilayah (`/api/wilayah`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/api/wilayah` | Publik | Daftar wilayah, filter by `level` & `parent_id` |
| GET | `/api/wilayah/{id}` | Publik | Detail satu wilayah + geometri GeoJSON |
| GET | `/api/wilayah/lookup?lat=&lon=` | Publik | Drill-down: temukan wilayah dari koordinat klik |
| GET | `/api/wilayah/{id}/dampak` | Publik | Agregat data dampak bencana wilayah tsb (baca dari `mv_dampak_per_kecamatan`, lihat `02-database.md`) |
| GET | `/api/wilayah/choropleth?level=kecamatan` | Publik | **[Versi prototipe/demo awal]** GeoJSON FeatureCollection siap-render — cukup untuk data kecil/demo |
| GET | `/api/tiles/choropleth/{z}/{x}/{y}.mvt` | Publik | **[Versi production]** Vector tile (MVT) hasil pre-build, menggantikan endpoint di atas begitu data mulai besar — lihat `11-optimasi-performa.md` untuk alasan & cara migrasinya |

### Bencana (`/api/bencana`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/api/bencana` | Publik | List kejadian, filter `jenis`, `tanggal_mulai`, `tanggal_akhir`, `wilayah_id` |
| GET | `/api/bencana/{id}` | Publik | Detail kejadian + dampak terkait |
| POST | `/api/bencana` | Operator, Admin | Input kejadian baru |
| PUT | `/api/bencana/{id}` | Operator (wilayah sendiri), Admin | Update data kejadian/dampak |
| GET | `/api/bencana/heatmap` | Publik | Titik-titik kejadian dalam format ringan untuk heatmap layer |

### Posko (`/api/posko`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/api/posko` | Publik | Daftar posko aktif |
| GET | `/api/posko/nearest?lat=&lon=&limit=3` | Publik | Posko terdekat (lihat query KNN di `02-database.md`) |
| POST | `/api/posko` | Operator, Admin | Tambah posko baru |
| PUT | `/api/posko/{id}` | Operator (wilayah sendiri), Admin | Update status/kapasitas posko |

### Routing/Evakuasi (`/api/routing`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| POST | `/api/routing/evakuasi` | Publik | Body: `{lat, lon}` → return rute ke posko terdekat + instruksi turn-by-turn (lihat kontrak detail di `06-routing-evakuasi.md`) |
| POST | `/api/jalan-terputus` | Operator, Admin | Tandai ruas jalan sebagai terputus (geometry + alasan) |
| PUT | `/api/jalan-terputus/{id}/pulihkan` | Operator, Admin | Tandai ruas jalan sudah pulih |
| GET | `/api/jalan-terputus` | Publik | Daftar jalan terputus aktif (untuk ditampilkan sebagai layer warning di peta) |

### Data eksternal (`/api/eksternal`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET | `/api/eksternal/gempa-terkini` | Publik | Data gempa dari cache lokal (hasil sync BMKG) |
| GET | `/api/eksternal/status-sync` | Admin | Status terakhir tiap job sinkronisasi (untuk monitoring) |

### Admin (`/api/admin`)

| Method | Endpoint | Akses | Deskripsi |
|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/admin/pengguna` | Admin | CRUD pengguna & role |
| GET | `/api/admin/audit-log` | Admin | Riwayat perubahan data |
| GET | `/api/admin/statistik` | Admin, Pimpinan | Data ringkasan untuk dashboard analitik |

## Contoh kontrak response — GeoJSON

Semua endpoint yang mengembalikan data spasial **wajib** memakai format GeoJSON standar agar bisa langsung dikonsumsi MapLibre tanpa transformasi tambahan di frontend:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [100.62, -0.95] },
      "properties": {
        "id": 42,
        "nama": "Posko Kecamatan Lubuk Kilangan",
        "jenis": "posko_utama",
        "kapasitas": 250,
        "status": "aktif"
      }
    }
  ]
}
```

## Autentikasi & otorisasi

- JWT access token umur **15 menit**, refresh token umur **7 hari**, disimpan sebagai httpOnly cookie (bukan localStorage — mengurangi risiko XSS).
- Middleware pengecekan role di setiap endpoint yang butuh Operator/Admin/Pimpinan.
- Untuk role Operator, tambahkan filter otomatis `wilayah_tugas_id` di layer service — Operator tidak boleh bisa input data untuk wilayah lain meski memanipulasi request langsung.

## Rate limiting

Gunakan `slowapi` (wrapper `limits` untuk FastAPI):

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/posko/nearest")
@limiter.limit("30/minute")
async def nearest_posko(request: Request, lat: float, lon: float):
    ...
```

Endpoint publik: 30–60 request/menit per IP cukup longgar untuk penggunaan normal namun mencegah abuse/scraping berlebihan.

## Job terjadwal (worker)

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(sync_gempa_bmkg, "interval", minutes=5)
scheduler.add_job(sync_data_bnpb, "cron", hour=2)  # jam sepi trafik
scheduler.add_job(backup_database, "cron", hour=3)
scheduler.start()
```

Detail masing-masing job sinkronisasi ada di `07-integrasi-data-eksternal.md`.

## Error handling standar

Konsisten di seluruh endpoint, format error:

```json
{
  "error": {
    "code": "WILAYAH_NOT_FOUND",
    "message": "Wilayah pada koordinat tersebut tidak ditemukan dalam basis data."
  }
}
```

Jangan expose stack trace atau detail internal ke response — log detail lengkap di server, kirim pesan generik ke client.

## Testing

- Unit test untuk service layer (logika bisnis, terutama kalkulasi routing & agregasi dampak) menggunakan `pytest`.
- Test integrasi untuk endpoint kunci menggunakan `pytest` + `httpx.AsyncClient` terhadap database test terpisah (bukan database demo/produksi).
