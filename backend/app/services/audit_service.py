from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
import logging
from app.models.audit import AuditLog

logger = logging.getLogger("audit")

async def record_audit(
    db: AsyncSession,
    pengguna_id: Optional[int],
    aksi: str,
    tabel_target: str,
    record_id: Optional[int] = None,
    detail: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> None:
    """
    Mencatat jejak aktivitas mutasi data oleh pengguna / operator ke tabel audit_log.
    """
    try:
        log_entry = AuditLog(
            pengguna_id=pengguna_id,
            aksi=aksi,
            tabel_target=tabel_target,
            record_id=record_id,
            detail=detail or {},
            ip_address=ip_address
        )
        db.add(log_entry)
    except Exception as e:
        logger.warning(f"Gagal mencatat audit log: {e}")
