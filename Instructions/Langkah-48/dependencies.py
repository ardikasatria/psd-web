"""
==========================================================================
 TITIK INTEGRASI (3 SEAM) — SATU-SATUNYA FILE YANG WAJIB ANDA SAMBUNGKAN
==========================================================================
Provider ini tidak tahu cara aplikasi PSD Anda menyimpan sesi atau pengguna.
Sambungkan tiga fungsi di bawah ke kode PSD yang sudah ada (Langkah 14 & model User).

1. get_db            -> AsyncSession SQLAlchemy milik PSD.
2. get_current_user  -> Pengguna login dari cookie httpOnly (Langkah 14), atau None.
3. load_user_claims  -> Ambil klaim pengguna by id (dipakai /token & /userinfo,
                        di mana TIDAK ADA cookie sesi).
"""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass
class OAuthUser:
    """Representasi minimal pengguna untuk keperluan klaim OIDC.

    `sub` HARUS stabil & unik selamanya untuk satu pengguna (mis. str(user.id)).
    Jangan pakai email/username sebagai sub bila bisa berubah.
    """
    sub: str
    name: str | None = None
    preferred_username: str | None = None
    email: str | None = None
    email_verified: bool = False
    picture: str | None = None


# --------------------------------------------------------------------------
# SEAM 1 — Sesi database
# --------------------------------------------------------------------------
async def get_db() -> AsyncSession:  # type: ignore[return-value]
    """Yield AsyncSession milik PSD.

    GANTI isi fungsi ini. Contoh bila Anda punya async_session_maker:

        async with async_session_maker() as session:
            yield session
    """
    raise NotImplementedError("Sambungkan get_db ke AsyncSession PSD Anda.")


# --------------------------------------------------------------------------
# SEAM 2 — Pengguna yang sedang login (untuk /authorize)
# --------------------------------------------------------------------------
async def get_current_user(request: Request) -> OAuthUser | None:
    """Kembalikan pengguna login dari cookie sesi httpOnly (Langkah 14), atau None.

    GANTI isi fungsi ini. Contoh bila middleware Anda menaruh user di request.state:

        u = getattr(request.state, "user", None)
        if u is None:
            return None
        return OAuthUser(
            sub=str(u.id), name=u.full_name, preferred_username=u.username,
            email=u.email, email_verified=getattr(u, "email_verified", False),
            picture=getattr(u, "avatar_url", None),
        )
    """
    raise NotImplementedError("Sambungkan get_current_user ke sesi PSD Anda.")


# --------------------------------------------------------------------------
# SEAM 3 — Pemuat klaim by id (untuk /token & /userinfo)
# --------------------------------------------------------------------------
async def load_user_claims(db: AsyncSession, user_id: str) -> OAuthUser | None:
    """Ambil klaim pengguna berdasarkan id (string). Kembalikan None bila tak ada.

    GANTI isi fungsi ini. Contoh:

        u = await db.get(User, int(user_id))
        if u is None:
            return None
        return OAuthUser(sub=str(u.id), name=u.full_name, ...)
    """
    raise NotImplementedError("Sambungkan load_user_claims ke model User PSD Anda.")
