from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base

class PoskoEvakuasi(Base):
    __tablename__ = "posko_evakuasi"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(150), nullable=False)
    jenis = Column(String(30), nullable=True)
    lokasi = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    kapasitas = Column(Integer, nullable=True)
    fasilitas = Column(ARRAY(String), nullable=True)
    kontak_pic = Column(String(100), nullable=True)
    kontak_telepon = Column(String(30), nullable=True)
    status = Column(String(20), default="aktif", index=True)
    wilayah_id = Column(Integer, ForeignKey("wilayah_administratif.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    wilayah = relationship("WilayahAdministratif")

    __table_args__ = (
        CheckConstraint(
            "jenis IN ('posko_utama', 'titik_kumpul', 'shelter_sementara', 'fasilitas_kesehatan', 'shelter_tes_tea', 'sirine_tsunami')",
            name="check_posko_jenis"
        ),
        CheckConstraint(
            "status IN ('aktif', 'penuh', 'nonaktif')",
            name="check_posko_status"
        ),
        Index("idx_posko_lokasi", "lokasi", postgresql_using="gist"),
    )
