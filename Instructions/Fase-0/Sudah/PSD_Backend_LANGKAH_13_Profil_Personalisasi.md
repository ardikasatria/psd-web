# Langkah 13 — Profil & Personalisasi (+ Unggah Avatar/Banner ke S3/MinIO)

> **Tujuan:** Profil yang kaya & dapat dipersonalisasi (banner, accent color, custom status, about me, links) plus unggah foto profil/banner ke object storage S3-compatible. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 7 (users) & Langkah 10 (modul `me`).
>
> **Catatan storage:** kode memakai **AWS SDK S3 (boto3)**. Di dev menunjuk **MinIO**; di produksi cukup ganti endpoint/kredensial ke **AWS S3** — kode identik.

## 13.1 Perluas model User — `app/modules/users/models.py`

```python
from sqlalchemy import JSON

banner_url:   Mapped[str | None] = mapped_column(String, nullable=True)
accent_color: Mapped[str | None] = mapped_column(String, nullable=True)   # mis. "#5865F2"
pronouns:     Mapped[str | None] = mapped_column(String, nullable=True)
location:     Mapped[str | None] = mapped_column(String, nullable=True)
about_md:     Mapped[str | None] = mapped_column(String, nullable=True)
status_emoji: Mapped[str | None] = mapped_column(String, nullable=True)
status_text:  Mapped[str | None] = mapped_column(String, nullable=True)
links:        Mapped[list]       = mapped_column(JSON, default=list)      # [{label, url}]
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "rich profile fields"
docker compose exec backend alembic upgrade head
```

## 13.2 Konfigurasi storage — tambahkan di `app/core/config.py`

```python
S3_ENDPOINT_URL: str | None = "http://minio:9000"   # MinIO dev; set None untuk AWS S3
S3_REGION: str = "us-east-1"
S3_ACCESS_KEY: str = "psd"
S3_SECRET_KEY: str = "psd-secret"
S3_MEDIA_BUCKET: str = "psd-media"
S3_PUBLIC_BASE_URL: str = "http://localhost:9000/psd-media"   # basis URL publik objek
```

> **Produksi (AWS S3):** `S3_ENDPOINT_URL=None`, isi `S3_REGION` + kredensial IAM, dan `S3_PUBLIC_BASE_URL=https://<bucket>.s3.<region>.amazonaws.com` (atau domain CloudFront). Tidak ada perubahan kode.

## 13.3 Bucket media publik

Tambah ke service `minio-init` (compose) agar bucket avatar/banner ada & bisa dibaca publik:

```
mc mb -p local/psd-media || true && mc anonymous set download local/psd-media || true
```

## 13.4 Helper storage — `app/core/storage.py`

```python
import boto3
from app.core.config import settings

_s3 = boto3.client(
    "s3",
    endpoint_url=settings.S3_ENDPOINT_URL,   # None → AWS S3 default
    region_name=settings.S3_REGION,
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
)


def upload_public(key: str, data: bytes, content_type: str) -> str:
    _s3.put_object(Bucket=settings.S3_MEDIA_BUCKET, Key=key, Body=data, ContentType=content_type)
    return f"{settings.S3_PUBLIC_BASE_URL.rstrip('/')}/{key}"
```

Tambahkan `boto3` ke `requirements.txt`, lalu `docker compose up -d --build`.

## 13.5 Skema — `app/modules/users/schemas.py`

```python
class LinkItem(BaseModel):
    label: str
    url: str


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    name: str
    email: str | None = None          # hanya untuk diri sendiri (/auth/me, PATCH /me)
    avatar_url: str | None = None
    banner_url: str | None = None
    accent_color: str | None = None
    pronouns: str | None = None
    location: str | None = None
    bio: str | None = None
    about_md: str | None = None
    status_emoji: str | None = None
    status_text: str | None = None
    links: list[LinkItem] = []
    role: str
    created_at: datetime


class ProfileUpdate(BaseModel):
    name: str | None = None
    bio: str | None = None
    about_md: str | None = None
    pronouns: str | None = None
    location: str | None = None
    accent_color: str | None = None
    status_emoji: str | None = None
    status_text: str | None = None
    links: list[LinkItem] | None = None
```

## 13.6 Endpoint — tambahkan di `app/modules/me/router.py`

```python
import uuid
from fastapi import UploadFile, File
from app.core.errors import ApiError
from app.core.storage import upload_public
from app.modules.users.schemas import ProfileOut, ProfileUpdate

IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@router.patch("/me", response_model=ProfileOut)
async def update_me(body: ProfileUpdate, user: User = Depends(get_current_user),
                    db: AsyncSession = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if "links" in data:
        data["links"] = [l.model_dump() if hasattr(l, "model_dump") else l for l in data["links"]]
    for k, v in data.items():
        setattr(user, k, v)
    await db.commit(); await db.refresh(user)
    return ProfileOut.model_validate(user)


async def _upload_image(file: UploadFile, user: User, db, kind: str, max_mb: int):
    ext = IMG.get(file.content_type)
    if not ext:
        raise ApiError(422, "invalid_file", "Format harus jpg, png, atau webp")
    data = await file.read()
    if len(data) > max_mb * 1024 * 1024:
        raise ApiError(413, "too_large", f"Ukuran maksimal {max_mb} MB")
    key = f"{kind}/{user.id}/{uuid.uuid4().hex}.{ext}"
    url = upload_public(key, data, file.content_type)
    setattr(user, "avatar_url" if kind == "avatars" else "banner_url", url)
    await db.commit()
    return url


@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    return {"avatar_url": await _upload_image(file, user, db, "avatars", 2)}


@router.post("/me/banner")
async def upload_banner(file: UploadFile = File(...), user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    return {"banner_url": await _upload_image(file, user, db, "banners", 4)}
```

Perbarui `GET /auth/me` (Langkah 4) agar `response_model=ProfileOut` dan memuat `email`. Perbarui `GET /users/{username}` (Langkah 7) agar mengembalikan `ProfileOut` (tanpa `email`) **+** `stats`.

> Catatan: `python-multipart` (sudah ditambah di Langkah 6) diperlukan untuk unggah file.

## 13.7 Pembaruan Kontrak (Bagian 8 dokumen frontend)

`User`/profil **+** field: `banner_url, accent_color, pronouns, location, about_md, status_emoji, status_text, links: {label,url}[]`. (`email` hanya muncul di `/auth/me` & `PATCH /me`.)

| Metode | Path | Auth | Body | Respons |
|---|---|---|---|---|
| PATCH | `/me` | ✓ | `ProfileUpdate` (field di atas, sebagian) | `Profile` |
| POST | `/me/avatar` | ✓ | `multipart: file` (jpg/png/webp ≤2MB) | `{ avatar_url }` |
| POST | `/me/banner` | ✓ | `multipart: file` (≤4MB) | `{ banner_url }` |

`GET /auth/me` & `GET /users/{username}` kini mengembalikan profil kaya.

## Selesai bila

- [ ] Profil punya field kaya; `PATCH /me` memperbarui field yang dikirim (partial).
- [ ] `POST /me/avatar` & `/me/banner` mengunggah ke bucket `psd-media` (MinIO) dan mengembalikan URL publik yang bisa dibuka.
- [ ] `GET /users/{username}` & `/auth/me` mengembalikan profil lengkap; `email` hanya untuk diri sendiri.
- [ ] Validasi format & ukuran berfungsi (jpg/png/webp; 2MB avatar, 4MB banner).
- [ ] Mengganti `S3_ENDPOINT_URL`→None + kredensial AWS membuat unggahan menuju S3 tanpa ubah kode.
