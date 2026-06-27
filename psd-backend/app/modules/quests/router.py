from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, require_staff
from app.core.errors import ApiError
from app.modules.gamification.service import award_badge, award_reputation
from app.modules.quests.eval import eval_step
from app.modules.quests.models import Quest, QuestClaim
from app.modules.users.models import User

router = APIRouter(tags=["quests"])


async def _quest_progress(db: AsyncSession, user: User, q: Quest, claimed: set[str]) -> dict:
    steps = []
    for s in q.steps:
        steps.append(
            {
                **{k: s.get(k) for k in ("id", "title", "type", "target", "description")},
                "done": await eval_step(db, user, s),
            }
        )
    done_count = sum(1 for s in steps if s["done"])
    total = len(steps)
    complete = done_count == total and total > 0
    return {
        "slug": q.slug,
        "title": q.title,
        "description": q.description,
        "steps": steps,
        "progress": {"done": done_count, "total": total},
        "reward_reputation": q.reward_reputation,
        "reward_badge": q.reward_badge,
        "complete": complete,
        "claimed": q.slug in claimed,
        "claimable": complete and q.slug not in claimed,
    }


@router.get("/quests")
async def list_quests(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Quest).where(Quest.active.is_(True)))).scalars().all()
    return [
        {
            "slug": q.slug,
            "title": q.title,
            "description": q.description,
            "steps_count": len(q.steps),
            "reward_reputation": q.reward_reputation,
        }
        for q in rows
    ]


@router.get("/me/quests")
async def my_quests(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    quests = (await db.execute(select(Quest).where(Quest.active.is_(True)))).scalars().all()
    claimed = {
        c.quest_slug
        for c in (await db.execute(select(QuestClaim).where(QuestClaim.user_id == user.id))).scalars().all()
    }
    items = [await _quest_progress(db, user, q, claimed) for q in quests]
    return {"items": items}


@router.post("/me/quests/{slug}/claim")
async def claim(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = (
        await db.execute(select(Quest).where(Quest.slug == slug, Quest.active.is_(True)))
    ).scalar_one_or_none()
    if not q:
        raise ApiError(404, "not_found", "Quest tidak ditemukan")
    if not q.steps or not all([await eval_step(db, user, s) for s in q.steps]):
        raise ApiError(400, "incomplete", "Quest belum selesai")
    if (
        await db.execute(
            select(QuestClaim).where(QuestClaim.user_id == user.id, QuestClaim.quest_slug == slug)
        )
    ).scalar_one_or_none():
        raise ApiError(409, "claimed", "Hadiah sudah diklaim")
    db.add(QuestClaim(user_id=user.id, quest_slug=slug))
    await db.commit()
    if q.reward_reputation:
        await award_reputation(db, user, "quest", points=q.reward_reputation)
    if q.reward_badge:
        await award_badge(db, user.id, q.reward_badge)
    return {"claimed": True, "reward_reputation": q.reward_reputation, "reward_badge": q.reward_badge}


@router.get("/me/journey")
async def journey(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    checks = [
        ("complete_profile", None, "Lengkapi profil", "Bangun identitas Anda di komunitas", "/settings/profile"),
        ("complete_course", None, "Selesaikan satu course", "Mulai dari belajar terstruktur", "/learn"),
        ("submit_competition", None, "Buktikan di kompetisi", "Uji kemampuan dengan submission dinilai", "/competitions"),
        ("publish_asset", None, "Terbitkan aset", "Bangun portofolio dataset, model, atau proyek", "/projects/new"),
        ("reach_reputation", 50, "Naik ke Kontributor", "Aktif berkontribusi dan kumpulkan reputasi", "/me/gamification"),
    ]
    for t, target, title, desc, link in checks:
        if not await eval_step(db, user, {"type": t, "target": target}):
            return {"next": {"title": title, "description": desc, "cta_link": link}}
    return {
        "next": {
            "title": "Portofolio Anda kuat",
            "description": "Bersiap tampil di marketplace talenta (fase berikutnya).",
            "cta_link": f"/u/{user.username}",
        }
    }


@router.post("/admin/quests", status_code=201, dependencies=[Depends(require_staff)])
async def create_quest(body: dict, db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(Quest).where(Quest.slug == body["slug"]))).scalar_one_or_none():
        raise ApiError(409, "exists", "Slug quest sudah ada")
    q = Quest(
        slug=body["slug"],
        title=body["title"],
        description=body.get("description", ""),
        steps=body.get("steps", []),
        reward_reputation=body.get("reward_reputation", 0),
        reward_badge=body.get("reward_badge"),
        active=body.get("active", True),
    )
    db.add(q)
    await db.commit()
    return {"slug": q.slug}


@router.patch("/admin/quests/{slug}", dependencies=[Depends(require_staff)])
async def update_quest(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    q = (await db.execute(select(Quest).where(Quest.slug == slug))).scalar_one_or_none()
    if not q:
        raise ApiError(404, "not_found", "Quest tidak ditemukan")
    for k in ("title", "description", "steps", "reward_reputation", "reward_badge", "active"):
        if k in body:
            setattr(q, k, body[k])
    await db.commit()
    return {"slug": q.slug}
