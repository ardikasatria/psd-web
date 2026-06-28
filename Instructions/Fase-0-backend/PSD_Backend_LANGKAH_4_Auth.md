# Langkah 4 — Modul Auth (register / login / me, JWT)

> **Tujuan:** Pengguna bisa daftar, login, dan mengambil profil sendiri lewat JWT. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 3 (tabel `User`) selesai.

## 4.1 Tambah dependensi

Di `requirements.txt`, tambahkan:

```
passlib[bcrypt]
python-jose[cryptography]
```

Lalu rebuild agar terpasang di container:

```bash
docker compose up -d --build
```

## 4.2 Keamanan — `app/core/security.py`

```python
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(p: str) -> str:
    return _pwd.hash(p)


def verify_password(p: str, h: str) -> bool:
    return _pwd.verify(p, h)


def create_access_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": sub, "exp": exp}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> str | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]).get("sub")
    except JWTError:
        return None
```

## 4.3 Dependency pengguna aktif — `app/core/deps.py`

```python
from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.errors import ApiError
from app.core.security import decode_token
from app.modules.users.models import User


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError(401, "unauthorized", "Token tidak ditemukan")
    sub = decode_token(authorization.split(" ", 1)[1])
    if not sub:
        raise ApiError(401, "unauthorized", "Token tidak valid")
    user = (await db.execute(select(User).where(User.id == sub))).scalar_one_or_none()
    if not user:
        raise ApiError(401, "unauthorized", "Pengguna tidak ditemukan")
    return user
```

## 4.4 Skema — `app/modules/auth/schemas.py`

```python
from pydantic import BaseModel, EmailStr
from app.modules.users.schemas import UserOut


class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    user: UserOut
    token: str
```

> `EmailStr` butuh paket `email-validator` (ikut otomatis dengan `pydantic[email]`; jika belum, tambahkan `email-validator` ke requirements).

## 4.5 Router — `app/modules/auth/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.users.models import User
from app.modules.users.schemas import UserOut
from app.modules.auth.schemas import RegisterIn, LoginIn, TokenOut

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    exists = (await db.execute(
        select(User).where(or_(User.username == body.username, User.email == body.email))
    )).scalar_one_or_none()
    if exists:
        raise ApiError(409, "conflict", "Username atau email sudah dipakai")
    user = User(username=body.username, email=body.email, name=body.name,
                hashed_password=hash_password(body.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"user": UserOut.model_validate(user), "token": create_access_token(user.id)}


@router.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise ApiError(401, "unauthorized", "Email atau kata sandi salah")
    return {"user": UserOut.model_validate(user), "token": create_access_token(user.id)}


@router.get("/auth/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)
```

## 4.6 Wire ke `app/main.py`

```python
from app.modules.auth.router import router as auth_router
app.include_router(auth_router, prefix=settings.API_PREFIX)
```

## Selesai bila

- [ ] `POST /api/v1/auth/register` mengembalikan `{ user, token }` dan membuat baris di `users`.
- [ ] `POST /api/v1/auth/login` dengan kredensial benar → `{ user, token }`; salah → `401` dengan amplop error.
- [ ] `GET /api/v1/auth/me` dengan header `Authorization: Bearer <token>` → data pengguna.
- [ ] Tanpa token / token salah → `401` `{ "error": { "code": "unauthorized", ... } }`.
