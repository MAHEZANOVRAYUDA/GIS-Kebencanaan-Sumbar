from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base

class JalanTerputus(Base):
    __tablename__ = "jalan_terputus"

    id = Column(Integer, primary_key=True, index=True)
    geom = Column(Geometry(geometry_type="LINESTRING", srid=4326), nullable=False)
    alasan = Column(String(30), nullable=True)
    deskripsi = Column(Text, nullable=True)
    status = Column(String(20), default="aktif")
    dilaporkan_oleh = Column(Integer, ForeignKey("pengguna.id"), nullable=True)
    tanggal_lapor = Column(DateTime(timezone=True), server_default=func.now())
    tanggal_pulih = Column(DateTime(timezone=True), nullable=True)

    pelapor = relationship("Pengguna")

    __table_args__ = (
        CheckConstraint(
            "alasan IN ('longsor', 'banjir', 'jembatan_putus', 'kerusakan_jalan', 'lainnya')",
            name="check_jalan_alasan"
        ),
        CheckConstraint(
            "status IN ('aktif', 'sebagian', 'pulih')",
            name="check_jalan_status"
        ),
        Index("idx_jalan_terputus_geom", "geom", postgresql_using="gist"),
        Index("idx_jalan_terputus_status", "status", postgresql_where=(status == "aktif")),
    )
