from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user, require_staff
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.ratelimit import rate_limit
from app.modules.notifications.service import notify
from app.modules.reports import content_reports as cr
from app.modules.reports.models import ContentReport, ReportEntry
from app.modules.reports.queue import sort_moderation
from app.modules.reports.seams import apply_moderation_effect, assert_reportable_target, resolve_target
from app.modules.users.models import User
from app.modules.users.refs import owner_ref_dict

router = APIRouter(tags=["reports"])


def _report_error(e: cr.ReportError):
    raise ApiError(e.status, e.slug, e.message)


REASON_LABELS = {
    "spam": "Spam",
    "pelecehan": "Pelecehan",
    "kebencian": "Ujaran kebencian",
    "seksual": "Konten seksual",
    "kekerasan": "Kekerasan",
    "misinformasi": "Misinformasi",
    "menyesatkan": "Menyesatkan",
    "ilegal": "Ilegal",
    "lainnya": "Lainnya",
}


def _my_report_entry(e: ReportEntry, report: ContentReport) -> dict:
    return {
        "id": report.id,
        "kind": report.kind,
        "target_id": report.target_id,
        "reason": e.reason,
        "status": report.status,
        "created_at": e.created_at,
    }


def _admin_report_dict(r: ContentReport, preview: str | None = None) -> dict:
    reasons: dict[str, int] = {}
    for e in r.entries or []:
        reasons[e.reason] = reasons.get(e.reason, 0) + 1
    top_reason = max(reasons.items(), key=lambda x: x[1])[0] if reasons else None
    return {
        "id": r.id,
        "kind": r.kind,
        "target_id": r.target_id,
        "target_key": r.target_key,
        "report_count": r.report_count,
        "flagged": r.flagged,
        "status": r.status,
        "decision": r.decision,
        "top_reason": top_reason,
        "preview": preview,
        "created_at": r.created_at,
    }


@router.post("/reports", dependencies=[rate_limit("content_report", 30, 3600)])
async def create_report(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    kind = (body.get("kind") or "").strip()
    target_id = (body.get("target_id") or "").strip()
    reason_raw = (body.get("reason") or "").strip()
    detail = (body.get("detail") or "").strip() or None
    try:
        key = cr.target_key(kind, target_id)
        reason = cr.validate_reason(reason_raw)
    except cr.ReportError as e:
        _report_error(e)
    await assert_reportable_target(db, kind, target_id, user)

    report = (
        await db.execute(select(ContentReport).where(ContentReport.target_key == key))
    ).scalar_one_or_none()
    if not report:
        report = ContentReport(
            target_key=key,
            kind=kind,
            target_id=target_id,
            report_count=0,
            flagged=False,
            status=cr.PENDING,
        )
        db.add(report)
        await db.flush()

    entry_exists = (
        await db.execute(
            select(ReportEntry).where(
                ReportEntry.report_id == report.id, ReportEntry.reporter_id == user.id
            )
        )
    ).scalar_one_or_none()
    if entry_exists:
        return {"status": report.status, "already_reported": True, "id": report.id}

    entry = ReportEntry(report_id=report.id, reporter_id=user.id, reason=reason, detail=detail)
    db.add(entry)
    await db.flush()

    report.report_count = (
        await db.execute(
            select(func.count()).select_from(ReportEntry).where(ReportEntry.report_id == report.id)
        )
    ).scalar_one()
    threshold = settings.REPORT_AUTO_FLAG_THRESHOLD
    if cr.should_auto_flag(report.report_count, threshold):
        report.flagged = True
    await db.commit()
    return {"status": report.status, "already_reported": False, "id": report.id}


@router.get("/reports/me")
async def my_reports(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(ReportEntry, ContentReport)
            .join(ContentReport, ReportEntry.report_id == ContentReport.id)
            .where(ReportEntry.reporter_id == user.id)
            .order_by(ReportEntry.created_at.desc())
        )
    ).all()
    return [_my_report_entry(e, r) for e, r in rows]


@router.get("/admin/reports")
async def admin_list_reports(
    flagged: bool | None = None,
    status: str | None = None,
    p: PageParams = Depends(page_params),
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ContentReport).options(selectinload(ContentReport.entries))
    if flagged is not None:
        stmt = stmt.where(ContentReport.flagged == flagged)
    if status:
        stmt = stmt.where(ContentReport.status == status)
    rows = (await db.execute(stmt)).scalars().all()
    items = []
    for r in rows:
        info = await resolve_target(db, r.kind, r.target_id)
        items.append(_admin_report_dict(r, info["preview"] if info else None))
    items = sort_moderation(items)
    total = len(items)
    page_items = items[p.offset : p.offset + p.page_size]
    return paginated(page_items, total, p)


async def _get_report(db: AsyncSession, report_id: str) -> ContentReport:
    r = (
        await db.execute(
            select(ContentReport).options(selectinload(ContentReport.entries)).where(ContentReport.id == report_id)
        )
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Laporan tidak ditemukan")
    return r


@router.post("/admin/reports/{report_id}/start-review")
async def admin_start_review(
    report_id: str,
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_report(db, report_id)
    try:
        r.status = cr.apply_action(r.status, "start_review")
    except cr.ReportError as e:
        _report_error(e)
    r.reviewed_by = user.id
    await db.commit()
    return {"status": r.status}


@router.post("/admin/reports/{report_id}/resolve")
async def admin_resolve_report(
    report_id: str,
    body: dict,
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_report(db, report_id)
    decision_raw = (body.get("decision") or "").strip()
    try:
        decision = cr.validate_decision(decision_raw)
        r.status = cr.apply_action(r.status, "resolve")
    except cr.ReportError as e:
        _report_error(e)
    r.decision = decision
    r.reviewed_by = user.id
    await apply_moderation_effect(db, r.kind, r.target_id, decision, user.id)
    await db.commit()
    for entry in r.entries or []:
        await notify(
            db,
            entry.reporter_id,
            "report_resolved",
            "Laporan Anda telah ditinjau",
            body=f"Keputusan: {decision}",
            link="/support",
            actor_id=user.id,
        )
    return {"status": r.status, "decision": r.decision}


@router.post("/admin/reports/{report_id}/reopen")
async def admin_reopen_report(
    report_id: str,
    user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db),
):
    r = await _get_report(db, report_id)
    try:
        r.status = cr.apply_action(r.status, "reopen")
    except cr.ReportError as e:
        _report_error(e)
    r.decision = None
    await db.commit()
    return {"status": r.status}
