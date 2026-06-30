from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import require_staff, require_superadmin
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.community.models import Thread
from app.modules.competitions.models import Competition, CompetitionProposal, Submission
from app.modules.competitions import submission_review
from app.modules.competitions.service import submission_row_dict
from app.modules.teams.models import Team
from app.modules.competitions.proposals import proposal_dict, review_proposal
from app.modules.events.models import Event, EventProposal, EventRegistration
from app.modules.events.proposals import proposal_dict as event_proposal_dict
from app.modules.events.proposals import review_proposal as review_event_proposal
from app.modules.instructors.models import InstructorApplication
from app.modules.notebook_kernel.grant import apply_kernel_grant
from app.modules.notebook_kernel.models import NotebookKernelRequest
from app.modules.notifications.service import notify
from app.modules.learn.models import Course, LearningPath
from app.core.search import delete_competition_doc, delete_repo_doc, index_competition
from app.core.storage import upload_private, presigned_get
from app.modules.categories.service import apply_category_body
from app.modules.announcements.models import Announcement
from app.modules.gamification.service import after_course_published
from app.modules.repos.models import Repo
from app.modules.repos.schemas import to_summary
from app.modules.users.refs import ALLOWED_ROLES

from app.modules.users.models import User

router = APIRouter(tags=["admin"], dependencies=[Depends(require_staff)])


@router.get("/admin/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    async def c(model):
        return (await db.execute(select(func.count()).select_from(model))).scalar_one()

    return {
        "users": await c(User),
        "repos": await c(Repo),
        "competitions": await c(Competition),
        "events": await c(Event),
        "courses": await c(Course),
        "threads": await c(Thread),
    }


def _admin_user(u: User):
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "name": u.name,
        "role": u.role,
        "is_active": u.is_active,
        "created_at": u.created_at,
    }


@router.get("/admin/users", dependencies=[Depends(require_superadmin)])
async def list_users(
    q: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
    if q:
        stmt = stmt.where(or_(User.username.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))
    stmt = stmt.order_by(User.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_admin_user(u) for u in rows], total, p)


@router.patch("/admin/users/{user_id}", dependencies=[Depends(require_superadmin)])
async def update_user(user_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    if "role" in body:
        role = body["role"]
        if role not in ALLOWED_ROLES:
            raise ApiError(422, "validation_error", "Role tidak valid")
        u.role = role
    if "is_active" in body:
        u.is_active = bool(body["is_active"])
    await db.commit()
    await db.refresh(u)
    return _admin_user(u)


@router.delete("/admin/users/{user_id}", status_code=204, dependencies=[Depends(require_superadmin)])
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if u:
        await db.delete(u)
        await db.commit()


@router.post("/admin/competitions", status_code=201)
async def create_competition(body: dict, db: AsyncSession = Depends(get_db)):
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    c = Competition(**body)
    await apply_category_body(db, category_data, c)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    try:
        index_competition(c)
    except Exception:
        pass
    return {"slug": c.slug}


@router.patch("/admin/competitions/{slug}")
async def update_competition(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kompetisi tidak ditemukan")
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    for k, v in body.items():
        setattr(c, k, v)
    if category_data:
        await apply_category_body(db, category_data, c)
    await db.commit()
    await db.refresh(c)
    try:
        index_competition(c)
    except Exception:
        pass
    return {"slug": c.slug}


@router.delete("/admin/competitions/{slug}", status_code=204)
async def delete_competition(slug: str, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if c:
        try:
            delete_competition_doc(c.id)
        except Exception:
            pass
        await db.delete(c)
        await db.commit()


@router.post("/admin/competitions/{slug}/ground-truth")
async def upload_ground_truth(
    slug: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kompetisi tidak ditemukan")
    key = f"ground-truth/{c.id}.csv"
    upload_private(key, await file.read(), "text/csv")
    c.ground_truth_key = key
    await db.commit()
    return {"ok": True}


def _admin_submission_item(s: Submission, u: User, t: Team | None) -> dict:
    entrant_name = t.name if t else u.username
    return {
        **submission_row_dict(s),
        "entrant": {
            "kind": "team" if s.team_id else "user",
            "name": entrant_name,
            "username": u.username,
        },
        "submitted_at": s.created_at,
    }


@router.get("/admin/competitions/{slug}/submissions")
async def admin_list_submissions(
    slug: str,
    status: str = "submitted",
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kompetisi tidak ditemukan")
    stmt = (
        select(Submission, User, Team)
        .join(User, Submission.user_id == User.id)
        .outerjoin(Team, Submission.team_id == Team.id)
        .where(Submission.competition_id == c.id, Submission.status == status)
        .order_by(Submission.created_at.asc())
    )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    items = [_admin_submission_item(s, u, t) for s, u, t in rows]
    return paginated(items, total, p)


async def _admin_get_submission(db: AsyncSession, slug: str, sub_id: str) -> tuple[Competition, Submission]:
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kompetisi tidak ditemukan")
    s = (
        await db.execute(
            select(Submission).where(Submission.id == sub_id, Submission.competition_id == c.id)
        )
    ).scalar_one_or_none()
    if not s:
        raise ApiError(404, "not_found", "Submission tidak ditemukan")
    return c, s


def _review_error(exc: submission_review.ReviewError):
    raise ApiError(exc.status, exc.slug, exc.message)


@router.post("/admin/competitions/{slug}/submissions/{sub_id}/start-review")
async def admin_start_review(
    slug: str,
    sub_id: str,
    staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    _, s = await _admin_get_submission(db, slug, sub_id)
    try:
        s.status = submission_review.apply_action(s.status, "start_review")
    except submission_review.ReviewError as exc:
        _review_error(exc)
    await db.commit()
    return {"status": s.status}


@router.post("/admin/competitions/{slug}/submissions/{sub_id}/score")
async def admin_score_submission(
    slug: str,
    sub_id: str,
    body: dict,
    staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    c, s = await _admin_get_submission(db, slug, sub_id)
    try:
        sc = submission_review.validate_score(
            body.get("score"),
            max_score=c.max_score,
        )
        s.status = submission_review.apply_action(s.status, "score")
    except submission_review.ReviewError as exc:
        _review_error(exc)
    s.public_score = sc
    s.private_score = sc
    s.review_note = body.get("note")
    s.reviewed_by = staff.id
    s.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    u = (await db.execute(select(User).where(User.id == s.user_id))).scalar_one()
    await award_reputation(db, u, "submission_scored")
    return {"status": s.status, "score": sc}


@router.post("/admin/competitions/{slug}/submissions/{sub_id}/reject")
async def admin_reject_submission(
    slug: str,
    sub_id: str,
    body: dict,
    staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    _, s = await _admin_get_submission(db, slug, sub_id)
    try:
        s.status = submission_review.apply_action(s.status, "reject")
    except submission_review.ReviewError as exc:
        _review_error(exc)
    s.review_note = body.get("note")
    s.reviewed_by = staff.id
    s.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": s.status}


@router.post("/admin/competitions/{slug}/submissions/{sub_id}/reopen")
async def admin_reopen_submission(
    slug: str,
    sub_id: str,
    staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    _, s = await _admin_get_submission(db, slug, sub_id)
    try:
        s.status = submission_review.apply_action(s.status, "reopen")
    except submission_review.ReviewError as exc:
        _review_error(exc)
    s.public_score = None
    s.private_score = None
    await db.commit()
    return {"status": s.status}


@router.get("/admin/competition-proposals")
async def list_competition_proposals(
    status: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CompetitionProposal, User).join(User, CompetitionProposal.user_id == User.id)
    if status:
        stmt = stmt.where(CompetitionProposal.status == status)
    stmt = stmt.order_by(CompetitionProposal.submitted_at.desc().nullslast(), CompetitionProposal.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    items = []
    for prop, u in rows:
        slug = None
        if prop.competition_id:
            slug = (
                await db.execute(select(Competition.slug).where(Competition.id == prop.competition_id))
            ).scalar_one_or_none()
        items.append(await proposal_dict(db, prop, user=u, competition_slug=slug))
    return paginated(items, total, p)


@router.get("/admin/competition-proposals/{proposal_id}")
async def get_competition_proposal(proposal_id: str, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(CompetitionProposal, User)
            .join(User, CompetitionProposal.user_id == User.id)
            .where(CompetitionProposal.id == proposal_id)
        )
    ).one_or_none()
    if not row:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    prop, u = row
    slug = None
    if prop.competition_id:
        slug = (
            await db.execute(select(Competition.slug).where(Competition.id == prop.competition_id))
        ).scalar_one_or_none()
    return await proposal_dict(db, prop, user=u, competition_slug=slug)


@router.patch("/admin/competition-proposals/{proposal_id}/review")
async def review_competition_proposal(proposal_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    p = (
        await db.execute(select(CompetitionProposal).where(CompetitionProposal.id == proposal_id))
    ).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    action = body.get("action")
    note = body.get("review_note")
    slug = await review_proposal(db, p, action, note)
    return {"status": p.status, "competition_slug": slug}


@router.get("/admin/event-proposals")
async def list_event_proposals(
    status: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(EventProposal, User).join(User, EventProposal.user_id == User.id)
    if status:
        stmt = stmt.where(EventProposal.status == status)
    stmt = stmt.order_by(EventProposal.submitted_at.desc().nullslast(), EventProposal.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    items = []
    for prop, u in rows:
        slug = None
        if prop.event_id:
            slug = (await db.execute(select(Event.slug).where(Event.id == prop.event_id))).scalar_one_or_none()
        items.append(await event_proposal_dict(db, prop, user=u, event_slug=slug))
    return paginated(items, total, p)


@router.get("/admin/event-proposals/{proposal_id}")
async def get_event_proposal_admin(proposal_id: str, db: AsyncSession = Depends(get_db)):
    row = (
        await db.execute(
            select(EventProposal, User)
            .join(User, EventProposal.user_id == User.id)
            .where(EventProposal.id == proposal_id)
        )
    ).one_or_none()
    if not row:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    prop, u = row
    slug = None
    if prop.event_id:
        slug = (await db.execute(select(Event.slug).where(Event.id == prop.event_id))).scalar_one_or_none()
    return await event_proposal_dict(db, prop, user=u, event_slug=slug)


@router.patch("/admin/event-proposals/{proposal_id}/review")
async def review_event_proposal_admin(proposal_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(EventProposal).where(EventProposal.id == proposal_id))).scalar_one_or_none()
    if not p:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    slug = await review_event_proposal(db, p, body.get("action"), body.get("review_note"))
    return {"status": p.status, "event_slug": slug}


@router.post("/admin/events", status_code=201)
async def create_event(body: dict, db: AsyncSession = Depends(get_db)):
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    e = Event(**body)
    await apply_category_body(db, category_data, e)
    db.add(e)
    await db.commit()
    await db.refresh(e)
    return {"slug": e.slug}


@router.patch("/admin/events/{slug}")
async def update_event(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    e = (await db.execute(select(Event).where(Event.slug == slug))).scalar_one_or_none()
    if not e:
        raise ApiError(404, "not_found", "Event tidak ditemukan")
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    for k, v in body.items():
        setattr(e, k, v)
    if category_data:
        await apply_category_body(db, category_data, e)
    await db.commit()
    return {"slug": e.slug}


@router.delete("/admin/events/{slug}", status_code=204)
async def delete_event(slug: str, db: AsyncSession = Depends(get_db)):
    e = (await db.execute(select(Event).where(Event.slug == slug))).scalar_one_or_none()
    if e:
        await db.delete(e)
        await db.commit()


@router.get("/admin/events/{slug}/registrations")
async def event_registrations(
    slug: str,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    e = (await db.execute(select(Event).where(Event.slug == slug))).scalar_one_or_none()
    if not e:
        raise ApiError(404, "not_found", "Event tidak ditemukan")
    stmt = (
        select(EventRegistration, User)
        .join(User, EventRegistration.user_id == User.id)
        .where(EventRegistration.event_id == e.id)
        .order_by(EventRegistration.created_at.asc())
    )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    return paginated(
        [
            {
                "id": r.id,
                "status": r.status,
                "attended": r.attended,
                "user": {"username": u.username, "name": u.name, "avatar_url": u.avatar_url},
            }
            for r, u in rows
        ],
        total,
        p,
    )


@router.patch("/admin/events/{slug}/registrations/{reg_id}")
async def check_in_registration(
    slug: str,
    reg_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    r = (
        await db.execute(select(EventRegistration).where(EventRegistration.id == reg_id))
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Pendaftaran tidak ditemukan")
    r.attended = bool(body.get("attended", True))
    await db.commit()
    return {"id": r.id, "attended": r.attended}


@router.post("/admin/courses", status_code=201)
async def create_course(body: dict, db: AsyncSession = Depends(get_db)):
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    c = Course(**body)
    await apply_category_body(db, category_data, c)
    db.add(c)
    await db.commit()
    await db.refresh(c)
    return {"slug": c.slug}


@router.patch("/admin/courses/{slug}")
async def update_course(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kursus tidak ditemukan")
    category_data = {k: body.pop(k) for k in ("category", "subcategory") if k in body}
    for k, v in body.items():
        setattr(c, k, v)
    if category_data:
        await apply_category_body(db, category_data, c)
    await db.commit()
    return {"slug": c.slug}


@router.delete("/admin/courses/{slug}", status_code=204)
async def delete_course(slug: str, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if c:
        await db.delete(c)
        await db.commit()


@router.get("/admin/courses/review-queue")
async def review_queue(p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Course)
        .options(selectinload(Course.author))
        .where(Course.status == "pending_review")
        .order_by(Course.slug)
    )
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated(
        [
            {
                "slug": c.slug,
                "title": c.title,
                "level": c.level,
                "author": (
                    {"username": c.author.username, "avatar_url": c.author.avatar_url, "type": "org" if c.author.account_type == "organization" else "user"}
                    if c.author
                    else None
                ),
            }
            for c in rows
        ],
        total,
        p,
    )


@router.patch("/admin/courses/{slug}/review")
async def review_course(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Course tidak ditemukan")
    if body["decision"] == "publish":
        c.status = "published"
        if not c.published_at:
            c.published_at = datetime.now(timezone.utc)
        psd = (
            await db.execute(select(User).where(User.username == settings.PSD_OFFICIAL_USERNAME))
        ).scalar_one_or_none()
        c.publisher_id = psd.id if psd else None
        c.review_note = None
        await db.commit()
        author = (await db.execute(select(User).where(User.id == c.author_id))).scalar_one_or_none()
        if author:
            await after_course_published(db, author)
        await notify(
            db,
            c.author_id,
            "course",
            f"Course Anda diterbitkan: {c.title}",
            link=f"/learn/{c.slug}",
        )
    else:
        c.status = "rejected"
        c.review_note = body.get("note", "")
        await db.commit()
        await notify(
            db,
            c.author_id,
            "course",
            f"Course perlu revisi: {c.title}",
            body=c.review_note or "",
            link="/studio",
        )
    return {"status": c.status}


@router.post("/admin/learning-paths", status_code=201)
async def create_learning_path(body: dict, db: AsyncSession = Depends(get_db)):
    lp = LearningPath(slug=body["slug"], title=body["title"], description=body.get("description", ""))
    apply_path_payload(lp, body)
    db.add(lp)
    await db.commit()
    await db.refresh(lp)
    return {"slug": lp.slug}


@router.patch("/admin/learning-paths/{slug}")
async def update_learning_path(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    lp = (await db.execute(select(LearningPath).where(LearningPath.slug == slug))).scalar_one_or_none()
    if not lp:
        raise ApiError(404, "not_found", "Jalur belajar tidak ditemukan")
    apply_path_payload(lp, body)
    await db.commit()
    return {"slug": lp.slug}


@router.delete("/admin/learning-paths/{slug}", status_code=204)
async def delete_learning_path(slug: str, db: AsyncSession = Depends(get_db)):
    lp = (await db.execute(select(LearningPath).where(LearningPath.slug == slug))).scalar_one_or_none()
    if lp:
        await db.delete(lp)
        await db.commit()


@router.get("/admin/repos")
async def list_repos(
    q: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Repo)
    if q:
        stmt = stmt.where(Repo.name.ilike(f"%{q}%") | Repo.slug.ilike(f"%{q}%"))
    stmt = stmt.order_by(Repo.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([to_summary(r) for r in rows], total, p)


@router.patch("/admin/repos/{repo_id}")
async def update_repo(repo_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    r = (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    if "visibility" in body:
        r.visibility = body["visibility"]
    if "featured" in body:
        r.featured = bool(body["featured"])
    await db.commit()
    return to_summary(r)


@router.get("/admin/announcements")
async def list_announcements(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(select(Announcement).order_by(Announcement.created_at.desc()))
    ).scalars().all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "body_md": a.body_md,
            "level": a.level,
            "active": a.active,
            "created_at": a.created_at,
        }
        for a in rows
    ]


@router.post("/admin/announcements", status_code=201)
async def create_ann(body: dict, db: AsyncSession = Depends(get_db)):
    a = Announcement(**body)
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return {"id": a.id}


@router.patch("/admin/announcements/{ann_id}")
async def update_ann(ann_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    a = (await db.execute(select(Announcement).where(Announcement.id == ann_id))).scalar_one_or_none()
    if not a:
        raise ApiError(404, "not_found", "Pengumuman tidak ditemukan")
    for k, v in body.items():
        setattr(a, k, v)
    await db.commit()
    return {"id": a.id}


@router.delete("/admin/announcements/{ann_id}", status_code=204)
async def delete_ann(ann_id: str, db: AsyncSession = Depends(get_db)):
    a = (await db.execute(select(Announcement).where(Announcement.id == ann_id))).scalar_one_or_none()
    if a:
        await db.delete(a)
        await db.commit()


@router.delete("/admin/repos/{repo_id}", status_code=204)
async def delete_repo(repo_id: str, db: AsyncSession = Depends(get_db)):
    r = (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none()
    if r:
        try:
            delete_repo_doc(r.id)
        except Exception:
            pass
        await db.delete(r)
        await db.commit()


@router.delete("/admin/threads/{thread_id}", status_code=204)
async def delete_thread(thread_id: str, db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(Thread).where(Thread.id == thread_id))).scalar_one_or_none()
    if t:
        await db.delete(t)
        await db.commit()


@router.get("/admin/instructor-applications")
async def list_instructor_apps(
    status: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(InstructorApplication, User).join(User, InstructorApplication.user_id == User.id)
    if status:
        stmt = stmt.where(InstructorApplication.status == status)
    stmt = stmt.order_by(InstructorApplication.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    return paginated(
        [
            {
                "id": a.id,
                "expertise": a.expertise,
                "motivation_md": a.motivation_md,
                "status": a.status,
                "user": {"username": u.username, "name": u.name},
            }
            for a, u in rows
        ],
        total,
        p,
    )


@router.patch("/admin/instructor-applications/{app_id}")
async def review_instructor_app(app_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    a = (
        await db.execute(select(InstructorApplication).where(InstructorApplication.id == app_id))
    ).scalar_one_or_none()
    if not a:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    a.status = body["status"]
    if a.status == "approved":
        u = (await db.execute(select(User).where(User.id == a.user_id))).scalar_one()
        u.is_instructor = True
    await db.commit()
    if a.status == "approved":
        await notify(db, a.user_id, "instructor", "Lamaran instruktur diterima", link="/studio")
    elif a.status == "rejected":
        await notify(db, a.user_id, "instructor", "Lamaran instruktur ditolak", link="/studio")
    return {"status": a.status}


@router.get("/admin/notebook-kernel-requests")
async def list_notebook_kernel_requests(
    status: str | None = None,
    applicant_type: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(NotebookKernelRequest, User).join(User, NotebookKernelRequest.user_id == User.id)
    if status:
        stmt = stmt.where(NotebookKernelRequest.status == status)
    if applicant_type:
        stmt = stmt.where(NotebookKernelRequest.applicant_type == applicant_type)
    stmt = stmt.order_by(NotebookKernelRequest.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    return paginated(
        [
            {
                "id": r.id,
                "applicant_type": r.applicant_type,
                "nim": r.nim,
                "institution": r.institution,
                "reason_md": r.reason_md,
                "status": r.status,
                "review_note": r.review_note,
                "has_ktm": bool(r.ktm_storage_key),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "user": {"username": u.username, "name": u.name, "email": u.email},
            }
            for r, u in rows
        ],
        total,
        p,
    )


@router.get("/admin/notebook-kernel-requests/{req_id}/ktm-url")
async def notebook_kernel_ktm_url(req_id: str, db: AsyncSession = Depends(get_db)):
    r = (
        await db.execute(select(NotebookKernelRequest).where(NotebookKernelRequest.id == req_id))
    ).scalar_one_or_none()
    if not r or not r.ktm_storage_key:
        raise ApiError(404, "not_found", "KTM tidak ditemukan")
    return {"url": presigned_get(r.ktm_storage_key, expires=600)}


@router.patch("/admin/notebook-kernel-requests/{req_id}")
async def review_notebook_kernel_request(
    req_id: str,
    body: dict,
    staff: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    r = (
        await db.execute(select(NotebookKernelRequest).where(NotebookKernelRequest.id == req_id))
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    status = body.get("status")
    if status not in ("approved", "rejected"):
        raise ApiError(400, "invalid_status", "Status harus approved atau rejected")
    r.status = status
    r.review_note = body.get("review_note") or r.review_note
    r.reviewed_by = staff.id
    u = (await db.execute(select(User).where(User.id == r.user_id))).scalar_one()
    if status == "approved":
        await apply_kernel_grant(db, u, granted=True)
        await notify(
            db,
            r.user_id,
            "notebook_kernel",
            "Pengajuan kernel server disetujui",
            body="Anda dapat menggunakan kernel server di notebook.",
            link="/notebooks",
        )
    else:
        await apply_kernel_grant(db, u, granted=False)
        await notify(
            db,
            r.user_id,
            "notebook_kernel",
            "Pengajuan kernel server ditolak",
            body=body.get("review_note") or "Hubungi tim PSD jika ada pertanyaan.",
            link="/notebooks/kernel-request",
        )
    await db.commit()
    return {"status": r.status}
