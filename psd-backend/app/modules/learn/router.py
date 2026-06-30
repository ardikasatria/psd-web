from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional, require_instructor
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.storage import upload_asset
from app.modules.categories.service import apply_category_body, filter_by_category_slugs, load_category_refs
from app.modules.gamification.service import after_course_published, award_reputation
from app.modules.gamification.tiers import tier_slug_for_reputation
from app.modules.learn.models import Course, Enrollment, LearningPath, LessonProgress, Notebook
from app.modules.learn.path_utils import apply_path_payload, path_detail, path_summary
from app.modules.learn.notebooks import colab_url
from app.modules.notebook.launch import (
    hub_runtime_status,
    launch_notebook,
    stop_server_runtime,
    user_tier_slug,
)
from app.modules.notebook_kernel.grant import effective_notebook_tier
from app.modules.notebook.store import NotebookStore
from psd_notebook.policy import NotebookQuotaError
from psd_notebook import policy as nb_policy
from app.modules.notifications.service import notify_staff
from app.modules.teams.deps import membership, team_ref
from app.modules.teams.models import Team
from app.modules.users.models import User
from app.modules.users.refs import is_staff, owner_ref_dict

router = APIRouter(tags=["learn"])


def _public_modules(modules):
    out = []
    for m in modules or []:
        lessons = []
        for l in m.get("lessons", []):
            l2 = {**l}
            if l2.get("quiz"):
                l2["quiz"] = [
                    {"id": q["id"], "question": q["question"], "options": q["options"]}
                    for q in l2["quiz"]
                ]
            lessons.append(l2)
        out.append({**m, "lessons": lessons})
    return out


def _lesson_view(l, can_access, reveal_keys):
    out = {
        "id": l.get("id"),
        "title": l.get("title"),
        "type": l.get("type") or "reading",
        "duration_min": l.get("duration_min"),
    }
    if can_access:
        out.update(
            {
                "content_md": l.get("content_md"),
                "video_url": l.get("video_url"),
                "materials": l.get("materials", []),
            }
        )
        if l.get("quiz"):
            out["quiz"] = (
                l["quiz"]
                if reveal_keys
                else [{"id": q["id"], "question": q["question"], "options": q["options"]} for q in l["quiz"]]
            )
    else:
        out["locked"] = True
    return out


async def _active_enrollment(db, slug, user):
    if not user:
        return None
    e = (
        await db.execute(
            select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_slug == slug)
        )
    ).scalar_one_or_none()
    if not e:
        return None
    if e.expires_at and e.expires_at < datetime.now(timezone.utc):
        return "expired"
    return e


async def _course_stats(db, c):
    total_lessons = sum(len(m.get("lessons", [])) for m in (c.modules or []))
    enrolled = (
        await db.execute(
            select(func.count()).select_from(Enrollment).where(Enrollment.course_slug == c.slug)
        )
    ).scalar_one()
    completed = 0
    if total_lessons:
        sub = (
            select(LessonProgress.user_id)
            .where(LessonProgress.course_slug == c.slug)
            .group_by(LessonProgress.user_id)
            .having(func.count(LessonProgress.lesson_id) >= total_lessons)
        ).subquery()
        completed = (await db.execute(select(func.count()).select_from(sub))).scalar_one()
    return {
        "enrolled": enrolled,
        "completed": completed,
        "lessons": total_lessons,
        "completion_rate": round(completed / enrolled * 100) if enrolled else 0,
    }


def _total_minutes(modules):
    return sum(l.get("duration_min", 0) for m in (modules or []) for l in m.get("lessons", []))


async def _owned_course(db, slug, user):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Course tidak ditemukan")
    if c.author_id != user.id and user.role not in ("moderator", "superadmin"):
        raise ApiError(403, "forbidden", "Bukan pemilik course")
    return c


def _author_ref(author: User | None) -> dict | None:
    if not author:
        return None
    return owner_ref_dict(author)


def _course_summary(
    c: Course,
    author: User | None = None,
    *,
    include_review: bool = False,
    category=None,
    subcategory=None,
) -> dict:
    out = {
        "slug": c.slug,
        "title": c.title,
        "level": c.level,
        "lessons_count": c.lessons_count,
        "cover_url": c.cover_url,
        "status": c.status,
        "author": _author_ref(author),
        "category": category,
        "subcategory": subcategory,
    }
    if include_review:
        out["review_note"] = c.review_note
    return out


async def _get_author(db: AsyncSession, author_id: str | None) -> User | None:
    if not author_id:
        return None
    return (await db.execute(select(User).where(User.id == author_id))).scalar_one_or_none()


@router.get("/courses")
async def list_courses(
    level: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Course).where(Course.status == "published")
    if level:
        stmt = stmt.where(Course.level == level)
    stmt = await filter_by_category_slugs(db, stmt, Course, category, subcategory)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = []
    for c in rows:
        author = await _get_author(db, c.author_id)
        cat, sub = await load_category_refs(db, c.category_id, c.subcategory_id)
        items.append(_course_summary(c, author, category=cat, subcategory=sub))
    return paginated(items, total, p)


@router.get("/courses/{slug}")
async def get_course(
    slug: str,
    user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Course tidak ditemukan")
    if c.status != "published":
        if not user or (c.author_id != user.id and not is_staff(user)):
            raise ApiError(404, "not_found", "Course tidak ditemukan")
    enrolled = False
    access_status = "none"
    enr = None
    if user:
        enr = await _active_enrollment(db, slug, user)
        has_enrollment = (
            await db.execute(
                select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_slug == slug)
            )
        ).scalar_one_or_none() is not None
        enrolled = has_enrollment
        if enr == "expired":
            access_status = "expired"
        elif enr is not None:
            access_status = "active"
    author = await _get_author(db, c.author_id)
    publisher = await _get_author(db, c.publisher_id)
    cat, sub = await load_category_refs(db, c.category_id, c.subcategory_id)
    is_owner_staff = bool(user and (c.author_id == user.id or is_staff(user)))
    can_access = is_owner_staff or (enr not in (None, "expired"))
    reveal = is_owner_staff
    modules = [
        {**m, "lessons": [_lesson_view(l, can_access, reveal) for l in m.get("lessons", [])]}
        for m in (c.modules or [])
    ]
    return {
        "slug": c.slug,
        "title": c.title,
        "level": c.level,
        "lessons_count": c.lessons_count,
        "cover_url": c.cover_url,
        "description": c.description,
        "requirements_md": c.requirements_md,
        "modules": modules,
        "status": c.status,
        "review_note": c.review_note,
        "total_duration_min": _total_minutes(c.modules),
        "author": _author_ref(author),
        "publisher": _author_ref(publisher),
        "enrolled": enrolled,
        "access_type": c.access_type or "lifetime",
        "access_days": c.access_days,
        "access_status": access_status,
        "stats": await _course_stats(db, c),
        "category": cat,
        "subcategory": sub,
    }


@router.post("/courses", status_code=201)
async def create_course(body: dict, user: User = Depends(require_instructor), db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(Course).where(Course.slug == body["slug"]))).scalar_one_or_none():
        raise ApiError(409, "exists", "Slug course sudah dipakai")
    c = Course(
        slug=body["slug"],
        title=body["title"],
        level=body.get("level", "pemula"),
        description=body.get("description", ""),
        requirements_md=body.get("requirements_md"),
        cover_url=body.get("cover_url"),
        modules=body.get("modules", []),
        author_id=user.id,
        status="draft",
    )
    await apply_category_body(db, body, c)
    db.add(c)
    await db.commit()
    return {"slug": c.slug}


@router.patch("/courses/{slug}")
async def edit_course(slug: str, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Course tidak ditemukan")
    if c.author_id != user.id and not is_staff(user):
        raise ApiError(403, "forbidden", "Bukan pemilik course")
    if "status" in body and user.role not in ("moderator", "superadmin"):
        body.pop("status")
    if c.status == "pending_review" and user.role not in ("moderator", "superadmin"):
        raise ApiError(409, "locked", "Course sedang ditinjau, tidak bisa diubah")
    for k in ("title", "level", "description", "requirements_md", "cover_url", "modules", "status", "access_type", "access_days"):
        if k in body:
            setattr(c, k, body[k])
    await apply_category_body(db, body, c)
    if body.get("status") == "published" and not c.published_at:
        c.published_at = datetime.now(timezone.utc)
    await db.commit()
    if body.get("status") == "published" and is_staff(user):
        author = await _get_author(db, c.author_id)
        if author:
            await after_course_published(db, author)
    return {"slug": c.slug}


@router.post("/courses/{slug}/submit-review")
async def submit_review(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Course tidak ditemukan")
    if c.author_id != user.id and user.role not in ("moderator", "superadmin"):
        raise ApiError(403, "forbidden", "Bukan pemilik course")
    if c.status not in ("draft", "rejected"):
        raise ApiError(400, "invalid_state", "Hanya draft/ditolak yang bisa diajukan")
    c.status = "pending_review"
    c.review_note = None
    await db.commit()
    await notify_staff(
        db,
        "course",
        f"Course menunggu review: {c.title}",
        body=f"Diajukan oleh {user.username}",
        link="/admin/courses/review",
        actor_id=user.id,
    )
    return {"status": c.status}


@router.post("/courses/{slug}/materials", status_code=201)
async def upload_material(
    slug: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _owned_course(db, slug, user)
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise ApiError(413, "too_large", "Maks 50 MB")
    name = file.filename or f"materi-{uuid.uuid4().hex}"
    url = upload_asset(
        f"courses/{slug}/{uuid.uuid4().hex}-{name}",
        data,
        file.content_type or "application/octet-stream",
    )
    return {
        "name": name,
        "url": url,
        "size_bytes": len(data),
        "type": file.content_type or "application/octet-stream",
    }


@router.get("/me/courses/authored")
async def authored_courses(user: User = Depends(require_instructor), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Course)
            .where(Course.author_id == user.id)
            .order_by(Course.slug)
        )
    ).scalars().all()
    items = []
    for c in rows:
        author = await _get_author(db, c.author_id)
        items.append(_course_summary(c, author, include_review=True))
    return items


@router.post("/courses/{slug}/enroll", status_code=201)
async def enroll(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    c = (
        await db.execute(select(Course).where(Course.slug == slug, Course.status == "published"))
    ).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Course tidak ditemukan")
    existing = (
        await db.execute(
            select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_slug == slug)
        )
    ).scalar_one_or_none()
    expires = None
    if c.access_type == "limited" and c.access_days:
        expires = datetime.now(timezone.utc) + timedelta(days=c.access_days)
    if existing:
        existing.expires_at = expires
    else:
        db.add(Enrollment(user_id=user.id, course_slug=slug, expires_at=expires))
    await db.commit()
    return {"enrolled": True, "expires_at": expires}


@router.post("/courses/{slug}/lessons/{lesson_id}/complete")
async def complete_lesson(
    slug: str,
    lesson_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    enr = await _active_enrollment(db, slug, user)
    if enr is None:
        raise ApiError(403, "not_enrolled", "Daftar dulu untuk menyelesaikan pelajaran")
    if enr == "expired":
        raise ApiError(403, "access_expired", "Akses course telah berakhir")
    if not (
        await db.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user.id,
                LessonProgress.course_slug == slug,
                LessonProgress.lesson_id == lesson_id,
            )
        )
    ).scalar_one_or_none():
        db.add(LessonProgress(user_id=user.id, course_slug=slug, lesson_id=lesson_id))
        await db.commit()
        c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
        if c and c.modules:
            lesson_ids = [les.get("id") for m in c.modules for les in m.get("lessons", []) if les.get("id")]
            if lesson_ids:
                done = (
                    await db.execute(
                        select(func.count()).select_from(LessonProgress).where(
                            LessonProgress.user_id == user.id,
                            LessonProgress.course_slug == slug,
                            LessonProgress.lesson_id.in_(lesson_ids),
                        )
                    )
                ).scalar_one()
                if done >= len(lesson_ids):
                    await award_reputation(db, user, "course_completed")
    return {"ok": True}


@router.get("/courses/{slug}/learners")
async def learners(
    slug: str,
    p: PageParams = Depends(page_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = await _owned_course(db, slug, user)
    total_lessons = sum(len(m.get("lessons", [])) for m in (c.modules or []))
    prog = dict(
        (uid, n)
        for uid, n in (
            await db.execute(
                select(LessonProgress.user_id, func.count(LessonProgress.lesson_id))
                .where(LessonProgress.course_slug == slug)
                .group_by(LessonProgress.user_id)
            )
        ).all()
    )
    stmt = (
        select(Enrollment, User)
        .join(User, Enrollment.user_id == User.id)
        .where(Enrollment.course_slug == slug)
        .order_by(Enrollment.created_at.desc())
    )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    items = []
    for e, u in rows:
        done = prog.get(u.id, 0)
        items.append(
            {
                "user": {"username": u.username, "name": u.name, "avatar_url": u.avatar_url},
                "enrolled_at": e.created_at,
                "expires_at": e.expires_at,
                "completed": done,
                "total": total_lessons,
                "percent": round(done / total_lessons * 100) if total_lessons else 0,
            }
        )
    return paginated(items, total, p)


@router.post("/courses/{slug}/lessons/{lid}/quiz/submit")
async def submit_quiz(
    slug: str,
    lid: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Course tidak ditemukan")
    if not (
        await db.execute(
            select(Enrollment).where(Enrollment.user_id == user.id, Enrollment.course_slug == slug)
        )
    ).scalar_one_or_none():
        raise ApiError(403, "not_enrolled", "Daftar dulu untuk mengerjakan quiz")
    enr = await _active_enrollment(db, slug, user)
    if enr == "expired":
        raise ApiError(403, "access_expired", "Akses course telah berakhir")
    lesson = next(
        (l for m in (c.modules or []) for l in m.get("lessons", []) if l.get("id") == lid),
        None,
    )
    if not lesson or not lesson.get("quiz"):
        raise ApiError(404, "not_found", "Quiz tidak ditemukan")
    quiz = lesson["quiz"]
    answers = body.get("answers", [])
    correct = sum(1 for q, a in zip(quiz, answers) if q.get("answer_index") == a)
    total = len(quiz)
    score = round(correct / total * 100) if total else 0
    passed = score >= 60
    if passed and not (
        await db.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user.id,
                LessonProgress.course_slug == slug,
                LessonProgress.lesson_id == lid,
            )
        )
    ).scalar_one_or_none():
        db.add(LessonProgress(user_id=user.id, course_slug=slug, lesson_id=lid))
        await db.commit()
    review = [
        {
            "id": q["id"],
            "correct_index": q.get("answer_index"),
            "explanation": q.get("explanation"),
        }
        for q in quiz
    ]
    return {
        "score": score,
        "correct": correct,
        "total": total,
        "passed": passed,
        "review": review,
    }


@router.get("/learning-paths")
async def list_paths(p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    stmt = select(LearningPath)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [path_summary(lp) for lp in rows]
    return paginated(items, total, p)


@router.get("/learning-paths/{slug}")
async def get_path(slug: str, db: AsyncSession = Depends(get_db)):
    lp = (await db.execute(select(LearningPath).where(LearningPath.slug == slug))).scalar_one_or_none()
    if not lp:
        raise ApiError(404, "not_found", "Learning path tidak ditemukan")
    return path_detail(lp)


async def _resolve_notebook_team_id(db: AsyncSession, team_id: str | None, user: User) -> str | None:
    if not team_id:
        return None
    t = (await db.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Tim tidak ditemukan")
    if not await membership(db, t.id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota tim")
    return t.id


async def _can_edit_notebook(db: AsyncSession, n: Notebook, user: User) -> None:
    if n.owner_id == user.id or is_staff(user):
        return
    if n.team_id and await membership(db, n.team_id, user.id):
        return
    raise ApiError(403, "forbidden", "Bukan pemilik notebook")


async def _notebook_payload(db: AsyncSession, n: Notebook) -> dict:
    cat, sub = await load_category_refs(db, n.category_id, n.subcategory_id)
    tm = await team_ref(db, n.team_id)
    return {
        "id": n.id,
        "title": n.title,
        "description": n.description,
        "tags": n.tags,
        "owner": _nb_owner(n),
        "source_url": n.source_url,
        "colab_url": colab_url(n.source_url),
        "category": cat,
        "subcategory": sub,
        "team": tm,
    }


async def _notebook_summary(db: AsyncSession, n: Notebook) -> dict:
    cat, sub = await load_category_refs(db, n.category_id, n.subcategory_id)
    tm = await team_ref(db, n.team_id)
    return {
        "id": n.id,
        "title": n.title,
        "tags": n.tags,
        "owner": _nb_owner(n),
        "source_url": n.source_url,
        "category": cat,
        "subcategory": sub,
        "team": tm,
    }


@router.get("/notebooks")
async def list_notebooks(
    q: str | None = None,
    category: str | None = None,
    subcategory: str | None = None,
    team: str | None = None,
    mine: bool = False,
    p: PageParams = Depends(page_params),
    user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Notebook).options(selectinload(Notebook.owner))
    if mine:
        if not user:
            raise ApiError(401, "unauthorized", "Login diperlukan untuk melihat notebook Anda.")
        stmt = stmt.where(Notebook.owner_id == user.id)
    if q:
        stmt = stmt.where(Notebook.title.ilike(f"%{q}%"))
    stmt = await filter_by_category_slugs(db, stmt, Notebook, category, subcategory)
    if team:
        t = (await db.execute(select(Team).where(Team.slug == team))).scalar_one_or_none()
        if t:
            stmt = stmt.where(Notebook.team_id == t.id)
        else:
            stmt = stmt.where(Notebook.id == "__none__")
    stmt = stmt.order_by(Notebook.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [await _notebook_summary(db, n) for n in rows]
    return paginated(items, total, p)


def _nb_owner(n: Notebook) -> dict:
    return owner_ref_dict(n.owner)


@router.get("/notebooks/me/usage")
async def notebook_usage(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    store = NotebookStore(db)
    tier = await effective_notebook_tier(db, user, await user_tier_slug(user))
    lim = nb_policy.limits_for(tier)
    owned = await store.count(user.id)
    return {
        "tier": tier,
        "owned": owned,
        "limits": {
            "max_notebooks": lim.max_notebooks,
            "max_concurrent_kernels": lim.max_concurrent_kernels,
            "runtime": lim.runtime,
            "cpu": lim.cpu,
            "mem_gb": lim.mem_gb,
        },
    }


@router.get("/notebooks/{nb_id}")
async def get_notebook(nb_id: str, db: AsyncSession = Depends(get_db)):
    n = (
        await db.execute(
            select(Notebook).options(selectinload(Notebook.owner)).where(Notebook.id == nb_id)
        )
    ).scalar_one_or_none()
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    return await _notebook_payload(db, n)


@router.post("/notebooks", status_code=201)
async def create_notebook(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    store = NotebookStore(db)
    tier = tier_slug_for_reputation(user.reputation or 0)
    try:
        nb_policy.check_can_create(tier, await store.count(user.id))
    except NotebookQuotaError as exc:
        raise ApiError(429, "limit_reached", str(exc)) from exc
    team_id = await _resolve_notebook_team_id(db, body.get("team_id"), user)
    n = await store.create(user.id, body["title"])
    n.description = body.get("description", "")
    n.tags = body.get("tags", [])
    n.source_url = body.get("source_url")
    n.team_id = team_id
    await apply_category_body(db, body, n)
    await db.commit()
    await db.refresh(n)
    return await get_notebook(n.id, db)


@router.get("/notebooks/{nb_id}/content")
async def get_notebook_content(
    nb_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    store = NotebookStore(db)
    n = await store.get(nb_id)
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    await _can_edit_notebook(db, n, user)
    content = await store.content_or_blank(n)
    await db.commit()
    return {"id": n.id, "content": content}


@router.put("/notebooks/{nb_id}/content")
async def put_notebook_content(
    nb_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    store = NotebookStore(db)
    n = await store.get(nb_id)
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    await _can_edit_notebook(db, n, user)
    content = body.get("content")
    if not isinstance(content, dict) or "cells" not in content:
        raise ApiError(400, "invalid_body", "Field 'content' harus objek .ipynb dengan 'cells'.")
    await store.save_content(n, content)
    await db.commit()
    return {"id": n.id, "saved": True}


@router.post("/notebooks/{nb_id}/launch")
async def launch_notebook_endpoint(
    nb_id: str,
    body: dict,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    n = (await db.execute(select(Notebook).where(Notebook.id == nb_id))).scalar_one_or_none()
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    await _can_edit_notebook(db, n, user)
    tier = await effective_notebook_tier(db, user, await user_tier_slug(user))
    api_base = f"{request.url.scheme}://{request.url.netloc}/api/v1"
    out = await launch_notebook(
        tier=tier,
        requested_runtime=body.get("runtime"),
        user_id=user.id,
        username=user.username,
        api_base=api_base,
    )
    return {"notebook_id": n.id, **out}


@router.post("/notebooks/{nb_id}/stop")
async def stop_notebook_runtime(
    nb_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    n = (await db.execute(select(Notebook).where(Notebook.id == nb_id))).scalar_one_or_none()
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    await _can_edit_notebook(db, n, user)
    return await stop_server_runtime(user_id=user.id, username=user.username)


@router.get("/notebooks/runtime/status")
async def notebook_runtime_status(user: User = Depends(get_current_user)):
    return hub_runtime_status(user.username)


@router.patch("/notebooks/{nb_id}")
async def update_notebook(
    nb_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    n = (
        await db.execute(
            select(Notebook).options(selectinload(Notebook.owner)).where(Notebook.id == nb_id)
        )
    ).scalar_one_or_none()
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    await _can_edit_notebook(db, n, user)
    for k in ("title", "description", "tags", "source_url"):
        if k in body:
            setattr(n, k, body[k])
    await apply_category_body(db, body, n)
    await db.commit()
    return await get_notebook(n.id, db)


@router.delete("/notebooks/{nb_id}", status_code=204)
async def delete_notebook(
    nb_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    n = (await db.execute(select(Notebook).where(Notebook.id == nb_id))).scalar_one_or_none()
    if n:
        await _can_edit_notebook(db, n, user)
        await db.delete(n)
        await db.commit()
