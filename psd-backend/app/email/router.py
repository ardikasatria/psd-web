"""Endpoint unsubscribe email (Langkah 59)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.email.unsubscribe import verify_unsubscribe_token
from app.modules.users.models import User
from app.modules.users.settings import merged

router = APIRouter(tags=["email"])


@router.get("/email/unsubscribe")
async def unsubscribe_email(token: str, db: AsyncSession = Depends(get_db)):
    user_id = verify_unsubscribe_token(token)
    if not user_id:
        return HTMLResponse(
            "<h1>Token tidak valid</h1><p>Link berhenti berlangganan tidak dikenali.</p>",
            status_code=400,
        )

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        return HTMLResponse("<h1>Pengguna tidak ditemukan</h1>", status_code=404)

    current = merged(user.settings)
    email_sec = dict(current.get("email") or {})
    email_sec["email_enabled"] = False
    current["email"] = email_sec
    user.settings = current
    await db.commit()

    return HTMLResponse(
        """<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><title>Berhenti berlangganan</title></head>
<body style="font-family:sans-serif;max-width:32rem;margin:2rem auto">
  <h1>Email dinonaktifkan</h1>
  <p>Anda tidak akan menerima email notifikasi dari PSD lagi.
     Anda masih dapat mengaktifkannya di Pengaturan → Notifikasi.</p>
</body>
</html>"""
    )
