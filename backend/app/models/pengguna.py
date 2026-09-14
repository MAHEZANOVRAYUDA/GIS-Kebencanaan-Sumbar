from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class Pengguna(Base):
    __tablename__ = "pengguna"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    wilayah_tugas_id = Column(Integer, ForeignKey("wilayah_administratif.id"), nullable=True)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wilayah_tugas = relationship("WilayahAdministratif")

    __table_args__ = (
        CheckConstraint(
            "role IN ('operator', 'admin', 'pimpinan')",
            name="check_pengguna_role"
        ),
    )
