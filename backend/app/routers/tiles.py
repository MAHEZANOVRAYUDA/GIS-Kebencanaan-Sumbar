import asyncio
import logging
from typing import Dict, Tuple, Optional
from fastapi import APIRouter, Depends, Path, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_async_db, AsyncSessionLocal

logger = logging.getLogger("tiles")
router = APIRouter(prefix="/tiles", tags=["Vector Tiles"])

# Cache sederhana di memori untuk tile hasil build (in-memory tile cache)
# Key: (z, x, y, v), Value: bytes
_tile_cache: Dict[Tuple[int, int, int, Optional[str]], bytes] = {}
_last_refresh: Optional[str] = None


async def refresh_mv_dampak_concurrently():
    """
    Me-refresh Materialized View mv_dampak_per_kecamatan secara CONCURRENTLY
    sesuai rekomendasi 11-optimasi-performa.md.
    Menggunakan unique index pada wilayah_id sehingga pembacaan tidak terblokir (zero table lock).
    """
    global _tile_cache, _last_refresh
    try:
        async with AsyncSessionLocal() as session:
            logger.info("[-] Menjalankan REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan...")
            await session.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dampak_per_kecamatan;"))
            await session.commit()
            
            # Ambil timestamp terakhir refresh
            res = await session.execute(text("SELECT MAX(terakhir_refresh)::text FROM mv_dampak_per_kecamatan;"))
            row = res.scalar()
            _last_refresh = row or "Baru saja"
            
            # Invalidation tile cache agar request berikutnya menyajikan data baru
            _tile_cache.clear()
            logger.info("[+] Materialized view mv_dampak_per_kecamatan berhasil di-refresh concurrently.")
    except Exception as e:
        logger.error(f"[!] Gagal refresh materialized view concurrently: {e}")


async def start_tiles_scheduler(interval_seconds: int = 900):
    """
    Background worker terjadwal untuk refresh MV mv_dampak_per_kecamatan setiap 15 menit (900 detik).
    """
    # Tunggu beberapa detik di startup sebelum refresh pertama
    await asyncio.sleep(5)
    await refresh_mv_dampak_concurrently()
    
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await refresh_mv_dampak_concurrently()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"[!] Error pada background tile scheduler: {e}")
            await asyncio.sleep(60)


@router.get("/choropleth/{z}/{x}/{y}.mvt")
async def get_choropleth_tile(
    z: int = Path(..., ge=0, le=22, description="Zoom level (0-22)"),
    x: int = Path(..., ge=0, description="Tile X coordinate"),
    y: int = Path(..., ge=0, description="Tile Y coordinate"),
    v: Optional[str] = Query(None, description="Cache buster version"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Menyajikan Vector Tile (MVT) poligon kecamatan beserta data agregasi dampak bencana.
    Memanfaatkan fungsi native PostGIS ST_TileEnvelope, ST_AsMVTGeom, dan ST_AsMVT.
    Jauh lebih cepat dan hemat bandwidth dibanding GeoJSON mentah (11-optimasi-performa.md).
    """
    cache_key = (z, x, y, v)
    if cache_key in _tile_cache:
        return Response(
            content=_tile_cache[cache_key],
            media_type="application/x-protobuf",
            headers={
                "Content-Type": "application/x-protobuf",
                "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
                "X-Tile-Cache": "HIT"
            }
        )

    # Pilih geometri simplifikasi pada zoom rendah (LOD) agar render kilat
    geom_expr = "ST_Transform(ST_MakeValid(COALESCE(w.geom_simplified, w.geom)), 3857)" if z <= 10 else "ST_Transform(ST_MakeValid(w.geom), 3857)"

    sql = text(f"""
        WITH mvtgeom AS (
            SELECT 
                w.id,
                w.nama,
                w.kode_wilayah,
                COALESCE(mv.total_kerugian, 0)::float AS total_kerugian,
                COALESCE(mv.total_meninggal, 0)::int AS total_meninggal,
                COALESCE(mv.total_luka, 0)::int AS total_luka,
                COALESCE(mv.total_terdampak, 0)::int AS total_terdampak,
                COALESCE(mv.jumlah_kejadian, 0)::int AS jumlah_kejadian,
                CASE 
                    WHEN COALESCE(mv.total_kerugian, 0) >= 1500000000 OR COALESCE(mv.total_meninggal, 0) > 0 THEN 'tinggi'
                    WHEN COALESCE(mv.total_kerugian, 0) >= 400000000 THEN 'sedang'
                    ELSE 'rendah'
                END AS tingkat_risiko,
                ST_AsMVTGeom(
                    {geom_expr},
                    ST_TileEnvelope(:z, :x, :y),
                    4096,
                    64,
                    true
                ) AS geom
            FROM wilayah_administratif w
            LEFT JOIN mv_dampak_per_kecamatan mv ON mv.wilayah_id = w.id
            WHERE (w.level = 'kabupaten' OR (w.level = 'kecamatan' AND w.geom IS NOT NULL))
              AND w.geom IS NOT NULL
              AND ST_Intersects(
                  {geom_expr},
                  ST_TileEnvelope(:z, :x, :y)
              )
        )
        SELECT ST_AsMVT(mvtgeom.*, 'choropleth_kecamatan') AS mvt FROM mvtgeom;
    """)

    result = await db.execute(sql, {"z": z, "x": x, "y": y})
    tile_data = result.scalar()

    tile_bytes = bytes(tile_data) if tile_data else b""
    
    # Simpan di cache memori jika zoom level <= 12
    if z <= 12 and len(_tile_bytes := tile_bytes) > 0:
        _tile_cache[cache_key] = _tile_bytes

    return Response(
        content=tile_bytes,
        media_type="application/x-protobuf",
        headers={
            "Content-Type": "application/x-protobuf",
            "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
            "X-Tile-Cache": "MISS"
        }
    )


@router.post("/refresh-materialized-view")
async def trigger_refresh():
    """Trigger manual refresh materialized view CONCURRENTLY untuk admin/petugas."""
    await refresh_mv_dampak_concurrently()
    return {
        "status": "success",
        "message": "Materialized view mv_dampak_per_kecamatan berhasil di-refresh concurrently.",
        "terakhir_refresh": _last_refresh
    }
