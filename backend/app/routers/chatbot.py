import re
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_async_db

logger = logging.getLogger("chatbot")
router = APIRouter(prefix="/bot", tags=["Asisten Siaga Bencana (Chatbot AI)"])

class ChatRequest(BaseModel):
    pesan: str
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    wilayah_id: Optional[int] = None

class LocationRecommendation(BaseModel):
    nama: str
    tipe: str  # posko, shelter_tes, sirine, gempa
    lat: float
    lng: float
    jarak_km: Optional[float] = None
    deskripsi: Optional[str] = None

class ChatResponse(BaseModel):
    jawaban: str
    kategori: str
    rekomendasi_lokasi: Optional[LocationRecommendation] = None
    saran_pertanyaan: List[str]

@router.post("/chat", response_model=ChatResponse)
async def chat_disaster_assistant(
    req: ChatRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Endpoint Asisten Virtual Siaga Bencana Sumatera Barat.
    Menjawab pertanyaan publik / petugas dengan data riil PostGIS,
    BMKG TEWS gempa, dan peringatan cuaca BMKG Minangkabau.
    """
    query = req.pesan.lower().strip()
    user_lat = req.user_lat or -0.9471  # Default Padang
    user_lng = req.user_lng or 100.4172

    # 1. Pertanyaan seputar Gempa Bumi
    if any(k in query for k in ["gempa", "seismik", "magnitudo", "lindur", "guncangan", "megathrust"]):
        res = await db.execute(text("""
            SELECT external_id, magnitude, kedalaman_km, wilayah_teks, waktu_kejadian, potensi_tsunami,
                   ST_Y(lokasi) AS lat, ST_X(lokasi) AS lon
            FROM gempa_bmkg
            ORDER BY waktu_kejadian DESC
            LIMIT 1;
        """))
        gempa = res.first()
        if gempa:
            tsunami_txt = "⚠️ BERPOTENSI TSUNAMI! Segera jauhi pantai menuju tempat tinggi/shelter TES." if gempa.potensi_tsunami else "✅ Tidak berpotensi tsunami menurut BMKG."
            jawaban = (
                f"Laporan Sensor BMKG Terkini:\n"
                f"• Magnitudo: M{gempa.magnitude}\n"
                f"• Kedalaman: {gempa.kedalaman_km} km\n"
                f"• Episentrum: {gempa.wilayah_teks}\n"
                f"• Waktu: {gempa.waktu_kejadian.strftime('%d/%m/%Y %H:%M WIB') if gempa.waktu_kejadian else 'Baru saja'}\n"
                f"• Status: {tsunami_txt}\n\n"
                f"Instruksi: Berlindung di bawah meja kokoh saat gempa berlangsung, lindungi kepala, "
                f"dan keluar ke area terbuka setelah getaran mereda. Jangan gunakan lift!"
            )
            rekomendasi = LocationRecommendation(
                nama=f"Episentrum Gempa M{gempa.magnitude} ({gempa.wilayah_teks})",
                tipe="gempa",
                lat=float(gempa.lat) if gempa.lat else -0.85,
                lng=float(gempa.lon) if gempa.lon else 100.4,
                deskripsi=f"Kedalaman {gempa.kedalaman_km} km"
            )
            return ChatResponse(
                jawaban=jawaban,
                kategori="gempa",
                rekomendasi_lokasi=rekomendasi,
                saran_pertanyaan=[
                    "Di mana shelter tsunami terdekat?",
                    "Bagaimana SOP evakuasi mandiri gempa megathrust?",
                    "Cek status cuaca hari ini"
                ]
            )

    # 2. Pertanyaan seputar Shelter / Posko / Tempat Evakuasi
    if any(k in query for k in ["shelter", "posko", "evakuasi", "mengungsi", "aman", "kantor camat", "tes"]):
        # Cari shelter TES vertikal atau posko terdekat
        res_posko = await db.execute(text("""
            SELECT 
                id, nama, jenis, kapasitas,
                ST_Y(lokasi) AS lat, ST_X(lokasi) AS lon,
                ROUND((ST_Distance(lokasi::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) / 1000)::numeric, 2) AS jarak_km
            FROM posko_evakuasi
            WHERE status = 'aktif'
            ORDER BY ST_Distance(lokasi::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) ASC
            LIMIT 3;
        """), {"lat": user_lat, "lon": user_lng})
        posko_list = res_posko.fetchall()

        if posko_list:
            top_posko = posko_list[0]
            tipe_label = "Gedung Evakuasi Vertikal (TES)" if top_posko.jenis in ("shelter_tes_tea", "shelter_sementara") else "Posko Evakuasi"
            kap = top_posko.kapasitas or 500
            jawaban = (
                f"Rekomendasi Tempat Evakuasi Terdekat dari posisi Anda:\n\n"
                f"1. 🏢 {top_posko.nama} ({tipe_label})\n"
                f"   • Jarak: ~{top_posko.jarak_km} km\n"
                f"   • Kapasitas: {kap:,} jiwa\n\n"
            )
            if len(posko_list) > 1:
                p2 = posko_list[1]
                kap2 = p2.kapasitas or 300
                jawaban += f"2. Alternatif: {p2.nama} (~{p2.jarak_km} km, kapasitas {kap2:,} jiwa)\n\n"

            jawaban += (
                "Petunjuk:\n"
                "• Untuk ancaman Tsunami: Utamakan evakuasi jalan kaki / lari menuju Gedung TES terdekat.\n"
                "• Klik tombol 'Arahkan Peta' di bawah untuk melihat titik posko di peta."
            )

            rekomendasi = LocationRecommendation(
                nama=top_posko.nama,
                tipe=top_posko.jenis or "posko",
                lat=float(top_posko.lat),
                lng=float(top_posko.lon),
                jarak_km=float(top_posko.jarak_km),
                deskripsi=f"Kapasitas {kap:,} jiwa"
            )
            return ChatResponse(
                jawaban=jawaban,
                kategori="shelter",
                rekomendasi_lokasi=rekomendasi,
                saran_pertanyaan=[
                    "Berapa estimasi waktu jalan kaki ke shelter ini?",
                    "Bagaimana alur evakuasi tsunami Padang?",
                    "Cek nomor kontak darurat BPBD"
                ]
            )

    # 3. Pertanyaan seputar Cuaca & Banjir / Galodo
    if any(k in query for k in ["cuaca", "hujan", "banjir", "galodo", "lahar", "angin"]):
        res_cuaca = await db.execute(text("""
            SELECT identifier, event, headline, severity, area_desc, created_at
            FROM peringatan_cuaca_bmkg
            ORDER BY id DESC
            LIMIT 2;
        """))
        alerts = res_cuaca.fetchall()
        if alerts:
            c = alerts[0]
            jawaban = (
                f"Peringatan Dini Cuaca BMKG Minangkabau:\n\n"
                f"• Peristiwa: {c.event}\n"
                f"• Status/Tingkat: {c.severity.upper()}\n"
                f"• Rangkuman: {c.headline}\n"
                f"• Wilayah Terdampak: {c.area_desc}\n\n"
                f"Imbauan: Warga di sekitar daerah aliran sungai (DAS) Gunung Marapi, Singgalang, "
                f"serta lereng curam di Agam, Tanah Datar, dan Padang Panjang diminta waspada galodo (lahar dingin) "
                f"apabila hujan lebat lebih dari 1 jam."
            )
        else:
            jawaban = (
                "Kondisi Cuaca Umum Sumatera Barat:\n"
                "Saat ini tidak ada peringatan badai ekstrem level merah dari BMKG Minangkabau. "
                "Tetap pantau curah hujan berkala di wilayah dataran tinggi."
            )

        return ChatResponse(
            jawaban=jawaban,
            kategori="cuaca",
            saran_pertanyaan=[
                "Di mana wilayah rawan banjir/longsor di Sumbar?",
                "Cek status gempa terbaru BMKG",
                "Bagaimana cara lapor kejadian bencana?"
            ]
        )

    # 4. Pertanyaan seputar Kontak Darurat / Bantuan
    if any(k in query for k in ["kontak", "telepon", "darurat", "call center", "nomor", "bantuan"]):
        jawaban = (
            "📞 Kontak Darurat Penanggulangan Bencana Sumatera Barat:\n\n"
            "• Pusdalops PB BPBD Sumbar: (0751) 8950004 / WhatsApp: 0811-666-0113\n"
            "• BPBD Kota Padang (Siaga 24 Jam): 112 atau (0751) 770000\n"
            "• Basarnas Kota Padang: 115 atau (0751) 480115\n"
            "• Ambulans / PMI Sumbar: 118 / (0751) 22222\n"
            "• Kepolisian / Polresta: 110\n\n"
            "Simpan nomor ini untuk situasi tanggap darurat."
        )
        return ChatResponse(
            jawaban=jawaban,
            kategori="kontak",
            saran_pertanyaan=[
                "Di mana shelter evakuasi tsunami terdekat?",
                "Bagaimana status gempa terkini?",
                "Tampilkan peta risiko bencana"
            ]
        )

    # 5. Default Response / Panduan Umum
    jawaban = (
        "Halo! Saya Asisten Virtual Siaga Bencana Provinsi Sumatera Barat. "
        "Saya dapat membantu Anda memberikan informasi terkini secara langsung:\n\n"
        "1. 🧭 Menemukan Shelter TES Vertikal & Posko Pengungsi Terdekat\n"
        "2. 📍 Pemantauan Gempa Bumi Real-Time BMKG & Potensi Tsunami\n"
        "3. 🌧️ Peringatan Dini Cuaca Ekstrem & Bahaya Banjir/Galodo\n"
        "4. 📋 Panduan Alur Evakuasi Cepat (Tsunami vs Non-Tsunami)\n\n"
        "Silakan ketik pertanyaan Anda atau pilih tombol cepat di bawah."
    )
    return ChatResponse(
        jawaban=jawaban,
        kategori="umum",
        saran_pertanyaan=[
            "Di mana shelter tsunami terdekat?",
            "Cek gempa bumi terkini BMKG",
            "Peringatan cuaca ekstrem hari ini",
            "Nomor kontak darurat BPBD"
        ]
    )
