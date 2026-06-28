from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.cookies import clear_auth_cookie, set_auth_cookie
from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.email.auth_mail import (
    send_change_email_verification,
    send_password_changed_email,
    send_reset_password_email,
    send_verify_email,
)
from app.core.errors import ApiError
from app.core.ratelimit import rate_limit
from app.core.security import (
    create_access_token,
    create_purpose_token,
    decode_purpose_token,
    hash_password,
    verify_password,
)
from app.modules.auth.schemas import (
    ChangeEmailIn,
    ChangePasswordIn,
    ForgotPasswordIn,
    LoginIn,
    MeOut,
    OkOut,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
    VerifyEmailIn,
)
from app.modules.users.models import User
from app.modules.users.schemas import ProfileOut

router = APIRouter(tags=["auth"])


def _auth_response(response: Response, user: User) -> dict:
    token = create_access_token(user.id)
    set_auth_cookie(response, token)
    return {"user": ProfileOut.from_user(user, include_email=True), "token": token}


@router.post("/auth/register", response_model=TokenOut, dependencies=[rate_limit("register", 5, 3600)])
async def register(body: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    if not body.accept_tos:
        raise ApiError(400, "tos_required", "Anda harus menyetujui Ketentuan Layanan & Kebijakan Privasi")
    exists = (
        await db.execute(
            select(User).where(or_(User.username == body.username, User.email == body.email))
        )
    ).scalar_one_or_none()
    if exists:
        raise ApiError(409, "conflict", "Username atau email sudah dipakai")
    now = datetime.now(timezone.utc)
    user = User(
        username=body.username,
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
        accepted_tos_at=now,
        accepted_tos_version=settings.TOS_VERSION,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    verify_tok = create_purpose_token(user.id, "verify", 60)
    send_verify_email(user.email, name=user.name, token=verify_tok, expiry_minutes=60)
    return _auth_response(response, user)


@router.post("/auth/login", response_model=TokenOut, dependencies=[rate_limit("login", 10, 60)])
async def login(body: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise ApiError(401, "unauthorized", "Email atau kata sandi salah")
    if not user.is_active:
        raise ApiError(403, "forbidden", "Akun dinonaktifkan")
    return _auth_response(response, user)


@router.post("/auth/logout", response_model=OkOut)
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/auth/me")
async def me(user: User | None = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)):
    if not user:
        return {"user": None, "accepted_tos_version": None, "tos_current": settings.TOS_VERSION}
    from app.modules.gamification.service import profile_gamification

    profile = ProfileOut.from_user(user, include_email=True).model_dump()
    profile.update(await profile_gamification(db, user))
    profile["accepted_tos_version"] = user.accepted_tos_version
    profile["tos_current"] = settings.TOS_VERSION
    return {"user": profile}


@router.post("/auth/change-password", response_model=OkOut)
async def change_password(
    body: ChangePasswordIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise ApiError(400, "bad_password", "Kata sandi saat ini salah")
    user.hashed_password = hash_password(body.new_password)
    await db.commit()
    send_password_changed_email(user.email, name=user.name)
    return {"ok": True}


@router.post("/auth/forgot-password", response_model=OkOut, dependencies=[rate_limit("forgot", 5, 3600)])
async def forgot_password(body: ForgotPasswordIn, db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if u:
        tok = create_purpose_token(u.id, "reset", 30)
        send_reset_password_email(u.email, name=u.name, token=tok, expiry_minutes=30)
    return {"ok": True}


@router.post("/auth/reset-password", response_model=OkOut)
async def reset_password(body: ResetPasswordIn, db: AsyncSession = Depends(get_db)):
    payload = decode_purpose_token(body.token, "reset")
    if not payload:
        raise ApiError(400, "invalid_token", "Tautan reset tidak valid atau kedaluwarsa")
    u = (await db.execute(select(User).where(User.id == payload["sub"]))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    u.hashed_password = hash_password(body.new_password)
    await db.commit()
    send_password_changed_email(u.email, name=u.name)
    return {"ok": True}


@router.post("/auth/change-email", response_model=OkOut)
async def change_email(
    body: ChangeEmailIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.password, user.hashed_password):
        raise ApiError(400, "bad_password", "Kata sandi salah")
    taken = (
        await db.execute(select(User).where(User.email == body.new_email, User.id != user.id))
    ).scalar_one_or_none()
    if taken:
        raise ApiError(409, "conflict", "Email sudah dipakai")
    tok = create_purpose_token(user.id, "change_email", 60, {"email": body.new_email})
    send_change_email_verification(body.new_email, name=user.name, token=tok, expiry_minutes=60)
    return {"ok": True}


@router.post("/auth/verify-email", response_model=OkOut)
async def verify_email(body: VerifyEmailIn, db: AsyncSession = Depends(get_db)):
    payload = decode_purpose_token(body.token, "change_email") or decode_purpose_token(
        body.token, "verify"
    )
    if not payload:
        raise ApiError(400, "invalid_token", "Tautan tidak valid atau kedaluwarsa")
    u = (await db.execute(select(User).where(User.id == payload["sub"]))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    if "email" in payload:
        u.email = payload["email"]
    u.email_verified = True
    await db.commit()
    return {"ok": True}


@router.post("/auth/resend-verification", response_model=OkOut)
async def resend_verification(user: User = Depends(get_current_user)):
    tok = create_purpose_token(user.id, "verify", 60)
    send_verify_email(user.email, name=user.name, token=tok, expiry_minutes=60)
    return {"ok": True}
