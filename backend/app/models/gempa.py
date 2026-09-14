from sqlalchemy import Column, Integer, String, Boolean, Numeric, DateTime, Index
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.core.database import Base

class GempaBmkg(Base):
    __tablename__ = "gempa_bmkg"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(50), unique=True, nullable=True)
    magnitude = Column(Numeric(3, 1), nullable=True)
    kedalaman_km = Column(Numeric(6, 2), nullable=True)
    lokasi = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    wilayah_teks = Column(String(200), nullable=True)
    waktu_kejadian = Column(DateTime(timezone=True), nullable=True, index=True)
    potensi_tsunami = Column(Boolean, default=False)
    dirasakan = Column(Boolean, default=False)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_gempa_lokasi", "lokasi", postgresql_using="gist"),
    )
