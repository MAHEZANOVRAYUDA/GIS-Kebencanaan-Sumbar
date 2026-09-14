from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.core.database import Base

class WilayahAdministratif(Base):
    __tablename__ = "wilayah_administratif"

    id = Column(Integer, primary_key=True, index=True)
    kode_wilayah = Column(String(20), unique=True, nullable=False, index=True)
    nama = Column(String(150), nullable=False)
    level = Column(String(20), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("wilayah_administratif.id"), nullable=True, index=True)
    populasi = Column(Integer, nullable=True)
    
    # SRID 4326 (WGS84) MultiPolygon
    geom = Column(Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Self-referencing relationship
    parent = relationship("WilayahAdministratif", remote_side=[id], backref="children")

    __table_args__ = (
        CheckConstraint(
            "level IN ('provinsi', 'kabupaten', 'kecamatan', 'nagari')",
            name="check_wilayah_level"
        ),
        Index("idx_wilayah_geom", "geom", postgresql_using="gist"),
    )
