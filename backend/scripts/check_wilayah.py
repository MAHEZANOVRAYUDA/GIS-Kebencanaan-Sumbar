import asyncio
from app.core.database import async_session_factory
from sqlalchemy import text

async def check():
    async with async_session_factory() as db:
        res = await db.execute(text("""
            SELECT id, kode_wilayah, nama, level, parent_id, 
                   ST_X(ST_Centroid(geom)) as lon, ST_Y(ST_Centroid(geom)) as lat
            FROM wilayah_administratif 
            WHERE level = 'kabupaten' 
            ORDER BY nama LIMIT 5;
        """))
        print('KABUPATEN:')
        for r in res.fetchall():
            print(dict(r._mapping))
            
        res_kec = await db.execute(text("""
            SELECT w.id, w.kode_wilayah, w.nama, p.nama as parent_nama,
                   ST_X(ST_Centroid(w.geom)) as lon, ST_Y(ST_Centroid(w.geom)) as lat
            FROM wilayah_administratif w
            JOIN wilayah_administratif p ON p.id = w.parent_id
            WHERE w.level = 'kecamatan' AND p.nama ILIKE '%Padang%'
            ORDER BY w.nama;
        """))
        print('\nKECAMATAN DI PADANG:')
        for r in res_kec.fetchall():
            print(dict(r._mapping))

if __name__ == '__main__':
    asyncio.run(check())
