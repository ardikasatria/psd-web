from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.deps import get_current_user, require_staff
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.ratelimit import rate_limit
from app.modules.notifications.service import notify, notify_staff
from app.modules.support import tickets as ticket_svc
from app.modules.support.models import SupportTicket, TicketMessage
from app.modules.support.queue import sort_tickets
from app.modules.users.models import User
from app.modules.users.refs import is_staff, owner_ref_dict

router = APIRouter(tags=["support"])


def _ticket_error(e: ticket_svc.TicketError):
    raise ApiError(e.status, e.slug, e.message)


def _ticket_summary(t: SupportTicket) -> dict:
    return {
        "id": t.id,
        "category": t.category,
        "priority": t.priority,
        "subject": t.subject,
        "status": t.status,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
    }


def _ticket_detail(t: SupportTicket, messages: list[TicketMessage]) -> dict:
    return {
        **_ticket_summary(t),
        "body": t.body,
        "assignee": owner_ref_dict(t.assignee) if t.assignee else None,
        "messages": [
            {
                "id": m.id,
                "author": owner_ref_dict(m.author),
                "body": m.body,
                "is_staff": m.is_staff,
                "created_at": m.created_at,
            }
            for m in messages
        ],
    }


async def _get_owned_ticket(db: AsyncSession, ticket_id: str, user: User) -> SupportTicket:
    t = (
        await db.execute(
            select(SupportTicket)
            .options(selectinload(SupportTicket.user), selectinload(SupportTicket.assignee))
            .where(SupportTicket.id == ticket_id)
        )
    ).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Tiket tidak ditemukan")
    if t.user_id != user.id and not is_staff(user):
        raise ApiError(403, "forbidden", "Tidak diizinkan")
    return t


@router.post("/support/tickets", status_code=201, dependencies=[rate_limit("support_ticket", 10, 3600)])
async def create_ticket(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    try:
        category = ticket_svc.validate_category((body.get("category") or "").strip())
        priority = ticket_svc.validate_priority((body.get("priority") or "sedang").strip())
    except ticket_svc.TicketError as e:
        _ticket_error(e)
    subject = (body.get("subject") or "").strip()
    text = (body.get("body") or "").strip()
    if not subject or not text:
        raise ApiError(400, "bad_request", "Subjek dan deskripsi wajib diisi")
    t = SupportTicket(
        user_id=user.id,
        category=category,
        priority=priority,
        subject=subject,
        body=text,
        status=ticket_svc.OPEN,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    await notify_staff(
        db,
        "support_ticket",
        f"Tiket baru: {subject}",
        body=text[:200],
        link="/admin/support",
        actor_id=user.id,
    )
    return _ticket_summary(t)


@router.get("/support/tickets/me")
async def my_tickets(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(SupportTicket).where(SupportTicket.user_id == user.id).order_by(SupportTicket.created_at.desc())
        )
    ).scalars().all()
    return [_ticket_summary(t) for t in rows]


@router.get("/support/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    t = await _get_owned_ticket(db, ticket_id, user)
    messages = (
        await db.execute(
            select(TicketMessage)
            .options(selectinload(TicketMessage.author))
            .where(TicketMessage.ticket_id == t.id)
            .order_by(TicketMessage.created_at.asc())
        )
    ).scalars().all()
    return _ticket_detail(t, messages)


@router.post("/support/tickets/{ticket_id}/messages", status_code=201)
async def reply_ticket(
    ticket_id: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_owned_ticket(db, ticket_id, user)
    text = (body.get("body") or "").strip()
    if not text:
        raise ApiError(400, "bad_request", "Pesan tidak boleh kosong")
    staff = is_staff(user)
    if t.status == ticket_svc.CLOSED and not staff:
        raise ApiError(409, "closed", "Tiket sudah ditutup")
    m = TicketMessage(
        ticket_id=t.id,
        author_id=user.id,
        body=text,
        is_staff=staff,
    )
    db.add(m)
    t.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(m, ["author"])
    target_id = t.user_id if staff else (t.assignee_id or t.user_id)
    if target_id and target_id != user.id:
        await notify(
            db,
            target_id,
            "support_reply",
            "Balasan baru pada tiket pengaduan",
            body=text[:200],
            link=f"/support/{t.id}",
            actor_id=user.id,
        )
    return {
        "id": m.id,
        "author": owner_ref_dict(m.author),
        "body": m.body,
        "is_staff": m.is_staff,
        "created_at": m.created_at,
    }


@router.get("/admin/support/tickets")
async def admin_list_tickets(
    status: str | None = None,
    priority: str | None = None,
    p: PageParams = Depends(page_params),
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(SupportTicket).options(
        selectinload(SupportTicket.user), selectinload(SupportTicket.assignee)
    )
    if status:
        stmt = stmt.where(SupportTicket.status == status)
    if priority:
        stmt = stmt.where(SupportTicket.priority == priority)
    rows = (await db.execute(stmt)).scalars().all()
    items = [
        {
            **_ticket_summary(t),
            "user": owner_ref_dict(t.user),
            "assignee": owner_ref_dict(t.assignee) if t.assignee else None,
        }
        for t in rows
    ]
    items = sort_tickets(items)
    total = len(items)
    page_items = items[p.offset : p.offset + p.page_size]
    return paginated(page_items, total, p)


async def _admin_ticket_action(
    db: AsyncSession,
    ticket_id: str,
    action: str,
    staff: User,
    assignee_id: str | None = None,
) -> SupportTicket:
    t = (
        await db.execute(
            select(SupportTicket)
            .options(selectinload(SupportTicket.user), selectinload(SupportTicket.assignee))
            .where(SupportTicket.id == ticket_id)
        )
    ).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Tiket tidak ditemukan")
    try:
        t.status = ticket_svc.apply_action(t.status, action)
    except ticket_svc.TicketError as e:
        _ticket_error(e)
    if action == "assign":
        t.assignee_id = assignee_id or staff.id
    t.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(t)
    status_labels = {
        ticket_svc.IN_PROGRESS: "sedang ditangani",
        ticket_svc.RESOLVED: "selesai",
        ticket_svc.CLOSED: "ditutup",
    }
    if t.status in status_labels:
        await notify(
            db,
            t.user_id,
            "support_status",
            f"Status tiket: {status_labels[t.status]}",
            body=t.subject,
            link=f"/support/{t.id}",
            actor_id=staff.id,
        )
    return t


@router.post("/admin/support/tickets/{ticket_id}/assign")
async def admin_assign_ticket(
    ticket_id: str,
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    await _admin_ticket_action(db, ticket_id, "assign", user)
    return {"ok": True}


@router.post("/admin/support/tickets/{ticket_id}/resolve")
async def admin_resolve_ticket(
    ticket_id: str,
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    await _admin_ticket_action(db, ticket_id, "resolve", user)
    return {"ok": True}


@router.post("/admin/support/tickets/{ticket_id}/close")
async def admin_close_ticket(
    ticket_id: str,
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    await _admin_ticket_action(db, ticket_id, "close", user)
    return {"ok": True}


@router.post("/admin/support/tickets/{ticket_id}/reopen")
async def admin_reopen_ticket(
    ticket_id: str,
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    await _admin_ticket_action(db, ticket_id, "reopen", user)
    return {"ok": True}
