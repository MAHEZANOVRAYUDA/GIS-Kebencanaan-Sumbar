"""
Script Setup & Hardening Database Fase 4:
1. Menambahkan kolom geom_simplified pada wilayah_administratif (LOD optimization).
2. Memastikan unique index pada mv_dampak_per_kecamatan untuk REFRESH CONCURRENTLY.
3. Menguji eksekusi REFRESH MATERIALIZED VIEW CONCURRENTLY.
4. Menguji fungsi ST_AsMVT dan ST_TileEnvelope native PostGIS.
"""
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from app.core.database import sync_engine

def run_fase4_db_setup():
    print("=" * 65)
    print("  SETUP BASIS DATA SPASIAL & OPTIMASI POSTGIS (FASE 4)  ")
    print("=" * 65)

    with sync_engine.connect() as conn:
        # 1. Tambah kolom geom_simplified jika belum ada (sesuai 11-optimasi-performa.md poin 3)
        print("[-] 1. Menambahkan kolom 'geom_simplified' jika belum ada...")
        conn.execute(text("""
            ALTER TABLE wilayah_administratif 
            ADD COLUMN IF NOT EXISTS geom_simplified GEOMETRY(MultiPolygon, 4326);
        """))
        conn.commit()

        print("[-] 2. Memperbarui geometri simplifikasi untuk level provinsi & kabupaten/kecamatan...")
        conn.execute(text("""
            UPDATE wilayah_administratif
            SET geom_simplified = ST_Multi(ST_SimplifyPreserveTopology(geom, 0.001))
            WHERE geom IS NOT NULL AND geom_simplified IS NULL;
        """))
        conn.commit()
        print("[+] Kolom geom_simplified siap digunakan.")

        # 2. Pastikan unique index pada mv_dampak_per_kecamatan(wilayah_id)
        print("[-] 3. Memverifikasi unique index pada Materialized View...")
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dampak_wilayah_id 
            ON mv_dampak_per_kecamatan(wilayah_id);
        """))
        conn.commit()

        # 3. Uji REFRESH MATERIALIZED VIEW CONCURRENTLY
        print("[-] 4. Menjalankan REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan...")
        conn.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan;"))
        conn.commit()
        print("[+] REFRESH CONCURRENTLY berhasil tanpa lock antrian!")

        # 4. Uji PostGIS ST_AsMVT & ST_TileEnvelope
        print("[-] 5. Menguji fungsi Vector Tile PostGIS (ST_TileEnvelope & ST_AsMVT)...")
        # Menguji pada tile Padang z=9, x=400, y=258 (area Sumbar lon ~100.35, lat ~-0.95)
        # Bounding box konversi Mercator tile Z=9
        tile_test = conn.execute(text("""
            WITH mvtgeom AS (
                SELECT 
                    w.id,
                    w.nama,
                    w.kode_wilayah,
                    COALESCE(mv.total_kerugian, 0) AS total_kerugian,
                    COALESCE(mv.total_meninggal, 0) AS total_meninggal,
                    COALESCE(mv.total_luka, 0) AS total_luka,
                    COALESCE(mv.total_terdampak, 0) AS total_terdampak,
                    COALESCE(mv.jumlah_kejadian, 0) AS jumlah_kejadian,
                    ST_AsMVTGeom(
                        ST_Transform(COALESCE(w.geom_simplified, w.geom), 3857),
                        ST_TileEnvelope(9, 400, 258),
                        4096,
                        64,
                        true
                    ) AS geom
                FROM wilayah_administratif w
                LEFT JOIN mv_dampak_per_kecamatan mv ON mv.wilayah_id = w.id
                WHERE w.level = 'kecamatan'
                  AND ST_Intersects(
                      ST_Transform(COALESCE(w.geom_simplified, w.geom), 3857),
                      ST_TileEnvelope(9, 400, 258)
                  )
            )
            SELECT ST_AsMVT(mvtgeom.*, 'choropleth_kecamatan') AS mvt FROM mvtgeom;
        """)).scalar()

        mvt_bytes = bytes(tile_test) if tile_test else b""
        print(f"[+] Output Vector Tile (MVT) teruji! Ukuran tile payload: {len(mvt_bytes)} bytes.")

    print("=" * 65)
    print("  SETUP FASE 4 POSTGIS SELESAI SUKSES  ")
    print("=" * 65)

if __name__ == "__main__":
    run_fase4_db_setup()
