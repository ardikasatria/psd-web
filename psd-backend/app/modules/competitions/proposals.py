import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.search import index_competition
from app.modules.categories.service import apply_category_body, load_category_refs
from app.modules.categories.util import slugify
from app.modules.competitions.models import Competition, CompetitionProposal
from app.modules.notifications.service import notify, notify_staff


async def proposal_dict(db: AsyncSession, p: CompetitionProposal, user=None, competition_slug: str | None = None):
    cat, sub = await load_category_refs(db, p.category_id, p.subcategory_id)
    out = {
        "id": p.id,
        "proposed_slug": p.proposed_slug,
        "title": p.title,
        "sponsor": p.sponsor,
        "metric": p.metric,
        "prize_pool": p.prize_pool,
        "starts_at": p.starts_at,
        "ends_at": p.ends_at,
        "cover_url": p.cover_url,
        "overview_md": p.overview_md,
        "rules_md": p.rules_md,
        "dataset_info_md": p.dataset_info_md,
        "daily_submission_limit": p.daily_submission_limit,
        "category": cat,
        "subcategory": sub,
        "status": p.status,
        "review_note": p.review_note,
        "competition_slug": competition_slug,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "submitted_at": p.submitted_at,
    }
    if user is not None:
        out["user"] = {"username": user.username, "name": user.name}
    return out


def _competition_status(starts_at: datetime, ends_at: datetime) -> str:
    now = datetime.now(timezone.utc)
    if now < starts_at:
        return "upcoming"
    if now > ends_at:
        return "past"
    return "active"


async def _unique_slug(db: AsyncSession, base: str) -> str:
    slug = base
    n = 0
    while True:
        exists = (
            await db.execute(select(Competition.id).where(Competition.slug == slug))
        ).scalar_one_or_none()
        if not exists:
            return slug
        n += 1
        slug = f"{base}-{n}"


def apply_proposal_body(p: CompetitionProposal, body: dict, category_data: dict | None = None):
    for key in (
        "proposed_slug",
        "title",
        "sponsor",
        "metric",
        "prize_pool",
        "starts_at",
        "ends_at",
        "cover_url",
        "overview_md",
        "rules_md",
        "dataset_info_md",
        "daily_submission_limit",
    ):
        if key in body:
            setattr(p, key, body[key])


async def submit_proposal(db: AsyncSession, p: CompetitionProposal):
    if p.status not in ("draft", "revision_requested"):
        raise ApiError(409, "invalid_state", "Pengajuan tidak dapat dikirim pada status ini")
    p.status = "pending_review"
    p.submitted_at = datetime.now(timezone.utc)
    p.review_note = None


async def approve_proposal(db: AsyncSession, p: CompetitionProposal, review_note: str | None = None):
    if p.status != "pending_review":
        raise ApiError(409, "invalid_state", "Hanya pengajuan menunggu tinjauan yang bisa disetujui")
    slug = await _unique_slug(db, p.proposed_slug or slugify(p.title))
    now = datetime.now(timezone.utc)
    status = _competition_status(p.starts_at, p.ends_at)
    c = Competition(
        slug=slug,
        title=p.title,
        sponsor=p.sponsor,
        status=status,
        metric=p.metric,
        prize_pool=p.prize_pool,
        starts_at=p.starts_at,
        ends_at=p.ends_at,
        cover_url=p.cover_url,
        overview_md=p.overview_md,
        rules_md=p.rules_md,
        dataset_info_md=p.dataset_info_md,
        daily_submission_limit=p.daily_submission_limit,
        category_id=p.category_id,
        subcategory_id=p.subcategory_id,
        proposer_id=p.user_id,
        prizes=[],
        tags=[],
    )
    db.add(c)
    await db.flush()
    p.status = "approved"
    p.competition_id = c.id
    if review_note:
        p.review_note = review_note
    await db.commit()
    await db.refresh(c)
    try:
        index_competition(c)
    except Exception:
        pass
    return c


async def review_proposal(
    db: AsyncSession,
    p: CompetitionProposal,
    action: str,
    review_note: str | None = None,
):
    if p.status != "pending_review":
        raise ApiError(409, "invalid_state", "Pengajuan sudah diproses")

    if action == "approve":
        c = await approve_proposal(db, p, review_note)
        await notify(
            db,
            p.user_id,
            "competition",
            "Pengajuan kompetisi disetujui",
            body=p.title,
            link=f"/competitions/{c.slug}",
        )
        return c.slug

    if action == "revision_requested":
        if not review_note:
            raise ApiError(422, "note_required", "Catatan revisi wajib diisi")
        p.status = "revision_requested"
        p.review_note = review_note
        await db.commit()
        await notify(
            db,
            p.user_id,
            "competition",
            "Pengajuan kompetisi perlu revisi",
            body=review_note[:200],
            link="/dashboard/competitions/manage",
        )
        return None

    if action == "reject":
        if not review_note:
            raise ApiError(422, "note_required", "Alasan penolakan wajib diisi")
        p.status = "rejected"
        p.review_note = review_note
        await db.commit()
        await notify(
            db,
            p.user_id,
            "competition",
            "Pengajuan kompetisi ditolak",
            body=review_note[:200],
            link="/dashboard/competitions/manage",
        )
        return None

    raise ApiError(422, "invalid_action", "Aksi tidak valid")


async def notify_staff_new_proposal(db: AsyncSession, p: CompetitionProposal, username: str):
    await notify_staff(
        db,
        "competition",
        f"Pengajuan kompetisi baru dari {username}",
        body=p.title,
        link="/admin/competitions/proposals",
        actor_id=p.user_id,
    )
