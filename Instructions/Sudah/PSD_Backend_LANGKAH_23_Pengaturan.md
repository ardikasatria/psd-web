# Langkah 23 — Pengaturan Menyeluruh (Notifikasi, Privasi, Tampilan)

> **Tujuan:** Preferensi pengguna untuk notifikasi, privasi, dan tampilan. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 13 (profil).

## 23.1 Field — `app/modules/users/models.py`

```python
from sqlalchemy import JSON
settings: Mapped[dict] = mapped_column(JSON, default=dict)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "user settings"
docker compose exec backend alembic upgrade head
```

## 23.2 Default & merge — `app/modules/users/settings.py`

```python
DEFAULT_SETTINGS = {
    "notifications": {"email_event_reminder": True, "email_competition": True,
                      "email_forum_reply": True, "inapp": True},
    "privacy": {"profile_visibility": "public", "show_email": False, "searchable": True},
    "appearance": {"theme": "system", "language": "id", "reduced_motion": False},
}

def merged(user_settings: dict | None) -> dict:
    out = {k: {**v} for k, v in DEFAULT_SETTINGS.items()}
    for section, vals in (user_settings or {}).items():
        if section in out and isinstance(vals, dict):
            out[section].update(vals)
    return out
```

## 23.3 Endpoint — `app/modules/me/router.py`

```python
from app.modules.users.settings import merged

@router.get("/me/settings")
async def get_settings(user: User = Depends(get_current_user)):
    return merged(user.settings)

@router.patch("/me/settings")
async def update_settings(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    current = merged(user.settings)
    for section, vals in body.items():
        if section in current and isinstance(vals, dict):
            current[section].update(vals)
    user.settings = current
    await db.commit()
    return current
```

## 23.4 Terapkan privasi (ringan)

- `GET /users/{username}` — bila `privacy.profile_visibility == "private"` dan peminta bukan pemilik/admin: balas `403 private_profile` ("Profil ini privat"). (`show_email` sudah ditangani: email hanya untuk diri sendiri.)
- Pencarian/penemuan & daftar pengguna admin: kecualikan pengguna dengan `privacy.searchable == false` dari hasil pencarian publik (tetap tampil untuk admin).

## 23.5 Pembaruan Kontrak (Bagian 8 dokumen frontend)

| Metode | Path | Auth | Respons |
|---|---|---|---|
| GET | `/me/settings` | ✓ | objek settings (notifications/privacy/appearance) |
| PATCH | `/me/settings` | ✓ | settings tergabung terbaru |

Catatan: `appearance.theme` ∈ `system|light|dark`, `appearance.language` ∈ `id|en`. Privasi `profile_visibility` ∈ `public|private`.

## Selesai bila

- [ ] `GET /me/settings` mengembalikan default tergabung untuk pengguna baru.
- [ ] `PATCH /me/settings` menyimpan per-bagian (merge), tidak menimpa bagian lain.
- [ ] Profil privat menolak peminta non-pemilik; pengguna non-searchable tak muncul di pencarian publik.
