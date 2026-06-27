from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.modules.instructors.models import InstructorApplication
from app.modules.notifications.service import notify, notify_staff
from app.modules.users.models import User

router = APIRouter(tags=["instructors"])


@router.post("/me/instructor-application", status_code=201)
async def apply(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = (
        await db.execute(
            select(InstructorApplication).where(
                InstructorApplication.user_id == user.id,
                InstructorApplication.status.in_(["pending", "approved"]),
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise ApiError(409, "exists", "Anda sudah mengajukan atau sudah menjadi instruktur")
    a = InstructorApplication(
        user_id=user.id,
        expertise=body["expertise"],
        motivation_md=body.get("motivation_md", ""),
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    await notify_staff(
        db,
        "instructor",
        f"Pengajuan instruktur baru dari {user.username}",
        body=user.name,
        link="/admin/instructor-applications",
        actor_id=user.id,
    )
    return {"id": a.id, "status": a.status}


@router.get("/me/instructor-application")
async def my_application(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    a = (
        await db.execute(
            select(InstructorApplication)
            .where(InstructorApplication.user_id == user.id)
            .order_by(InstructorApplication.created_at.desc())
        )
    ).scalars().first()
    return {"status": a.status, "expertise": a.expertise} if a else None
