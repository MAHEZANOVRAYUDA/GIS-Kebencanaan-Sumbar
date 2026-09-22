from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_async_db
from app.models.wilayah_relasional import Provinsi, Kota, Kecamatan
from app.schemas.cascading_wilayah import ProvinsiItem, KotaItem, KecamatanItem

router = APIRouter(tags=["Cascading Wilayah (Provinsi -> Kota -> Kecamatan)"])

@router.get("/provinsi", response_model=List[ProvinsiItem])
async def list_provinsi(
    db: AsyncSession = Depends(get_async_db)
):
    """
    1. GET /provinsi
    Mengembalikan seluruh daftar provinsi (untuk mengisi combobox 1 saat halaman dimuat).
    """
    stmt = select(Provinsi).order_by(Provinsi.id.asc())
    result = await db.execute(stmt)
    provinsi_list = result.scalars().all()
    return provinsi_list


@router.get("/kota", response_model=List[KotaItem])
async def list_kota(
    id_provinsi: Optional[str] = Query(
        None, 
        description="Filter berdasarkan ID/kode provinsi induk (contoh: '13')"
    ),
    db: AsyncSession = Depends(get_async_db)
):
    """
    2. GET /kota?id_provinsi={id}
    Mengembalikan daftar kota/kabupaten yang id_provinsi-nya cocok dengan parameter.
    Hanya menampilkan kota yang valid di bawah provinsi yang dipilih (mengerucut).
    """
    if not id_provinsi:
        return []

    clean_id = str(id_provinsi).strip()
    stmt = select(Kota).where(
        or_(
            Kota.id_provinsi == clean_id,
            # Fallback jika id internal numerik 1 dipass alih-alih kode 13
            Kota.id_provinsi == "13" if clean_id in ("1", "13") else False
        )
    ).order_by(Kota.nama.asc())

    result = await db.execute(stmt)
    kota_list = result.scalars().all()
    return kota_list


@router.get("/kecamatan", response_model=List[KecamatanItem])
async def list_kecamatan(
    id_kota: Optional[str] = Query(
        None, 
        description="Filter berdasarkan ID/kode kota induk (contoh: '1371')"
    ),
    db: AsyncSession = Depends(get_async_db)
):
    """
    3. GET /kecamatan?id_kota={id}
    Mengembalikan daftar kecamatan yang id_kota-nya cocok dengan parameter.
    Sebelum kota dipilih atau jika parameter kosong, mengembalikan list kosong [].
    """
    if not id_kota:
        return []

    clean_id = str(id_kota).strip()
    stmt = select(Kecamatan).where(
        or_(
            Kecamatan.id_kota == clean_id,
            Kecamatan.id_kota == clean_id.zfill(4)
        )
    ).order_by(Kecamatan.nama.asc())

    result = await db.execute(stmt)
    kecamatan_list = result.scalars().all()
    return kecamatan_list
