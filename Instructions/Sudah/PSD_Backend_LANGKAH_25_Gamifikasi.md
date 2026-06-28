# Langkah 25 — Gamifikasi (Upgrade: + Sinyal Sosial)

> **Tujuan:** Reputasi, tier, badge, dan hak/batas — kini termasuk sinyal **sosial** (follow, suka postingan, komentar) dan batas anti-spam sosial. **Menggantikan** gamifikasi Langkah 24 sebelumnya (dinomori ulang ke sini). **Kerjakan setelah Langkah 24 (sosial).** Prasyarat: Langkah 11, 15, 19, 20, 21, 24.

## 25.1 Field & model

`User`: `reputation: Mapped[int] = mapped_column(Integer, default=0, index=True)`

`UserBadge` (`app/modules/gamification/models.py`):

```python
class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ubg_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    badge_id: Mapped[str] = mapped_column(String)
    awarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "gamification"
docker compose exec backend alembic upgrade head
```

## 25.2 Tier & hak — `app/modules/gamification/tiers.py`

```python
TIERS = [(0, "Pemula"), (50, "Kontributor"), (250, "Ahli"), (1000, "Master"), (5000, "Grandmaster")]

def tier_for(rep: int) -> dict:
    idx = 0
    for i, (t, _) in enumerate(TIERS):
        if rep >= t: idx = i
    return {"level": idx, "name": TIERS[idx][1], "reputation": rep,
            "next_at": TIERS[idx + 1][0] if idx + 1 < len(TIERS) else None}

def perks_for(rep: int) -> dict:
    lvl = tier_for(rep)["level"]
    pick = lambda arr: arr[min(lvl, len(arr) - 1)]
    return {
        "upload_max_mb": pick([50, 100, 200, 500, 1000]),
        "daily_submission_bonus": pick([0, 2, 5, 10, 20]),
        "notebook_quota": pick([5, 20, 50, 100, 1000]),
        "event_priority": lvl >= 2,
        "can_create_event": lvl >= 3,
        # ---- sosial (baru) ----
        "daily_post_limit": pick([5, 15, 30, 60, 100]),      # anti-spam
        "post_image_max": pick([1, 4, 6, 8, 10]),            # gambar per postingan
    }
```

## 25.3 Reputasi & badge — `app/modules/gamification/service.py`

```python
from sqlalchemy import select
from app.modules.gamification.models import UserBadge

POINTS = {  # aksi bermakna; sosial bernilai kecil agar tak mudah di-farming
    "asset_published": 10, "like_received": 2, "course_completed": 15,
    "submission_scored": 5, "forum_thread": 3, "forum_post": 1,
    "follow_received": 2, "post_like_received": 1, "comment_made": 1,
}

BADGES = {
    "langkah-pertama":   ("Langkah Pertama", "bronze", "Membuat aset pertama"),
    "berbagi-ilmu":      ("Berbagi Ilmu",    "silver", "Menerbitkan course pertama"),
    "populer":           ("Populer",         "silver", "Aset mencapai 50 suka"),
    "kontributor-aktif": ("Kontributor Aktif","bronze", "Membuka 10 diskusi"),
    "juara":             ("Juara",           "gold",   "Peringkat 1 leaderboard kompetisi"),
    # ---- sosial (baru) ----
    "terhubung":         ("Terhubung",       "bronze", "Memiliki 10 pengikut"),
    "berpengaruh":       ("Berpengaruh",     "gold",   "Memiliki 500 pengikut"),
    "ramai":             ("Ramai",           "silver", "Postingan mencapai 25 suka"),
}

async def award_reputation(db, user, reason, points=None):
    user.reputation = (user.reputation or 0) + (points if points is not None else POINTS.get(reason, 0))
    await db.commit()

async def award_badge(db, user_id, badge_id):
    if badge_id not in BADGES: return
    if not (await db.execute(select(UserBadge).where(
            UserBadge.user_id == user_id, UserBadge.badge_id == badge_id))).scalar_one_or_none():
        db.add(UserBadge(user_id=user_id, badge_id=badge_id)); await db.commit()
```

## 25.4 Pasang pemicu — termasuk sosial (Langkah 24)

Selain pemicu non-sosial (lihat tabel di bawah), tambahkan di endpoint sosial Langkah 24:

| Aksi sosial | Lokasi (Langkah 24) | Panggilan |
|---|---|---|
| Diikuti orang | `POST /users/{username}/follow` | `award_reputation(db, target, "follow_received")`; lalu hitung pengikut target → `terhubung` (≥10), `berpengaruh` (≥500) |
| Postingan disukai | `POST /posts/{id}/like` | `award_reputation(db, author, "post_like_received")`; bila `post.like_count == 25` → `award_badge(author, "ramai")` |
| Berkomentar | `POST /posts/{id}/comments` | `award_reputation(db, commenter, "comment_made")` |

Pemicu non-sosial (sama seperti sebelumnya): buat aset → `asset_published` + `langkah-pertama`; aset disukai → `like_received` + `populer` (50); course terbit → `berbagi-ilmu`; submission dinilai → `submission_scored`; utas/post forum → `forum_*` + `kontributor-aktif` (10); lesson terakhir → `course_completed`; juara kompetisi → `juara`.

> Jangan beri reputasi untuk aksi pada milik sendiri (menyukai/mengikuti diri sendiri sudah dicegah; lewati bila `target == actor`).

## 25.5 Tegakkan hak/batas

Ganti angka *hardcoded* dengan `perks_for(user.reputation)`:

- **Upload aset** (Langkah 15): `upload_max_mb`.
- **Submission harian** (Langkah 19): `c.daily_submission_limit + daily_submission_bonus`.
- **Kuota notebook** (Langkah 22): tolak buat bila jumlah ≥ `notebook_quota`.
- **Prioritas event** (Langkah 21): bila `event_priority` & penuh → tetap `registered`.
- **Buat event**: hanya bila `can_create_event`.
- **Postingan (Langkah 24):** tolak bila jumlah post hari ini ≥ `daily_post_limit`; batasi `len(images) ≤ post_image_max`.

Contoh penegakan batas postingan di `create_post`:

```python
from datetime import datetime, timezone
from app.modules.gamification.tiers import perks_for

perks = perks_for(user.reputation)
start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
today = (await db.execute(select(func.count()).select_from(Post).where(
    Post.author_id == user.id, Post.created_at >= start))).scalar_one()
if today >= perks["daily_post_limit"]:
    raise ApiError(429, "limit_reached", "Batas postingan harian tercapai")
if len(body.get("images", [])) > perks["post_image_max"]:
    raise ApiError(422, "too_many_images", f"Maksimal {perks['post_image_max']} gambar")
```

## 25.6 Endpoint

```python
# app/modules/gamification/router.py
from app.modules.gamification.tiers import tier_for, perks_for
from app.modules.gamification.service import BADGES
from app.modules.gamification.models import UserBadge

router = APIRouter(tags=["gamification"])

@router.get("/me/gamification")
async def my_gamification(user=Depends(get_current_user), db=Depends(get_db)):
    earned = {b.badge_id for b in (await db.execute(select(UserBadge).where(
        UserBadge.user_id == user.id))).scalars().all()}
    return {"tier": tier_for(user.reputation), "perks": perks_for(user.reputation),
            "badges": [{"id": i, "name": n, "tier": t, "description": d, "earned": i in earned}
                       for i, (n, t, d) in BADGES.items()]}

@router.get("/leaderboard/contributors")
async def contributors(p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(User).order_by(User.reputation.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([{"rank": p.offset + i + 1, "reputation": u.reputation,
                       "tier": tier_for(u.reputation)["name"],
                       "user": {"username": u.username, "type": "org" if u.role == "org_admin" else "user",
                                "avatar_url": u.avatar_url, "is_official": u.is_official}}
                      for i, u in enumerate(rows)], total, p)
```

Sertakan `reputation`, `tier`, `badges` (earned) di `GET /users/{username}` & `/me`. Wire router di `main.py`.

## 25.7 Pembaruan Kontrak (Bagian 8)

- Profil **+** `reputation`, `tier {level,name,reputation,next_at}`, `badges: string[]`.
- `Perks` **+** `daily_post_limit`, `post_image_max` (selain field sebelumnya).
- Endpoint `GET /me/gamification`, `GET /leaderboard/contributors` (seperti sebelumnya).

## Selesai bila

- [ ] Aksi sosial (diikuti, postingan disukai, komentar) menambah reputasi; badge sosial diberikan.
- [ ] Batas postingan harian & jumlah gambar mengikuti tier.
- [ ] Seluruh hak/batas (upload, submission, notebook, event) mengikuti tier.
- [ ] `GET /me/gamification` menampilkan badge sosial + non-sosial; leaderboard kontributor benar.
- [ ] Tidak ada reputasi dari aksi pada milik sendiri.
