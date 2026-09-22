from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Provinsi(Base):
    __tablename__ = "provinsi"

    id = Column(String(10), primary_key=True, index=True)
    nama = Column(String(150), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    kota_list = relationship("Kota", back_populates="provinsi", cascade="all, delete-orphan", order_by="Kota.nama")


class Kota(Base):
    __tablename__ = "kota"

    id = Column(String(10), primary_key=True, index=True)
    id_provinsi = Column(String(10), ForeignKey("provinsi.id", ondelete="CASCADE"), nullable=False, index=True)
    nama = Column(String(150), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    provinsi = relationship("Provinsi", back_populates="kota_list")
    kecamatan_list = relationship("Kecamatan", back_populates="kota", cascade="all, delete-orphan", order_by="Kecamatan.nama")


class Kecamatan(Base):
    __tablename__ = "kecamatan"

    id = Column(String(10), primary_key=True, index=True)
    id_kota = Column(String(10), ForeignKey("kota.id", ondelete="CASCADE"), nullable=False, index=True)
    nama = Column(String(150), nullable=False, index=True)
    wilayah_administratif_id = Column(Integer, ForeignKey("wilayah_administratif.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    kota = relationship("Kota", back_populates="kecamatan_list")
    wilayah_admin = relationship("WilayahAdministratif")
