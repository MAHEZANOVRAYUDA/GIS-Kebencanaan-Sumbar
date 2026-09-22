import asyncio
from app.core.database import async_session_factory
from sqlalchemy import text

async def main():
    async with async_session_factory() as db:
        res = await db.execute(text("SELECT id, kode_wilayah, nama, level, parent_id FROM wilayah_administratif WHERE level='kabupaten' ORDER BY nama LIMIT 10"))
        print("--- KABUPATEN ---")
        for row in res.fetchall():
            print(dict(row._mapping))
        
        res_padang = await db.execute(text("SELECT id, kode_wilayah, nama, level, parent_id FROM wilayah_administratif WHERE nama ILIKE '%Padang%' LIMIT 5"))
        print("\n--- NAMA PADANG ---")
        for row in res_padang.fetchall():
            print(dict(row._mapping))

        # Cek kecamatan anak Padang
        res_kec = await db.execute(text("""
            SELECT w.id, w.kode_wilayah, w.nama, p.nama as parent_nama 
            FROM wilayah_administratif w 
            JOIN wilayah_administratif p ON p.id = w.parent_id 
            WHERE p.nama ILIKE '%Padang%' 
            LIMIT 10
        """))
        print("\n--- KECAMATAN DI KOTA PADANG ---")
        for row in res_kec.fetchall():
            print(dict(row._mapping))

if __name__ == '__main__':
    asyncio.run(main())
