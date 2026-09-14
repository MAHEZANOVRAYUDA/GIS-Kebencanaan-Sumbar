from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_async_db
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.core.dependencies import get_current_user
from app.models.pengguna import Pengguna

router = APIRouter(prefix="/auth", tags=["Autentikasi & RBAC"])

class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    nama: str
    email: str
    role: str
    wilayah_tugas_id: Optional[int] = None
    aktif: bool

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_async_db)
):
    result = await db.execute(select(Pengguna).where(Pengguna.email == payload.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Email atau kata sandi yang dimasukkan salah."
                }
            }
        )

    if not user.aktif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "ACCOUNT_DISABLED",
                    "message": "Akun pengguna ini telah dinonaktifkan oleh administrator."
                }
            }
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        wilayah_id=user.wilayah_tugas_id
    )
    refresh_token = create_refresh_token(subject=user.id)

    # Set token di cookie HttpOnly untuk keamanan proteksi dari XSS
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=60 * 60 * 24, # 1 hari
        samesite="lax",
        secure=False, # True di produksi dengan HTTPS
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=60 * 60 * 24 * 7, # 7 hari
        samesite="lax",
        secure=False,
        path="/"
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            nama=user.nama,
            email=user.email,
            role=user.role,
            wilayah_tugas_id=user.wilayah_tugas_id,
            aktif=user.aktif
        )
    )

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"message": "Berhasil keluar dari sistem (logout)."}

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: Pengguna = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        nama=current_user.nama,
        email=current_user.email,
        role=current_user.role,
        wilayah_tugas_id=current_user.wilayah_tugas_id,
        aktif=current_user.aktif
    )
