# Langkah 17 — Onboarding Pengguna (Minat, Status, Checklist)

> **Tujuan:** Menyimpan minat/domain pengguna, menandai status onboarding, dan menyediakan checklist "Mulai di sini" yang dihitung dari aktivitas nyata. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 13 (profil) & 14 (email_verified).

## 17.1 Field User — `app/modules/users/models.py`

```python
interests: Mapped[list] = mapped_column(JSON, default=list)   # ["nlp", "umkm", ...]
onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "onboarding fields"
docker compose exec backend alembic upgrade head
```

## 17.2 Sertakan di profil — `app/modules/users/schemas.py`

- Tambah ke `ProfileOut`: `interests: list[str] = []` dan `onboarded: bool = False`.
- Tambah ke `ProfileUpdate`: `interests: list[str] | None = None`.
- Tambah `"interests"` ke himpunan field yang boleh di-PATCH di `PATCH /me` (Langkah 13).

## 17.3 Endpoint onboarding — `app/modules/me/router.py`

```python
from sqlalchemy import func
from app.modules.repos.models import Repo
from app.modules.competitions.models import Submission
from app.modules.community.models import Thread


@router.get("/me/onboarding")
async def onboarding(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    async def count(model, cond):
        return (await db.execute(select(func.count()).select_from(model).where(cond))).scalar_one()

    repos = await count(Repo, Repo.owner_id == user.id)
    subs = await count(Submission, Submission.user_id == user.id)
    threads = await count(Thread, Thread.author_id == user.id)

    checklist = {
        "profile_completed": bool(user.avatar_url) and bool(user.bio or user.about_md),
        "email_verified": user.email_verified,
        "interests_selected": len(user.interests or []) > 0,
        "has_asset": repos > 0,
        "joined_competition": subs > 0,
        "joined_discussion": threads > 0,
    }
    return {"onboarded": user.onboarded, "interests": user.interests or [], "checklist": checklist}


@router.post("/me/onboarding/complete")
async def complete_onboarding(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.onboarded = True
    await db.commit()
    return {"onboarded": True}
```

## 17.4 Pembaruan Kontrak (Bagian 8 dokumen frontend)

- Profil **+** `interests: string[]`, `onboarded: boolean`. `PATCH /me` menerima `interests`.

| Metode | Path | Auth | Respons |
|---|---|---|---|
| GET | `/me/onboarding` | ✓ | `{ onboarded, interests, checklist: { profile_completed, email_verified, interests_selected, has_asset, joined_competition, joined_discussion } }` |
| POST | `/me/onboarding/complete` | ✓ | `{ onboarded: true }` |

## Selesai bila

- [ ] `PATCH /me` dapat menyimpan `interests`; muncul di `/auth/me`.
- [ ] `GET /me/onboarding` mengembalikan checklist yang berubah seiring aktivitas (buat aset → `has_asset=true`, dst.).
- [ ] `POST /me/onboarding/complete` menandai `onboarded=true` (tersimpan).
- [ ] `onboarded` & `interests` tampil di profil sendiri.
