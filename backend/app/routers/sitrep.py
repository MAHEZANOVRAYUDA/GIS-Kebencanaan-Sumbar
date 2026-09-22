from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timezone

from app.core.database import get_async_db

router = APIRouter(prefix="/admin/sitrep", tags=["Laporan Situasi (SITREP) BNPB/BPBD"])

@router.get("")
async def get_situation_report(db: AsyncSession = Depends(get_async_db)):
    """
    Menghasilkan Dokumen Laporan Situasi (SITREP) Resmi Berstandar BNPB
    berdasarkan data riil terkini di basis data PostGIS (CKAN BPBD, BMKG, dan Operator Lapangan).
    """
    # 1. Agregasi Dampak Keseluruhan
    dampak_q = text("""
        SELECT 
            COALESCE(SUM(korban_meninggal), 0) AS meninggal,
            COALESCE(SUM(korban_hilang), 0) AS hilang,
            COALESCE(SUM(korban_luka), 0) AS luka,
            COALESCE(SUM(jumlah_pengungsi), 0) AS pengungsi,
            COALESCE(SUM(penduduk_terdampak), 0) AS terdampak,
            COALESCE(SUM(kerugian_rp), 0) AS kerugian_rp
        FROM data_dampak_bencana;
    """)
    dampak_res = (await db.execute(dampak_q)).fetchone()

    total_meninggal = int(dampak_res.meninggal) if dampak_res else 0
    total_hilang = int(dampak_res.hilang) if dampak_res else 0
    total_luka = int(dampak_res.luka) if dampak_res else 0
    total_pengungsi = int(dampak_res.pengungsi) if dampak_res else 0
    total_terdampak = int(dampak_res.terdampak) if dampak_res else 0
    total_kerugian = float(dampak_res.kerugian_rp) if dampak_res else 0.0

    # 2. Status Posko Pengungsi, Faskes, TES/TEA & Sirine Tsunami
    posko_q = text("""
        SELECT 
            COUNT(id) AS total,
            COUNT(CASE WHEN status = 'aktif' AND jenis IN ('posko_pengungsi', 'posko_utama', 'titik_kumpul', 'shelter_sementara') THEN 1 END) AS posko_pengungsi_aktif,
            COUNT(CASE WHEN status = 'aktif' AND jenis = 'posko_pengungsi' THEN 1 END) AS kantor_camat_count,
            COUNT(CASE WHEN status = 'aktif' AND jenis = 'fasilitas_kesehatan' THEN 1 END) AS faskes_count,
            COUNT(CASE WHEN status = 'aktif' AND jenis = 'shelter_tes_tea' THEN 1 END) AS total_tes,
            COUNT(CASE WHEN jenis NOT IN ('sirine_tsunami') AND status = 'aktif' THEN 1 END) AS total_titik_evakuasi,
            COALESCE(SUM(CASE WHEN jenis NOT IN ('sirine_tsunami') AND status = 'aktif' THEN kapasitas ELSE 0 END), 0) AS kapasitas_jiwa,
            COUNT(CASE WHEN jenis = 'sirine_tsunami' THEN 1 END) AS total_sirine,
            COUNT(CASE WHEN jenis = 'sirine_tsunami' AND status = 'aktif' THEN 1 END) AS sirine_aktif,
            COUNT(CASE WHEN jenis = 'sirine_tsunami' AND status != 'aktif' THEN 1 END) AS sirine_pemeliharaan
        FROM posko_evakuasi;
    """)
    posko_res = (await db.execute(posko_q)).fetchone()

    posko_pengungsi = int(posko_res.posko_pengungsi_aktif) if posko_res else 0
    kantor_camat_count = int(posko_res.kantor_camat_count) if posko_res else 0
    faskes_count = int(posko_res.faskes_count) if posko_res else 0
    total_tes = int(posko_res.total_tes) if posko_res else 0
    total_titik_evakuasi = int(posko_res.total_titik_evakuasi) if posko_res else 0
    kapasitas_posko = int(posko_res.kapasitas_jiwa) if posko_res else 0
    total_sirine = int(posko_res.total_sirine) if posko_res else 0
    sirine_aktif = int(posko_res.sirine_aktif) if posko_res else 0
    sirine_pemeliharaan = int(posko_res.sirine_pemeliharaan) if posko_res else 0

    # 3. Status Blokade Jalan Terputus
    jalan_q = text("SELECT COUNT(id) FROM jalan_terputus WHERE status = 'aktif';")
    jalan_aktif = (await db.execute(jalan_q)).scalar() or 0

    # 4. Gempa Terkini
    gempa_q = text("""
        SELECT magnitude, kedalaman_km, wilayah_teks, waktu_kejadian, potensi_tsunami
        FROM gempa_bmkg
        ORDER BY waktu_kejadian DESC NULLS LAST LIMIT 1;
    """)
    gempa_res = (await db.execute(gempa_q)).fetchone()

    # 5. Top 5 Wilayah Paling Terdampak (Agregasi Bersih per Kabupaten / Kota)
    top_wilayah_q = text("""
        SELECT 
            COALESCE(kab.nama, w.nama) AS nama,
            COALESCE(SUM(d.korban_meninggal), 0) AS meninggal,
            COALESCE(SUM(d.jumlah_pengungsi), 0) AS pengungsi,
            COALESCE(SUM(d.kerugian_rp), 0) AS kerugian_rp
        FROM data_dampak_bencana d
        JOIN wilayah_administratif w ON d.wilayah_id = w.id
        LEFT JOIN wilayah_administratif kab ON w.parent_id = kab.id AND w.level = 'kecamatan'
        GROUP BY COALESCE(kab.nama, w.nama)
        ORDER BY meninggal DESC, pengungsi DESC, kerugian_rp DESC
        LIMIT 5;
    """)
    top_rows = (await db.execute(top_wilayah_q)).fetchall()
    top_wilayah = [
        {
            "nama": r.nama,
            "meninggal": int(r.meninggal),
            "pengungsi": int(r.pengungsi),
            "kerugian_miliar": round(float(r.kerugian_rp) / 1_000_000_000, 2)
        }
        for r in top_rows
    ]

    now_wib = datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M WIB")

    # 6. Susun Teks Siap Kirim WhatsApp (One-Click Copy untuk Forkopimda)
    wa_text = f"""*LAPORAN SITUASI KEBENCANAAN (SITREP) PROVINSI SUMATERA BARAT*
*BPBD PROV. SUMBAR & LPPM UPI YPTK PADANG*
_Waktu Pembaruan: {now_wib}_

*1. RINGKASAN DAMPAK AKUMULATIF:*
- Meninggal Dunia : {total_meninggal:,} Jiwa
- Hilang : {total_hilang:,} Jiwa
- Luka-luka : {total_luka:,} Jiwa
- Pengungsi : {total_pengungsi:,} Jiwa
- Total Terdampak : {total_terdampak:,} Jiwa
- Estimasi Kerugian Finansial : Rp {total_kerugian/1_000_000_000:,.2f} Miliar

*2. KESIAPAN MITIGASI & EVAKUASI:*
- Posko Pengungsi Aktif : {posko_pengungsi} Titik ({kantor_camat_count} Kantor Camat + Posko Utama)
- Posko Faskes Medis : {faskes_count} Unit
- Shelter TES Tsunami : {total_tes} Gedung Evakuasi Vertikal
- Total Titik Evakuasi : {total_titik_evakuasi} Lokasi (Kapasitas: {kapasitas_posko:,} Jiwa)
- EWS Sirine Tsunami : {sirine_aktif} Siaga Aktif, {sirine_pemeliharaan} Pemeliharaan (Total: {total_sirine} Unit)
- Ruas Jalan Terputus : {jalan_aktif} Titik (Rute Evakuasi Dialihkan Otomatis)

*3. PRIORITAS PENANGANAN TERTINGGI (KABUPATEN/KOTA):*"""
    for idx, tw in enumerate(top_wilayah, 1):
        wa_text += f"\n{idx}. *{tw['nama']}*: {tw['meninggal']} MD, {tw['pengungsi']:,} Pengungsi (Kerugian ~Rp {tw['kerugian_miliar']}M)"

    if gempa_res:
        wa_text += f"\n\n*4. SENSOR REAL-TIME BMKG:* M{gempa_res.magnitude} Kedalaman {gempa_res.kedalaman_km}km ({gempa_res.wilayah_teks})"

    wa_text += "\n\n_Dashboard Navigasi & Monitoring Peta: https://gis-kebencanaan.sumbarprov.go.id_"

    return {
        "metadata": {
            "judul": "Situation Report (SITREP) Penanggulangan Bencana Provinsi Sumatera Barat",
            "waktu_generate": now_wib,
            "institusi": "BPBD Provinsi Sumatera Barat & Riset LPPM UPI YPTK Padang",
            "klasifikasi": "Operasional Terpadu Forkopimda"
        },
        "kpi": {
            "total_meninggal": total_meninggal,
            "total_hilang": total_hilang,
            "total_luka": total_luka,
            "total_pengungsi": total_pengungsi,
            "total_terdampak": total_terdampak,
            "total_kerugian_miliar": round(total_kerugian / 1_000_000_000, 2),
            "posko_aktif": posko_pengungsi,
            "posko_pengungsi_count": posko_pengungsi,
            "kantor_camat_count": kantor_camat_count,
            "faskes_count": faskes_count,
            "total_titik_evakuasi": total_titik_evakuasi,
            "kapasitas_posko": kapasitas_posko,
            "shelter_tes_count": total_tes,
            "sirine_aktif": sirine_aktif,
            "sirine_pemeliharaan": sirine_pemeliharaan,
            "sirine_total": total_sirine,
            "jalan_terputus_aktif": jalan_aktif
        },
        "wilayah_prioritas": top_wilayah,
        "gempa_terakhir": {
            "magnitude": float(gempa_res.magnitude) if gempa_res else None,
            "kedalaman": float(gempa_res.kedalaman_km) if gempa_res else None,
            "lokasi": gempa_res.wilayah_teks if gempa_res else None,
        } if gempa_res else None,
        "whatsapp_formatted": wa_text
    }
