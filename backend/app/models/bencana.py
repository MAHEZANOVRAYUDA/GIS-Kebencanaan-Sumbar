from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base

class KejadianBencana(Base):
    __tablename__ = "kejadian_bencana"

    id = Column(Integer, primary_key=True, index=True)
    jenis_bencana = Column(String(30), nullable=False, index=True)
    tanggal_kejadian = Column(DateTime(timezone=True), nullable=False, index=True)
    wilayah_id = Column(Integer, ForeignKey("wilayah_administratif.id"), nullable=True, index=True)
    lokasi = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    deskripsi = Column(Text, nullable=True)
    sumber_data = Column(String(50), default="operator_bpbd")
    status_verifikasi = Column(String(20), default="terverifikasi")
    dibuat_oleh = Column(Integer, ForeignKey("pengguna.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    wilayah = relationship("WilayahAdministratif")
    dampak = relationship("DataDampakBencana", back_populates="kejadian", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "jenis_bencana IN ('gempa','tsunami','banjir','longsor','erupsi','angin_puting_beliung','kebakaran','lainnya')",
            name="check_jenis_bencana"
        ),
        CheckConstraint(
            "status_verifikasi IN ('terverifikasi','menunggu','ditolak')",
            name="check_status_verifikasi"
        ),
        Index("idx_kejadian_lokasi", "lokasi", postgresql_using="gist"),
    )


class DataDampakBencana(Base):
    __tablename__ = "data_dampak_bencana"

    id = Column(Integer, primary_key=True, index=True)
    kejadian_id = Column(Integer, ForeignKey("kejadian_bencana.id", ondelete="CASCADE"), nullable=True, index=True)
    wilayah_id = Column(Integer, ForeignKey("wilayah_administratif.id"), nullable=False, index=True)
    
    korban_meninggal = Column(Integer, default=0)
    korban_hilang = Column(Integer, default=0)
    korban_luka = Column(Integer, default=0)
    jumlah_pengungsi = Column(Integer, default=0)
    kerugian_rp = Column(Numeric(18, 2), default=0)
    
    rumah_rusak_berat = Column(Integer, default=0)
    rumah_rusak_sedang = Column(Integer, default=0)
    rumah_rusak_ringan = Column(Integer, default=0)
    fasilitas_umum_rusak = Column(Integer, default=0)
    fasilitas_kesehatan_rusak = Column(Integer, default=0)
    sekolah_rusak = Column(Integer, default=0)
    penduduk_terdampak = Column(Integer, default=0)
    catatan = Column(Text, nullable=True)
    
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    kejadian = relationship("KejadianBencana", back_populates="dampak")
    wilayah = relationship("WilayahAdministratif")
