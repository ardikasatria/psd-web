import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.storage import upload_private
from app.modules.notebook_kernel.grant import has_approved_kernel_grant
from app.modules.notebook_kernel.models import NotebookKernelRequest
from app.modules.notifications.service import notify_staff
from app.modules.users.models import User

router = APIRouter(tags=["notebook-kernel"])

ALLOWED_KTM_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_KTM_BYTES = 5 * 1024 * 1024


def _payload(req: NotebookKernelRequest) -> dict:
    return {
        "id": req.id,
        "status": req.status,
        "applicant_type": req.applicant_type,
        "nim": req.nim,
        "institution": req.institution,
        "reason_md": req.reason_md,
        "has_ktm": bool(req.ktm_storage_key),
        "review_note": req.review_note,
        "created_at": req.created_at.isoformat() if req.created_at else None,
    }


@router.post("/me/notebook-kernel-request", status_code=201)
async def submit_kernel_request(
    applicant_type: str = Form(...),
    reason_md: str = Form(""),
    nim: str | None = Form(None),
    institution: str | None = Form(None),
    ktm: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    applicant_type = (applicant_type or "").strip().lower()
    if applicant_type not in ("student", "umum"):
        raise ApiError(400, "invalid_type", "Tipe pemohon harus student atau umum")

    existing = (
        await db.execute(
            select(NotebookKernelRequest).where(
                NotebookKernelRequest.user_id == user.id,
                NotebookKernelRequest.status.in_(["pending", "approved"]),
            )
        )
    ).scalar_one_or_none()
    if existing:
        if existing.status == "approved":
            raise ApiError(409, "already_granted", "Anda sudah memiliki akses kernel server")
        raise ApiError(409, "pending", "Pengajuan kernel masih ditinjau")

    nim_clean = (nim or "").strip() or None
    institution_clean = (institution or "").strip() or None
    ktm_key = None

    if applicant_type == "student":
        if not nim_clean:
            raise ApiError(400, "nim_required", "NIM wajib untuk pemohon mahasiswa")
        if not ktm or not ktm.filename:
            raise ApiError(400, "ktm_required", "Unggah foto KTM untuk pemohon mahasiswa")
        content_type = (ktm.content_type or "").split(";")[0].strip().lower()
        if content_type not in ALLOWED_KTM_TYPES:
            raise ApiError(400, "invalid_ktm", "KTM harus berformat JPEG, PNG, WebP, atau PDF")
        data = await ktm.read()
        if len(data) > MAX_KTM_BYTES:
            raise ApiError(400, "ktm_too_large", "Ukuran KTM maksimal 5 MB")
        ext = "pdf" if content_type == "application/pdf" else content_type.split("/")[-1]
        ktm_key = upload_private(
            f"kernel-requests/{user.id}/{uuid.uuid4().hex}.{ext}",
            data,
            content_type,
        )

    req = NotebookKernelRequest(
        user_id=user.id,
        applicant_type=applicant_type,
        nim=nim_clean,
        institution=institution_clean,
        reason_md=(reason_md or "").strip(),
        ktm_storage_key=ktm_key,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    label = "Mahasiswa" if applicant_type == "student" else "Umum"
    await notify_staff(
        db,
        "notebook_kernel",
        f"Pengajuan kernel server ({label}) dari {user.username}",
        body=user.name,
        link="/admin/notebook-kernel-requests",
        actor_id=user.id,
    )
    return _payload(req)


@router.get("/me/notebook-kernel-request")
async def my_kernel_request(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    req = (
        await db.execute(
            select(NotebookKernelRequest)
            .where(NotebookKernelRequest.user_id == user.id)
            .order_by(NotebookKernelRequest.created_at.desc())
        )
    ).scalars().first()
    if not req:
        granted = await has_approved_kernel_grant(db, user.id)
        return None if not granted else {"status": "approved", "applicant_type": "umum", "has_ktm": False}
    return _payload(req)
