from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    pengguna_id = Column(Integer, ForeignKey("pengguna.id"), nullable=True)
    aksi = Column(String(50), nullable=False)
    tabel_target = Column(String(50), nullable=True)
    record_id = Column(Integer, nullable=True)
    detail = Column(JSONB, nullable=True)
    ip_address = Column(INET, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pengguna = relationship("Pengguna")
