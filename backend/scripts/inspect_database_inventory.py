import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import sync_engine
from sqlalchemy import text

print("=== DETAIL INVENTARISASI DATA SPASIAL GIS KEBENCANAAN SUMBAR ===")
with sync_engine.connect() as conn:
    print("\n1. Wilayah Administratif:")
    rows = conn.execute(text("SELECT level, COUNT(*) FROM wilayah_administratif GROUP BY level ORDER BY level")).fetchall()
    for r in rows:
        print(f"   - Level {r[0]}: {r[1]} wilayah")
    
    kab_rows = conn.execute(text("SELECT kode_wilayah, nama FROM wilayah_administratif WHERE level = 'kabupaten' ORDER BY nama")).fetchall()
    print(f"   - Daftar Kabupaten/Kota di Sumbar ({len(kab_rows)} entitas):")
    for k in kab_rows:
        print(f"     * [{k[0]}] {k[1]}")

    print("\n2. Posko & Shelter Evakuasi:")
    p_rows = conn.execute(text("SELECT jenis, COUNT(*) FROM posko_evakuasi GROUP BY jenis")).fetchall()
    for pr in p_rows:
        print(f"   - Jenis '{pr[0]}': {pr[1]} lokasi")
    
    samples = conn.execute(text("SELECT nama, jenis, kapasitas, ST_AsText(lokasi) FROM posko_evakuasi LIMIT 5")).fetchall()
    print("   - Sampel Shelter & Sirine:")
    for s in samples:
        print(f"     * {s[0]} ({s[1]}) - Kapasitas: {s[2]} orang | Koordinat: {s[3]}")

    print("\n3. Data Kejadian Bencana & Dampak:")
    b_rows = conn.execute(text("""
        SELECT kb.jenis_bencana, COUNT(kb.id), 
               COALESCE(SUM(dd.korban_meninggal), 0), 
               COALESCE(SUM(dd.korban_luka), 0),
               COALESCE(SUM(dd.jumlah_pengungsi), 0),
               COALESCE(SUM(dd.kerugian_rp), 0)
        FROM kejadian_bencana kb
        LEFT JOIN data_dampak_bencana dd ON kb.id = dd.kejadian_id
        GROUP BY kb.jenis_bencana
    """)).fetchall()
    for b in b_rows:
        print(f"   - {b[0]}: {b[1]} kejadian | Meninggal: {b[2]}, Luka: {b[3]}, Mengungsi: {b[4]:,} | Kerugian: Rp {b[5]:,.0f}")

    print("\n4. Ruas Jalan Terputus (Simulasi & Aktual Bencana):")
    j_rows = conn.execute(text("SELECT id, alasan, status, deskripsi, ST_Length(geom::geography) FROM jalan_terputus")).fetchall()
    for j in j_rows:
        print(f"   - [ID {j[0]}] {j[1]} (Status: {j[2]}) | {j[3][:50]} | Panjang: {j[4]:.1f} m")

    print("\n5. Cache BMKG Gempa Terkini:")
    g_rows = conn.execute(text("SELECT external_id, magnitude, kedalaman_km, wilayah_teks, waktu_kejadian, potensi_tsunami, synced_at FROM gempa_bmkg ORDER BY waktu_kejadian DESC LIMIT 3")).fetchall()
    for g in g_rows:
        print(f"   - Gempa M{g[1]} Kedalaman {g[2]}km | {g[3]} | Waktu: {g[4]} | Potensi Tsunami: {g[5]} | Synced: {g[6]}")

    print("\n6. Cache BMKG Peringatan Cuaca Ekstrem:")
    c_rows = conn.execute(text("SELECT identifier, event, headline, severity, area_desc, created_at FROM peringatan_cuaca_bmkg ORDER BY id DESC LIMIT 5")).fetchall()
    for c in c_rows:
        print(f"   - [{c[3]}] {c[1]} - {c[4]} | Headline: {c[2]}")
