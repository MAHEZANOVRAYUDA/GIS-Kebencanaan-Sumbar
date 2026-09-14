from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func
from app.core.database import Base

class PeringatanCuacaBMKG(Base):
    __tablename__ = "peringatan_cuaca_bmkg"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String(120), unique=True, nullable=False)
    event = Column(String(100), nullable=False)
    headline = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    severity = Column(String(30), nullable=True)
    urgency = Column(String(30), nullable=True)
    certainty = Column(String(30), nullable=True)
    effective = Column(DateTime(timezone=True), nullable=True)
    expires = Column(DateTime(timezone=True), nullable=True)
    area_desc = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_cuaca_expires", "expires"),
        Index("idx_cuaca_severity", "severity"),
    )
