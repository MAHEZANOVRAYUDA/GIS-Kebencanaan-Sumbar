import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def test():
    async with AsyncSessionLocal() as db:
        # Cek data kabupaten di wilayah_administratif
        res_kab = await db.execute(text("SELECT id, kode_wilayah, nama, level, parent_id FROM wilayah_administratif WHERE level = 'kabupaten' ORDER BY nama"))
        kab_rows = res_kab.fetchall()
        print(f"=== KABUPATEN DI WILAYAH_ADMINISTRATIF ({len(kab_rows)}) ===")
        for r in kab_rows:
            print(f"ID: {r.id}, Kode: {r.kode_wilayah}, Nama: '{r.nama}'")

        # Cek data kecamatan dan parent-nya
        res_kec = await db.execute(text("""
            SELECT p.id as p_id, p.nama as p_nama, count(w.id) as total_kec,
                   count(w.geom) as total_geom
            FROM wilayah_administratif w
            JOIN wilayah_administratif p ON p.id = w.parent_id
            WHERE w.level = 'kecamatan'
            GROUP BY p.id, p.nama
            ORDER BY p.nama;
        """))
        print("\n=== JUMLAH KECAMATAN PER KABUPATEN DI WILAYAH_ADMINISTRATIF ===")
        for r in res_kec.fetchall():
            print(f"Parent [{r.p_id}] {r.p_nama}: {r.total_kec} kecamatan, {r.total_geom} bergeometri")

        # Cek apakah ada kecamatan yang parent_id-nya null atau tidak terhubung
        res_orphan = await db.execute(text("""
            SELECT count(*) FROM wilayah_administratif WHERE level = 'kecamatan' AND parent_id IS NULL;
        """))
        print(f"\nKecamatan tanpa parent_id: {res_orphan.scalar()}")

        # Cek kecamatan spesifik Kota Padang
        res_padang = await db.execute(text("""
            SELECT w.id, w.kode_wilayah, w.nama, p.nama as p_nama, 
                   ST_GeometryType(w.geom) as geom_type,
                   ST_NPoints(w.geom) as n_points,
                   ST_X(ST_Centroid(w.geom)) as lon,
                   ST_Y(ST_Centroid(w.geom)) as lat
            FROM wilayah_administratif w
            LEFT JOIN wilayah_administratif p ON p.id = w.parent_id
            WHERE p.nama ILIKE '%Padang%' AND w.level = 'kecamatan'
            ORDER BY p.nama, w.nama;
        """))
        padang_rows = res_padang.fetchall()
        print(f"\n=== KECAMATAN TERKAIT PADANG ({len(padang_rows)}) ===")
        for r in padang_rows:
            print(f"[{r.id}] {r.nama} (Parent: {r.p_nama}) | Type: {r.geom_type} ({r.n_points} pts) | Centroid: ({r.lat:.4f}, {r.lon:.4f})")

if __name__ == '__main__':
    asyncio.run(test())
