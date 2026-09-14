from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# Base deklarasi ORM
Base = declarative_base()

# Sync Engine (untuk Alembic & utility ETL)
sync_engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    echo=False
)
SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

# Async Engine (untuk FastAPI endpoint)
async_engine = create_async_engine(
    settings.async_database_url,
    pool_pre_ping=True,
    echo=False
)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection session database async untuk FastAPI endpoint."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

def get_sync_db():
    """Dependency generator session database synchronous."""
    db: Session = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()
