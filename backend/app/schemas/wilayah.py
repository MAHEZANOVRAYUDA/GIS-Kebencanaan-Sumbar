from typing import Optional, Any, Dict, List
from datetime import datetime
from pydantic import BaseModel, Field

class WilayahBase(BaseModel):
    kode_wilayah: str
    nama: str
    level: str
    parent_id: Optional[int] = None
    populasi: Optional[int] = None

class WilayahSummary(WilayahBase):
    id: int

    class Config:
        from_attributes = True

class WilayahLookupResponse(BaseModel):
    id: int
    kode_wilayah: str
    nama: str
    level: str
    parent_id: Optional[int] = None
    parent_nama: Optional[str] = None
    populasi: Optional[int] = None
    center: Optional[Dict[str, float]] = None

class KejadianRingkas(BaseModel):
    id: int
    jenis_bencana: str
    tanggal_kejadian: datetime
    deskripsi: Optional[str] = None
    status_verifikasi: str

class WilayahDampakResponse(BaseModel):
    wilayah_id: int
    nama: str
    parent_nama: Optional[str] = None
    total_kerugian: float
    total_meninggal: int
    total_luka: int
    total_terdampak: int
    jumlah_pengungsi: int = 0
    jumlah_kejadian: int
    rumah_rusak_berat: int = 0
    rumah_rusak_sedang: int = 0
    rumah_rusak_ringan: int = 0
    fasilitas_umum_rusak: int = 0
    fasilitas_kesehatan_rusak: int = 0
    sekolah_rusak: int = 0
    terakhir_refresh: Optional[datetime] = None
    tingkat_risiko: str = "rendah"  # 'rendah' | 'sedang' | 'tinggi'
    center: Optional[Dict[str, float]] = None
    kejadian_terbaru: List[KejadianRingkas] = []
    parent_dampak: Optional[Dict[str, Any]] = None

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: Optional[Dict[str, Any]] = None
    properties: Dict[str, Any]

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]

class ErrorDetail(BaseModel):
    code: str
    message: str

class ErrorResponse(BaseModel):
    error: ErrorDetail

