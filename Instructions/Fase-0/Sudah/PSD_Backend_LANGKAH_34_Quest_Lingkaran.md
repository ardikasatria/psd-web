# Langkah 34 — Lingkaran Terpandu + Quest

> **Tujuan:** Quest yang memandu pengguna melewati lingkaran (belajar → buktikan → berpeluang), dengan langkah yang **diverifikasi dari aktivitas nyata**, plus "Langkah berikutnya" kontekstual. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 20, 19, 24, 25 (gamifikasi), 33 (kategori, opsional).

> Quest berpasangan dengan **learning path** sebagai tulang punggung alurnya: langkah "belajar" bisa menunjuk path/course.

## 34.1 Model — `app/modules/quests/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, JSON, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class Quest(Base):
    __tablename__ = "quests"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"qst_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default="")
    steps: Mapped[list] = mapped_column(JSON, default=list)   # [{id,title,type,target,description}]
    reward_reputation: Mapped[int] = mapped_column(Integer, default=0)
    reward_badge: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class QuestClaim(Base):
    __tablename__ = "quest_claims"
    __table_args__ = (UniqueConstraint("user_id", "quest_slug", name="uq_quest_claim"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"qcl_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    quest_slug: Mapped[str] = mapped_column(String, index=True)
    claimed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "quests"
docker compose exec backend alembic upgrade head
```

## 34.2 Evaluator langkah — `app/modules/quests/eval.py`

```python
from sqlalchemy import select, func
from app.modules.repos.models import Repo
from app.modules.learn.models import Course, Enrollment, LessonProgress, LearningPath
from app.modules.competitions.models import Submission
from app.modules.social.models import Post, Follow

async def _course_done(db, user, slug):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c: return False
    total = sum(len(m.get("lessons", [])) for m in (c.modules or []))
    done = (await db.execute(select(func.count()).select_from(LessonProgress).where(
        LessonProgress.user_id == user.id, LessonProgress.course_slug == slug))).scalar_one()
    return total > 0 and done >= total

async def eval_step(db, user, step) -> bool:
    t, target = step.get("type"), step.get("target")
    if t == "complete_profile":
        return bool(user.avatar_url) and bool(user.bio or user.about_md)
    if t == "reach_reputation":
        return (user.reputation or 0) >= int(target or 0)
    if t == "publish_asset":
        q = select(func.count()).select_from(Repo).where(Repo.owner_id == user.id)
        if target in ("dataset", "model", "project"): q = q.where(Repo.kind == target)
        return (await db.execute(q)).scalar_one() > 0
    if t == "submit_competition":
        return (await db.execute(select(func.count()).select_from(Submission).where(
            Submission.user_id == user.id, Submission.status == "scored"))).scalar_one() > 0
    if t == "make_post":
        return (await db.execute(select(func.count()).select_from(Post).where(Post.author_id == user.id))).scalar_one() > 0
    if t == "follow_user":
        return (await db.execute(select(func.count()).select_from(Follow).where(Follow.follower_id == user.id))).scalar_one() > 0
    if t == "complete_course":
        return await _course_done(db, user, target)
    if t == "complete_path":
        lp = (await db.execute(select(LearningPath).where(LearningPath.slug == target))).scalar_one_or_none()
        if not lp: return False
        for cs in (lp.course_slugs or []):
            if not await _course_done(db, user, cs): return False
        return bool(lp.course_slugs)
    return False
```

## 34.3 Endpoint quest — `app/modules/quests/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select
from app.core.db import get_db
from app.core.deps import get_current_user, require_staff
from app.core.errors import ApiError
from app.modules.quests.models import Quest, QuestClaim
from app.modules.quests.eval import eval_step
from app.modules.gamification.service import award_reputation, award_badge

router = APIRouter(tags=["quests"])

@router.get("/quests")
async def list_quests(db=Depends(get_db)):
    rows = (await db.execute(select(Quest).where(Quest.active == True))).scalars().all()
    return [{"slug": q.slug, "title": q.title, "description": q.description,
             "steps_count": len(q.steps), "reward_reputation": q.reward_reputation} for q in rows]

@router.get("/me/quests")
async def my_quests(user=Depends(get_current_user), db=Depends(get_db)):
    quests = (await db.execute(select(Quest).where(Quest.active == True))).scalars().all()
    claimed = {c.quest_slug for c in (await db.execute(select(QuestClaim).where(
        QuestClaim.user_id == user.id))).scalars().all()}
    out = []
    for q in quests:
        steps = []
        for s in q.steps:
            steps.append({**{k: s.get(k) for k in ("id", "title", "type", "target", "description")},
                          "done": await eval_step(db, user, s)})
        done_count = sum(1 for s in steps if s["done"])
        complete = done_count == len(steps) and len(steps) > 0
        out.append({"slug": q.slug, "title": q.title, "description": q.description, "steps": steps,
                    "progress": {"done": done_count, "total": len(steps)},
                    "reward_reputation": q.reward_reputation, "reward_badge": q.reward_badge,
                    "complete": complete, "claimed": q.slug in claimed,
                    "claimable": complete and q.slug not in claimed})
    return {"items": out}

@router.post("/me/quests/{slug}/claim")
async def claim(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    q = (await db.execute(select(Quest).where(Quest.slug == slug, Quest.active == True))).scalar_one_or_none()
    if not q: raise ApiError(404, "not_found", "Quest tidak ditemukan")
    if not all([await eval_step(db, user, s) for s in q.steps]) or not q.steps:
        raise ApiError(400, "incomplete", "Quest belum selesai")
    if (await db.execute(select(QuestClaim).where(QuestClaim.user_id == user.id,
            QuestClaim.quest_slug == slug))).scalar_one_or_none():
        raise ApiError(409, "claimed", "Hadiah sudah diklaim")
    db.add(QuestClaim(user_id=user.id, quest_slug=slug)); await db.commit()
    if q.reward_reputation: await award_reputation(db, user, "quest", points=q.reward_reputation)
    if q.reward_badge: await award_badge(db, user.id, q.reward_badge)
    return {"claimed": True, "reward_reputation": q.reward_reputation}
```

## 34.4 "Langkah berikutnya" (lingkaran terlihat)

```python
@router.get("/me/journey")
async def journey(user=Depends(get_current_user), db=Depends(get_db)):
    checks = [
        ("complete_profile", None, "Lengkapi profil", "Bangun identitas Anda", "/settings/profile"),
        ("complete_course", None, "Selesaikan satu course", "Mulai dari belajar", "/learn"),
        ("submit_competition", None, "Buktikan di kompetisi", "Uji kemampuanmu", "/competitions"),
        ("publish_asset", None, "Terbitkan aset", "Bangun portofolio (dataset/model/proyek)", "/projects/new"),
        ("reach_reputation", 50, "Naik ke Kontributor", "Aktif & berkontribusi", "/leaderboard"),
    ]
    for t, target, title, desc, link in checks:
        if not await eval_step(db, user, {"type": t, "target": target}):
            return {"next": {"title": title, "description": desc, "cta_link": link}}
    return {"next": {"title": "Portofolio Anda kuat", "description": "Bersiap tampil di marketplace talenta (Fase berikutnya).", "cta_link": "/u/" + user.username}}
```

## 34.5 Admin quest (staf)

```python
@router.post("/admin/quests", status_code=201, dependencies=[Depends(require_staff)])
async def create_quest(body: dict, db=Depends(get_db)):
    if (await db.execute(select(Quest).where(Quest.slug == body["slug"]))).scalar_one_or_none():
        raise ApiError(409, "exists", "Slug quest sudah ada")
    db.add(Quest(slug=body["slug"], title=body["title"], description=body.get("description", ""),
                 steps=body.get("steps", []), reward_reputation=body.get("reward_reputation", 0),
                 reward_badge=body.get("reward_badge")))
    await db.commit(); return {"slug": body["slug"]}

@router.patch("/admin/quests/{slug}", dependencies=[Depends(require_staff)])
async def update_quest(slug: str, body: dict, db=Depends(get_db)):
    q = (await db.execute(select(Quest).where(Quest.slug == slug))).scalar_one_or_none()
    if not q: raise ApiError(404, "not_found", "Quest tidak ditemukan")
    for k in ("title", "description", "steps", "reward_reputation", "reward_badge", "active"):
        if k in body: setattr(q, k, body[k])
    await db.commit(); return {"slug": q.slug}
```

Wire router di `main.py`. (Seed beberapa quest pembuka di `seed_content`, mis. "Mulai Perjalanan Sains Data".)

## 34.6 Pembaruan Kontrak (Bagian 8)

- Entitas `Quest { slug, title, description, steps:[{id,title,type,target,description,done?}], progress, reward_reputation, reward_badge, complete, claimed, claimable }`.
- `JourneyNext { title, description, cta_link }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/quests` | — | daftar quest |
| GET | `/me/quests` | ✓ | quest + progres terhitung |
| POST | `/me/quests/{slug}/claim` | ✓ | klaim hadiah (sekali) |
| GET | `/me/journey` | ✓ | langkah berikutnya |
| POST/PATCH | `/admin/quests[/{slug}]` | staf | kelola quest |

Tipe langkah: `complete_profile, complete_course(target), complete_path(target), submit_competition, publish_asset(target?), create_notebook, make_post, follow_user, reach_reputation(target)`.

## Selesai bila

- [ ] Quest menampilkan langkah dengan status terverifikasi dari aktivitas nyata.
- [ ] Klaim hadiah hanya saat semua langkah selesai; sekali saja (idempoten); reputasi/badge diberikan.
- [ ] `/me/journey` menunjukkan langkah berikutnya sesuai posisi pengguna di lingkaran.
- [ ] Staf dapat membuat/ubah quest.
