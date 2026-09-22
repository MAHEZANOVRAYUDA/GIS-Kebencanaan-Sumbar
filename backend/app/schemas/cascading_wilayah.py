from pydantic import BaseModel, Field
from typing import List, Optional

class ProvinsiItem(BaseModel):
    id: str = Field(..., description="Kode wilayah Provinsi (contoh: '13')")
    nama: str = Field(..., description="Nama Provinsi (contoh: 'Sumatera Barat')")

    class Config:
        from_attributes = True

class KotaItem(BaseModel):
    id: str = Field(..., description="Kode wilayah Kota/Kabupaten (contoh: '1371')")
    id_provinsi: str = Field(..., description="Kode Provinsi induk (contoh: '13')")
    nama: str = Field(..., description="Nama Kota/Kabupaten (contoh: 'Kota Padang')")

    class Config:
        from_attributes = True

class KecamatanItem(BaseModel):
    id: str = Field(..., description="Kode wilayah Kecamatan (contoh: '137101')")
    id_kota: str = Field(..., description="Kode Kota/Kabupaten induk (contoh: '1371')")
    nama: str = Field(..., description="Nama Kecamatan (contoh: 'Padang Barat')")
    wilayah_administratif_id: Optional[int] = Field(None, description="ID entitas spasial PostGIS")

    class Config:
        from_attributes = True
