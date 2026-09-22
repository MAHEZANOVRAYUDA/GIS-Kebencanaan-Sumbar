from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union

from app.core.database import get_async_db
from app.services.routing_service import kalkulasi_evakuasi_darurat, get_nearest_posko, classify_disaster_flow

router = APIRouter(prefix="", tags=["Routing Evakuasi & Posko"])

class EvakuasiRequest(BaseModel):
    lat: Optional[float] = Field(default=None, ge=-10.0, le=10.0, description="Lintang titik pengguna")
    lon: Optional[float] = Field(default=None, ge=90.0, le=145.0, description="Bujur titik pengguna")
    kecamatan_id: Optional[Union[int, str]] = Field(default=None, description="ID atau kode kecamatan hasil cascading combobox")
    jenis_bencana: Optional[str] = Field(default="gempa", description="tsunami | gempa | galodo | banjir | longsor | erupsi")
    moda: Optional[str] = Field(default="mobil", description="Moda transportasi: mobil | motor | jalan_kaki")

class InstruksiLangkah(BaseModel):
    teks: str
    jarak_m: int
    nama_jalan: Optional[str] = ""

class PoskoInfo(BaseModel):
    id: int
    nama: str
    alamat: Optional[str] = None
    jenis: Optional[str] = None
    kapasitas: Optional[int] = None
    fasilitas: Optional[List[str]] = []
    kontak_pic: Optional[str] = None
    kontak_telepon: Optional[str] = None
    lat: float
    lon: float

class EvakuasiResponse(BaseModel):
    alur: str = Field(..., description="ALUR_A (Tsunami) | ALUR_B (Non-Tsunami)")
    jenis_bencana: str
    posko: PoskoInfo
    jarak_km: float
    estimasi_menit: int
    geometry: Dict[str, Any]
    instruksi: List[InstruksiLangkah]
    menghindari_blokade: bool
    is_fallback: bool = False
    fallback_info: Optional[Dict[str, Any]] = None
    zonasi_info: Optional[Dict[str, Any]] = None
    kecamatan_id: Optional[Union[int, str]] = None

@router.post("/routing/evakuasi", response_model=EvakuasiResponse)
async def evakuasi_darurat(
    payload: EvakuasiRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Endpoint Inti Evakuasi Terpadu:
    - ALUR A (Tsunami): Rekomendasi shelter di luar zona bahaya / shelter vertikal TES
    - ALUR B (Non-Tsunami: Galodo & Gempa): Posko terdekat dalam kecamatan yang sama
    - Fallback cerdas jika kecamatan belum memiliki posko aktif
    - Menghitung rute turn-by-turn turn sadar blokade jalan (OSRM / Valhalla)
    """
    try:
        hasil = await kalkulasi_evakuasi_darurat(
            db=db,
            lat=payload.lat,
            lon=payload.lon,
            kecamatan_id=payload.kecamatan_id,
            jenis_bencana=payload.jenis_bencana or "gempa",
            moda=payload.moda or "mobil"
        )
        return hasil
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "POSKO_NOT_FOUND",
                    "message": str(e)
                }
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": {
                    "code": "ROUTING_FAILED",
                    "message": f"Gagal menghitung rute evakuasi: {str(e)}"
                }
            }
        )

@router.get("/routing/bencana-aktif")
async def cek_status_bencana_aktif(
    db: AsyncSession = Depends(get_async_db)
):
    """
    Mendeteksi status ancaman bencana aktif di Sumatera Barat secara real-time:
    - Cek apakah ada gempa dengan potensi tsunami (Alur A)
    - Cek peringatan dini cuaca ekstrem / galodo lahar dingin Marapi (Alur B)
    - Rekomendasi alur default untuk tombol Evakuasi Sekarang
    """
    # 1. Cek potensi tsunami gempa BMKG
    tsunami_q = text("""
        SELECT external_id, magnitude, wilayah_teks, waktu_kejadian, potensi_tsunami
        FROM gempa_bmkg
        WHERE potensi_tsunami = true AND waktu_kejadian >= now() - INTERVAL '24 hours'
        ORDER BY waktu_kejadian DESC LIMIT 1;
    """)
    tsunami_row = (await db.execute(tsunami_q)).fetchone()

    # 2. Cek peringatan cuaca / lahar dingin
    cuaca_q = text("""
        SELECT identifier, event, headline, severity, area_desc
        FROM peringatan_cuaca_bmkg
        WHERE expires >= now() OR created_at >= now() - INTERVAL '12 hours'
        ORDER BY id DESC LIMIT 1;
    """)
    cuaca_row = (await db.execute(cuaca_q)).fetchone()

    if tsunami_row:
        return {
            "status_siaga": "BAHAYA_TSUNAMI",
            "alur_rekomendasi": "ALUR_A",
            "jenis_bencana_aktif": "tsunami",
            "keterangan": f"Peringatan Dini Tsunami Aktif: Gempa M{tsunami_row.magnitude} di {tsunami_row.wilayah_teks}",
            "data": {
                "gempa_id": tsunami_row.external_id,
                "magnitude": float(tsunami_row.magnitude),
                "waktu": tsunami_row.waktu_kejadian.isoformat() if tsunami_row.waktu_kejadian else None
            }
        }
    elif cuaca_row and ("galodo" in (cuaca_row.event or "").lower() or "lahar" in (cuaca_row.headline or "").lower()):
        return {
            "status_siaga": "SIAGA_GALODO",
            "alur_rekomendasi": "ALUR_B",
            "jenis_bencana_aktif": "galodo",
            "keterangan": f"Peringatan Banjir Lahar Dingin (Galodo): {cuaca_row.headline}",
            "data": {
                "event": cuaca_row.event,
                "area": cuaca_row.area_desc
            }
        }
    else:
        return {
            "status_siaga": "NORMAL_SIAGA",
            "alur_rekomendasi": "ALUR_B",
            "jenis_bencana_aktif": "gempa",
            "keterangan": "Tidak ada peringatan tsunami seketika. Siaga darurat gempa & banjir lokal aktif.",
            "data": None
        }



