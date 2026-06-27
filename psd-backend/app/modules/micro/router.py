from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, require_staff
from app.core.errors import ApiError
from app.modules.gamification.service import award_badge, award_reputation
from app.modules.learn.models import LessonProgress
from app.modules.micro.models import MicroCompletion, MicroLesson

router = APIRouter(tags=["micro"])


def _public(m: MicroLesson) -> dict:
    quiz = [{"id": q["id"], "question": q["question"], "options": q["options"]} for q in (m.quiz or [])]
    return {
        "slug": m.slug,
        "title": m.title,
        "content_md": m.content_md,
        "duration_min": m.duration_min,
        "quiz": quiz,
        "has_quiz": bool(m.quiz),
    }


@router.get("/micro/daily")
async def daily(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    done = {
        c.micro_id
        for c in (
            await db.execute(select(MicroCompletion).where(MicroCompletion.user_id == user.id))
        ).scalars().all()
    }
    rows = (
        await db.execute(
            select(MicroLesson)
            .where(MicroLesson.active.is_(True))
            .order_by(MicroLesson.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    todo = [m for m in rows if m.id not in done][:5]
    return {
        "items": [
            {
                "slug": m.slug,
                "title": m.title,
                "duration_min": m.duration_min,
                "has_quiz": bool(m.quiz),
            }
            for m in todo
        ]
    }


@router.get("/micro/{slug}")
async def get_micro(slug: str, db: AsyncSession = Depends(get_db)):
    m = (await db.execute(select(MicroLesson).where(MicroLesson.slug == slug))).scalar_one_or_none()
    if not m or not m.active:
        raise ApiError(404, "not_found", "Micro-lesson tidak ditemukan")
    return _public(m)


@router.post("/micro/{slug}/complete")
async def complete(slug: str, body: dict, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    m = (await db.execute(select(MicroLesson).where(MicroLesson.slug == slug))).scalar_one_or_none()
    if not m or not m.active:
        raise ApiError(404, "not_found", "Micro-lesson tidak ditemukan")

    result = None
    if m.quiz:
        answers = body.get("answers", [])
        correct = sum(1 for q, a in zip(m.quiz, answers) if q.get("answer_index") == a)
        result = {
            "score": round(correct / len(m.quiz) * 100) if m.quiz else 0,
            "correct": correct,
            "total": len(m.quiz),
            "review": [
                {
                    "id": q["id"],
                    "correct_index": q.get("answer_index"),
                    "explanation": q.get("explanation"),
                }
                for q in m.quiz
            ],
        }

    first = not (
        await db.execute(
            select(MicroCompletion).where(
                MicroCompletion.user_id == user.id, MicroCompletion.micro_id == m.id
            )
        )
    ).scalar_one_or_none()

    if first:
        db.add(MicroCompletion(user_id=user.id, micro_id=m.id))
        await db.commit()
        await award_reputation(db, user, "micro_completed", points=1)

    return {"completed": True, "quiz": result, "first_completion": first}


@router.get("/me/streak")
async def streak(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lesson_days = (
        await db.execute(select(LessonProgress.completed_at).where(LessonProgress.user_id == user.id))
    ).scalars().all()
    micro_days = (
        await db.execute(select(MicroCompletion.completed_at).where(MicroCompletion.user_id == user.id))
    ).scalars().all()

    days = sorted({d.astimezone(timezone.utc).date() for d in list(lesson_days) + list(micro_days) if d})
    dayset = set(days)
    today = datetime.now(timezone.utc).date()

    active_today = today in dayset
    yesterday = today - timedelta(days=1)
    anchor = today if active_today else (yesterday if yesterday in dayset else None)

    current = 0
    if anchor:
        d = anchor
        while d in dayset:
            current += 1
            d -= timedelta(days=1)

    longest = 0
    run = 0
    prev: date | None = None
    for d in days:
        run = run + 1 if (prev and d - prev == timedelta(days=1)) else 1
        longest = max(longest, run)
        prev = d

    monday = today - timedelta(days=today.weekday())
    weekly_done = sum(1 for d in dayset if d >= monday)
    weekly_goal = 4

    if current >= 7:
        await award_badge(db, user.id, "konsisten")

    return {
        "current_streak": current,
        "longest_streak": longest,
        "active_today": active_today,
        "weekly_done": weekly_done,
        "weekly_goal": weekly_goal,
        "calendar": [
            {"date": str(today - timedelta(days=i)), "active": (today - timedelta(days=i)) in dayset}
            for i in range(29, -1, -1)
        ],
    }


@router.get("/admin/micro", dependencies=[Depends(require_staff)])
async def list_micro_admin(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(select(MicroLesson).order_by(MicroLesson.created_at.desc()))
    ).scalars().all()
    return [
        {
            "slug": m.slug,
            "title": m.title,
            "duration_min": m.duration_min,
            "active": m.active,
            "has_quiz": bool(m.quiz),
        }
        for m in rows
    ]


@router.get("/admin/micro/{slug}", dependencies=[Depends(require_staff)])
async def get_micro_admin(slug: str, db: AsyncSession = Depends(get_db)):
    m = (await db.execute(select(MicroLesson).where(MicroLesson.slug == slug))).scalar_one_or_none()
    if not m:
        raise ApiError(404, "not_found", "Tidak ditemukan")
    return {
        "slug": m.slug,
        "title": m.title,
        "content_md": m.content_md,
        "duration_min": m.duration_min,
        "category_id": m.category_id,
        "active": m.active,
        "quiz": m.quiz or [],
        "has_quiz": bool(m.quiz),
    }


@router.post("/admin/micro", status_code=201, dependencies=[Depends(require_staff)])
async def create_micro(body: dict, db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(MicroLesson).where(MicroLesson.slug == body["slug"]))).scalar_one_or_none():
        raise ApiError(409, "exists", "Slug sudah ada")
    db.add(
        MicroLesson(
            slug=body["slug"],
            title=body["title"],
            content_md=body.get("content_md", ""),
            duration_min=body.get("duration_min", 5),
            category_id=body.get("category_id"),
            quiz=body.get("quiz", []),
        )
    )
    await db.commit()
    return {"slug": body["slug"]}


@router.patch("/admin/micro/{slug}", dependencies=[Depends(require_staff)])
async def update_micro(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    m = (await db.execute(select(MicroLesson).where(MicroLesson.slug == slug))).scalar_one_or_none()
    if not m:
        raise ApiError(404, "not_found", "Tidak ditemukan")
    for k in ("title", "content_md", "duration_min", "category_id", "quiz", "active"):
        if k in body:
            setattr(m, k, body[k])
    await db.commit()
    return {"slug": m.slug}
