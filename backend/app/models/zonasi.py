from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base

class ZonasiTsunami(Base):
    __tablename__ = "zonasi_tsunami"

    id = Column(Integer, primary_key=True, index=True)
    wilayah_id = Column(Integer, ForeignKey("wilayah_administratif.id"), nullable=True, index=True)
    nama_zona = Column(String(150), nullable=False)
    zona = Column(String(30), nullable=False, index=True)  # 'merah', 'kuning', 'hijau'
    tingkat_bahaya = Column(String(50), nullable=False)   # 'KRB III (Bahaya Ekstrem)', 'KRB II (Bahaya Tinggi)', 'KRB I (Waspada)', 'Zona Hijau (Aman)'
    kedalaman_rendaman = Column(String(100), nullable=True) # '> 3.0 – 8.0+ Meter', '1.5 – 3.0 Meter', dll.
    deskripsi = Column(Text, nullable=True)
    rekomendasi = Column(Text, nullable=True)

    # SRID 4326 MultiPolygon zonasi tsunami
    geom = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    wilayah = relationship("WilayahAdministratif")

    __table_args__ = (
        CheckConstraint(
            "zona IN ('merah', 'kuning', 'hijau')",
            name="check_zonasi_warna"
        ),
        Index("idx_zonasi_tsunami_geom", "geom", postgresql_using="gist"),
    )
