from typing import Optional, List
from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import decode_token
from app.core.database import get_async_db
from app.models.pengguna import Pengguna

async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
) -> Optional[Pengguna]:
    # 1. Coba baca dari cookie 'access_token'
    token = request.cookies.get("access_token")
    
    # 2. Jika tidak ada di cookie, periksa header Authorization: Bearer <token>
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        return None
        
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
        
    user_id = payload.get("sub")
    if not user_id:
        return None
        
    result = await db.execute(select(Pengguna).where(Pengguna.id == int(user_id), Pengguna.aktif == True))
    user = result.scalar_one_or_none()
    return user

async def get_current_user(
    user: Optional[Pengguna] = Depends(get_current_user_optional)
) -> Pengguna:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Sesi tidak valid atau belum masuk. Silakan login terlebih dahulu."
                }
            },
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

def require_role(allowed_roles: List[str]):
    async def role_checker(user: Pengguna = Depends(get_current_user)) -> Pengguna:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": f"Akses ditolak. Fitur ini memerlukan salah satu hak akses: {', '.join(allowed_roles)}."
                    }
                }
            )
        return user
    return role_checker
