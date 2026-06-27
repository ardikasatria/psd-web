from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.categories.service import apply_category_body, load_category_refs
from app.modules.categories.util import slugify
from app.modules.events.models import Event, EventProposal
from app.modules.notifications.service import notify, notify_staff


async def proposal_dict(db: AsyncSession, p: EventProposal, user=None, event_slug: str | None = None):
    cat, sub = await load_category_refs(db, p.category_id, p.subcategory_id)
    out = {
        "id": p.id,
        "proposed_slug": p.proposed_slug,
        "title": p.title,
        "type": p.type,
        "mode": p.mode,
        "starts_at": p.starts_at,
        "ends_at": p.ends_at,
        "location": p.location,
        "cover_url": p.cover_url,
        "gallery_urls": p.gallery_urls or [],
        "capacity": p.capacity,
        "description_md": p.description_md,
        "agenda": p.agenda or [],
        "speakers": p.speakers or [],
        "category": cat,
        "subcategory": sub,
        "status": p.status,
        "review_note": p.review_note,
        "event_slug": event_slug,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "submitted_at": p.submitted_at,
    }
    if user is not None:
        out["user"] = {"username": user.username, "name": user.name}
    return out


def _event_status(starts_at: datetime, ends_at: datetime) -> str:
    now = datetime.now(timezone.utc)
    return "past" if now > ends_at else "upcoming"


async def _unique_slug(db: AsyncSession, base: str) -> str:
    slug = base
    n = 0
    while True:
        exists = (await db.execute(select(Event.id).where(Event.slug == slug))).scalar_one_or_none()
        if not exists:
            return slug
        n += 1
        slug = f"{base}-{n}"


def apply_proposal_body(p: EventProposal, body: dict):
    for key in (
        "proposed_slug",
        "title",
        "type",
        "mode",
        "starts_at",
        "ends_at",
        "location",
        "cover_url",
        "gallery_urls",
        "capacity",
        "description_md",
        "agenda",
        "speakers",
    ):
        if key in body:
            setattr(p, key, body[key])


async def submit_proposal(db: AsyncSession, p: EventProposal):
    if p.status not in ("draft", "revision_requested"):
        raise ApiError(409, "invalid_state", "Pengajuan tidak dapat dikirim pada status ini")
    p.status = "pending_review"
    p.submitted_at = datetime.now(timezone.utc)
    p.review_note = None


async def approve_proposal(db: AsyncSession, p: EventProposal, review_note: str | None = None):
    if p.status != "pending_review":
        raise ApiError(409, "invalid_state", "Hanya pengajuan menunggu tinjauan yang bisa disetujui")
    slug = await _unique_slug(db, p.proposed_slug or slugify(p.title))
    status = _event_status(p.starts_at, p.ends_at)
    e = Event(
        slug=slug,
        title=p.title,
        type=p.type,
        mode=p.mode,
        status=status,
        starts_at=p.starts_at,
        ends_at=p.ends_at,
        location=p.location,
        cover_url=p.cover_url,
        gallery_urls=p.gallery_urls or [],
        capacity=p.capacity,
        description_md=p.description_md,
        agenda=p.agenda or [],
        speakers=p.speakers or [],
        category_id=p.category_id,
        subcategory_id=p.subcategory_id,
        proposer_id=p.user_id,
    )
    db.add(e)
    await db.flush()
    p.status = "approved"
    p.event_id = e.id
    if review_note:
        p.review_note = review_note
    await db.commit()
    await db.refresh(e)
    return e


async def review_proposal(db: AsyncSession, p: EventProposal, action: str, review_note: str | None = None):
    if p.status != "pending_review":
        raise ApiError(409, "invalid_state", "Pengajuan sudah diproses")

    if action == "approve":
        ev = await approve_proposal(db, p, review_note)
        await notify(
            db,
            p.user_id,
            "event",
            "Pengajuan event disetujui",
            body=p.title,
            link=f"/events/{ev.slug}",
        )
        return ev.slug

    if action == "revision_requested":
        if not review_note:
            raise ApiError(422, "note_required", "Catatan revisi wajib diisi")
        p.status = "revision_requested"
        p.review_note = review_note
        await db.commit()
        await notify(
            db,
            p.user_id,
            "event",
            "Pengajuan event perlu revisi",
            body=review_note[:200],
            link="/dashboard/events",
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
            "event",
            "Pengajuan event ditolak",
            body=review_note[:200],
            link="/dashboard/events",
        )
        return None

    raise ApiError(422, "invalid_action", "Aksi tidak valid")


async def notify_staff_new_proposal(db: AsyncSession, p: EventProposal, username: str):
    await notify_staff(
        db,
        "event",
        f"Pengajuan event baru dari {username}",
        body=p.title,
        link="/admin/events/proposals",
        actor_id=p.user_id,
    )
