# Langkah 14 — Akun & Keamanan (Kata Sandi, Email, Cookie httpOnly)

> **Tujuan:** Ganti/reset kata sandi, ganti & verifikasi email, dan pindahkan token dari header/localStorage ke **cookie `httpOnly`**. **Kerjakan hanya langkah ini, sebelum Item 2 & 3** (auth berubah, berdampak luas). Prasyarat: Langkah 4.

## 14.1 Field & config

Tambah ke `User` (`app/modules/users/models.py`):

```python
email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
```

Tambah ke `app/core/config.py`:

```python
APP_BASE_URL: str = "http://localhost:3000"        # untuk tautan email
COOKIE_NAME: str = "psd_token"
COOKIE_SECURE: bool = False                          # True di produksi (HTTPS)
COOKIE_SAMESITE: str = "lax"
COOKIE_DOMAIN: str | None = None                     # ".psd.id" di produksi
DEV_EMAIL_ECHO: bool = True                           # dev: email ditulis ke log
# SMTP_* diisi untuk produksi
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "email_verified"
docker compose exec backend alembic upgrade head
```

## 14.2 Pengirim email — `app/core/email.py`

```python
import logging
from app.core.config import settings
log = logging.getLogger("psd.email")

def send_email(to: str, subject: str, body: str) -> None:
    if settings.DEV_EMAIL_ECHO:
        log.warning("EMAIL → %s | %s\n%s", to, subject, body)   # dev: lihat di `docker compose logs`
        return
    # Produksi: kirim via SMTP (smtplib) memakai SMTP_* dari config.
    raise NotImplementedError("Konfigurasi SMTP untuk produksi")
```

## 14.3 Token berpurpose — tambahkan di `app/core/security.py`

```python
from datetime import datetime, timedelta, timezone

def create_purpose_token(sub: str, purpose: str, minutes: int, extra: dict | None = None) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    return jwt.encode({"sub": sub, "purpose": purpose, "exp": exp, **(extra or {})},
                      settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_purpose_token(token: str, purpose: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
    return payload if payload.get("purpose") == purpose else None
```

## 14.4 Cookie helper — `app/core/cookies.py`

```python
from fastapi import Response
from app.core.config import settings

def set_auth_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(settings.COOKIE_NAME, token, httponly=True,
                    secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE,
                    domain=settings.COOKIE_DOMAIN, max_age=settings.JWT_EXPIRE_MINUTES * 60, path="/")

def clear_auth_cookie(resp: Response) -> None:
    resp.delete_cookie(settings.COOKIE_NAME, domain=settings.COOKIE_DOMAIN, path="/")
```

## 14.5 Baca token dari cookie — ubah `app/core/deps.py`

`get_current_user` & `get_current_user_optional` kini membaca dari **cookie dulu**, lalu header (transisi):

```python
from fastapi import Request

def _extract_token(request: Request) -> str | None:
    token = request.cookies.get(settings.COOKIE_NAME)
    if token:
        return token
    auth = request.headers.get("authorization")
    return auth.split(" ", 1)[1] if auth and auth.startswith("Bearer ") else None

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = _extract_token(request)
    if not token:
        raise ApiError(401, "unauthorized", "Belum masuk")
    sub = decode_token(token)
    if not sub:
        raise ApiError(401, "unauthorized", "Sesi tidak valid")
    user = (await db.execute(select(User).where(User.id == sub))).scalar_one_or_none()
    if not user or not user.is_active:
        raise ApiError(401, "unauthorized", "Sesi tidak valid")
    return user
```

(Sesuaikan `get_current_user_optional` dengan pola `_extract_token` yang sama; kembalikan `None` bila tak ada/invalid.)

## 14.6 Set cookie saat login/register & logout — ubah `app/modules/auth/router.py`

```python
from fastapi import Response
from app.core.cookies import set_auth_cookie, clear_auth_cookie

# di register & login: tambahkan param `response: Response`, dan sebelum return:
token = create_access_token(user.id)
set_auth_cookie(response, token)
return {"user": UserOut.model_validate(user), "token": token}   # token tetap dikirim utk kompatibilitas

@router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}
```

## 14.7 Endpoint keamanan — `app/modules/auth/router.py`

```python
from app.core.security import (hash_password, verify_password,
                               create_purpose_token, decode_purpose_token)
from app.core.email import send_email
from app.core.config import settings

@router.post("/auth/change-password")
async def change_password(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(body["current_password"], user.hashed_password):
        raise ApiError(400, "bad_password", "Kata sandi saat ini salah")
    user.hashed_password = hash_password(body["new_password"])
    await db.commit()
    return {"ok": True}

@router.post("/auth/forgot-password")
async def forgot_password(body: dict, db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.email == body["email"]))).scalar_one_or_none()
    if u:  # jangan bocorkan keberadaan akun
        tok = create_purpose_token(u.id, "reset", 30)
        send_email(u.email, "Reset kata sandi PSD", f"{settings.APP_BASE_URL}/reset-password?token={tok}")
    return {"ok": True}

@router.post("/auth/reset-password")
async def reset_password(body: dict, db: AsyncSession = Depends(get_db)):
    payload = decode_purpose_token(body["token"], "reset")
    if not payload:
        raise ApiError(400, "invalid_token", "Tautan reset tidak valid atau kedaluwarsa")
    u = (await db.execute(select(User).where(User.id == payload["sub"]))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    u.hashed_password = hash_password(body["new_password"])
    await db.commit()
    return {"ok": True}

@router.post("/auth/change-email")
async def change_email(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(body["password"], user.hashed_password):
        raise ApiError(400, "bad_password", "Kata sandi salah")
    tok = create_purpose_token(user.id, "change_email", 60, {"email": body["new_email"]})
    send_email(body["new_email"], "Verifikasi email baru PSD",
               f"{settings.APP_BASE_URL}/verify-email?token={tok}")
    return {"ok": True}

@router.post("/auth/verify-email")
async def verify_email(body: dict, db: AsyncSession = Depends(get_db)):
    payload = decode_purpose_token(body["token"], "change_email") or decode_purpose_token(body["token"], "verify")
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

@router.post("/auth/resend-verification")
async def resend_verification(user: User = Depends(get_current_user)):
    tok = create_purpose_token(user.id, "verify", 60)
    send_email(user.email, "Verifikasi email PSD", f"{settings.APP_BASE_URL}/verify-email?token={tok}")
    return {"ok": True}
```

Pada `register` (Langkah 4), setelah membuat user kirim verifikasi awal:

```python
send_email(user.email, "Verifikasi email PSD",
           f"{settings.APP_BASE_URL}/verify-email?token={create_purpose_token(user.id, 'verify', 60)}")
```

## 14.8 CORS untuk cookie — `app/main.py`

Pastikan `allow_credentials=True` (sudah) dan `allow_origins` **eksplisit** (bukan `*`). Tidak perlu perubahan bila origin sudah spesifik.

## 14.9 Pembaruan Kontrak (Bagian 8 dokumen frontend)

- Autentikasi kini lewat **cookie httpOnly** (`set-cookie` saat login/register). Frontend memanggil API dengan `credentials: "include"` dan **tidak** lagi menyimpan token.
- `User` **+** `email_verified: boolean`.

| Metode | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/logout` | (cookie) | — |
| POST | `/auth/change-password` | ✓ | `{ current_password, new_password }` |
| POST | `/auth/forgot-password` | — | `{ email }` (selalu 200) |
| POST | `/auth/reset-password` | — | `{ token, new_password }` |
| POST | `/auth/change-email` | ✓ | `{ new_email, password }` |
| POST | `/auth/verify-email` | — | `{ token }` |
| POST | `/auth/resend-verification` | ✓ | — |

## Selesai bila

- [ ] Login/register memasang cookie `httpOnly`; `/auth/me` bekerja tanpa header Authorization.
- [ ] `/auth/logout` menghapus cookie.
- [ ] Ganti kata sandi, lupa→reset, ganti email→verifikasi berfungsi (tautan email tampil di log saat `DEV_EMAIL_ECHO=true`).
- [ ] Akun nonaktif/sesi invalid → 401.
- [ ] Di dev (localhost): `COOKIE_SECURE=false, samesite=lax`; produksi: `secure=true, domain=".psd.id"`.
