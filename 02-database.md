# 02 — Database (PostgreSQL + PostGIS)

## Setup awal

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib postgis postgresql-16-postgis-3

sudo -u postgres createdb gis_sumbar
sudo -u postgres psql -d gis_sumbar -c "CREATE EXTENSION postgis;"
sudo -u postgres psql -d gis_sumbar -c "CREATE EXTENSION postgis_topology;"
```

Gunakan SRID **4326** (WGS84, lat/lon standar GPS) untuk semua kolom geometri kecuali disebutkan lain. Untuk kalkulasi jarak akurat dalam meter, gunakan `geography` type atau transformasi ke SRID lokal (mis. UTM zona 47S/48S untuk Sumbar) saat dibutuhkan.

## Skema inti

### `wilayah_administratif`

Menyimpan seluruh level batas wilayah (provinsi, kabupaten/kota, kecamatan, nagari/desa) dalam satu tabel dengan `parent_id` self-referencing — memudahkan query hierarkis drill-down.

```sql
CREATE TABLE wilayah_administratif (
    id              SERIAL PRIMARY KEY,
    kode_wilayah    VARCHAR(20) UNIQUE NOT NULL,  -- kode BPS/Kemendagri
    nama            VARCHAR(150) NOT NULL,
    level           VARCHAR(20) NOT NULL CHECK (level IN ('provinsi','kabupaten','kecamatan','nagari')),
    parent_id       INTEGER REFERENCES wilayah_administratif(id),
    populasi        INTEGER,
    geom            GEOMETRY(MultiPolygon, 4326) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wilayah_geom ON wilayah_administratif USING GIST (geom);
CREATE INDEX idx_wilayah_parent ON wilayah_administratif (parent_id);
CREATE INDEX idx_wilayah_level ON wilayah_administratif (level);
```

### `kejadian_bencana`

```sql
CREATE TABLE kejadian_bencana (
    id                SERIAL PRIMARY KEY,
    jenis_bencana     VARCHAR(30) NOT NULL CHECK (jenis_bencana IN
                        ('gempa','tsunami','banjir','longsor','erupsi','angin_puting_beliung','kebakaran','lainnya')),
    tanggal_kejadian  TIMESTAMPTZ NOT NULL,
    wilayah_id        INTEGER REFERENCES wilayah_administratif(id),
    lokasi            GEOMETRY(Point, 4326),         -- titik episentrum/lokasi spesifik (opsional)
    deskripsi         TEXT,
    sumber_data       VARCHAR(50) DEFAULT 'operator_bpbd',  -- 'operator_bpbd' | 'bmkg' | 'bnpb' | 'crowdsource'
    status_verifikasi VARCHAR(20) DEFAULT 'terverifikasi' CHECK (status_verifikasi IN ('terverifikasi','menunggu','ditolak')),
    dibuat_oleh       INTEGER REFERENCES pengguna(id),
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_kejadian_lokasi ON kejadian_bencana USING GIST (lokasi);
CREATE INDEX idx_kejadian_wilayah ON kejadian_bencana (wilayah_id);
CREATE INDEX idx_kejadian_tanggal ON kejadian_bencana (tanggal_kejadian DESC);
CREATE INDEX idx_kejadian_jenis ON kejadian_bencana (jenis_bencana);
```

### `data_dampak_bencana`

```sql
CREATE TABLE data_dampak_bencana (
    id                    SERIAL PRIMARY KEY,
    kejadian_id           INTEGER REFERENCES kejadian_bencana(id) ON DELETE CASCADE,
    wilayah_id            INTEGER REFERENCES wilayah_administratif(id) NOT NULL,
    korban_meninggal      INTEGER DEFAULT 0,
    korban_hilang         INTEGER DEFAULT 0,
    korban_luka           INTEGER DEFAULT 0,
    jumlah_pengungsi      INTEGER DEFAULT 0,
    kerugian_rp           NUMERIC(18,2) DEFAULT 0,
    rumah_rusak_berat     INTEGER DEFAULT 0,
    rumah_rusak_sedang    INTEGER DEFAULT 0,
    rumah_rusak_ringan    INTEGER DEFAULT 0,
    fasilitas_umum_rusak  INTEGER DEFAULT 0,
    fasilitas_kesehatan_rusak INTEGER DEFAULT 0,
    sekolah_rusak         INTEGER DEFAULT 0,
    penduduk_terdampak    INTEGER DEFAULT 0,
    catatan               TEXT,
    updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dampak_kejadian ON data_dampak_bencana (kejadian_id);
CREATE INDEX idx_dampak_wilayah ON data_dampak_bencana (wilayah_id);
```

### `posko_evakuasi`

```sql
CREATE TABLE posko_evakuasi (
    id              SERIAL PRIMARY KEY,
    nama            VARCHAR(150) NOT NULL,
    jenis           VARCHAR(30) CHECK (jenis IN ('posko_utama','titik_kumpul','shelter_sementara','fasilitas_kesehatan')),
    lokasi          GEOMETRY(Point, 4326) NOT NULL,
    kapasitas       INTEGER,
    fasilitas       TEXT[],           -- array: {'air_bersih','mck','dapur_umum','klinik', ...}
    kontak_pic      VARCHAR(100),
    kontak_telepon  VARCHAR(30),
    status          VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif','penuh','nonaktif')),
    wilayah_id      INTEGER REFERENCES wilayah_administratif(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posko_lokasi ON posko_evakuasi USING GIST (lokasi);
CREATE INDEX idx_posko_status ON posko_evakuasi (status);
```

### `jalan_terputus` — kritikal untuk fitur routing sadar-blokade

```sql
CREATE TABLE jalan_terputus (
    id              SERIAL PRIMARY KEY,
    geom            GEOMETRY(LineString, 4326) NOT NULL,   -- segmen ruas jalan yang terdampak
    alasan          VARCHAR(30) CHECK (alasan IN ('longsor','banjir','jembatan_putus','kerusakan_jalan','lainnya')),
    deskripsi       TEXT,
    status          VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif','sebagian','pulih')),
    dilaporkan_oleh INTEGER REFERENCES pengguna(id),
    tanggal_lapor   TIMESTAMPTZ DEFAULT now(),
    tanggal_pulih   TIMESTAMPTZ
);

CREATE INDEX idx_jalan_terputus_geom ON jalan_terputus USING GIST (geom);
CREATE INDEX idx_jalan_terputus_status ON jalan_terputus (status) WHERE status = 'aktif';
```

> Tabel ini dibaca oleh service routing (lihat `06-routing-evakuasi.md`) untuk membangun daftar exclude-area sebelum memanggil OSRM/Valhalla.

### `gempa_bmkg` — cache data eksternal

```sql
CREATE TABLE gempa_bmkg (
    id                SERIAL PRIMARY KEY,
    external_id       VARCHAR(50) UNIQUE,   -- untuk deduplikasi saat sync ulang
    magnitude         NUMERIC(3,1),
    kedalaman_km      NUMERIC(6,2),
    lokasi            GEOMETRY(Point, 4326),
    wilayah_teks      VARCHAR(200),
    waktu_kejadian    TIMESTAMPTZ,
    potensi_tsunami   BOOLEAN DEFAULT false,
    dirasakan         BOOLEAN DEFAULT false,
    synced_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gempa_lokasi ON gempa_bmkg USING GIST (lokasi);
CREATE INDEX idx_gempa_waktu ON gempa_bmkg (waktu_kejadian DESC);
```

### `pengguna` (autentikasi & RBAC)

```sql
CREATE TABLE pengguna (
    id              SERIAL PRIMARY KEY,
    nama            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,   -- bcrypt/argon2, JANGAN plaintext
    role            VARCHAR(20) NOT NULL CHECK (role IN ('operator','admin','pimpinan')),
    wilayah_tugas_id INTEGER REFERENCES wilayah_administratif(id),  -- batas wilayah untuk role operator
    aktif           BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);
```

> Peran **Publik** tidak butuh baris di tabel ini — akses publik tanpa login secara desain.

### `audit_log`

```sql
CREATE TABLE audit_log (
    id           SERIAL PRIMARY KEY,
    pengguna_id  INTEGER REFERENCES pengguna(id),
    aksi         VARCHAR(50) NOT NULL,        -- 'create_kejadian', 'update_posko', dst
    tabel_target VARCHAR(50),
    record_id    INTEGER,
    detail       JSONB,
    ip_address   INET,
    created_at   TIMESTAMPTZ DEFAULT now()
);
```

### `mv_dampak_per_kecamatan` — materialized view untuk agregasi berat

Dipakai oleh endpoint `/api/wilayah/{id}/dampak` dan sebagai basis generate vector tile choropleth (`/api/tiles/choropleth/...`, lihat `11-optimasi-performa.md`). Dibuat sebagai materialized view (bukan tabel biasa atau view biasa) karena query di baliknya melibatkan JOIN + agregasi yang tidak perlu dihitung ulang di setiap request.

```sql
CREATE MATERIALIZED VIEW mv_dampak_per_kecamatan AS
SELECT w.id AS wilayah_id, w.nama,
       SUM(d.kerugian_rp) AS total_kerugian,
       SUM(d.korban_meninggal) AS total_meninggal,
       SUM(d.korban_luka) AS total_luka,
       SUM(d.penduduk_terdampak) AS total_terdampak,
       COUNT(DISTINCT k.id) AS jumlah_kejadian,
       now() AS terakhir_refresh
FROM wilayah_administratif w
LEFT JOIN kejadian_bencana k ON k.wilayah_id = w.id
LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
WHERE w.level = 'kecamatan'
GROUP BY w.id, w.nama;

-- WAJIB: unique index, prasyarat mutlak agar bisa di-refresh dengan CONCURRENTLY
-- (tanpa ini, refresh akan mengunci seluruh pembacaan — lihat 11-optimasi-performa.md)
CREATE UNIQUE INDEX ON mv_dampak_per_kecamatan (wilayah_id);
```

**Jadwal refresh**: setiap 15 menit via `pg_cron` atau APScheduler backend, selalu dengan `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan;` — jangan pernah `REFRESH` tanpa `CONCURRENTLY` di lingkungan yang diakses publik. Kolom `terakhir_refresh` ditampilkan di UI sebagai indikator kesegaran data ("Data per pukul HH:MM").

## Contoh query kunci

### Drill-down wilayah (klik peta → data agregat)

```sql
SELECT
    w.nama, w.level,
    COALESCE(SUM(d.korban_meninggal), 0) AS total_meninggal,
    COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian,
    COALESCE(SUM(d.penduduk_terdampak), 0) AS total_terdampak
FROM wilayah_administratif w
LEFT JOIN data_dampak_bencana d ON d.wilayah_id = w.id
WHERE ST_Contains(w.geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326))
  AND w.level = 'kecamatan'
GROUP BY w.id, w.nama, w.level;
```

### Posko terdekat (K-Nearest Neighbor, sangat cepat dengan index GIST)

```sql
SELECT id, nama, jenis, kapasitas,
       ST_X(lokasi) AS lon, ST_Y(lokasi) AS lat,
       ST_Distance(lokasi::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS jarak_meter
FROM posko_evakuasi
WHERE status = 'aktif'
ORDER BY lokasi <-> ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
LIMIT 3;
```

### Choropleth risiko per kecamatan (agregat untuk render layer fill)

```sql
SELECT w.id, w.nama, ST_AsGeoJSON(w.geom) AS geometry,
       COUNT(k.id) AS jumlah_kejadian,
       COALESCE(SUM(d.kerugian_rp), 0) AS total_kerugian
FROM wilayah_administratif w
LEFT JOIN kejadian_bencana k ON k.wilayah_id = w.id
LEFT JOIN data_dampak_bencana d ON d.kejadian_id = k.id
WHERE w.level = 'kecamatan'
GROUP BY w.id, w.nama, w.geom;
```

## Strategi migrasi data awal

1. **Batas wilayah**: unduh dari BIG (Badan Informasi Geospasial) atau BPS dalam format Shapefile, konversi ke SQL via `ogr2ogr`:
   ```bash
   ogr2ogr -f "PostgreSQL" PG:"dbname=gis_sumbar" batas_kecamatan_sumbar.shp \
     -nln wilayah_administratif_staging -nlt MULTIPOLYGON -t_srs EPSG:4326
   ```
   Lalu migrasikan dari staging table ke skema final dengan mapping kolom.

2. **Data historis BPBD (Excel/CSV)**: tulis script ETL Python (`pandas` + `psycopg2`/`SQLAlchemy`) untuk parsing dan insert terstruktur — jangan insert manual satu-satu.

3. Gunakan **Alembic** untuk seluruh perubahan skema setelah setup awal — jangan ubah skema manual langsung di server produksi/demo.

## Kebijakan retensi & backup

- Backup penuh (`pg_dump`) harian, disimpan minimal 14 hari, di lokasi terpisah dari server database.
- Data `gempa_bmkg` yang lebih tua dari 2 tahun dapat diarsipkan ke tabel terpisah `gempa_bmkg_arsip` untuk menjaga performa query tabel utama tetap ringan.
