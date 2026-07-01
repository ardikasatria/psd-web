from fastapi import APIRouter, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.email.provider import email_config_status
from app.modules.categories.models import Category

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/health/email")
async def health_email():
    """Diagnostik konfigurasi Resend (tanpa mengirim email)."""
    return email_config_status()


@router.get("/health/orm")
async def health_orm(db: AsyncSession = Depends(get_db)):
    """Diagnostik ORM — gagal bila migrasi belum jalan atau koneksi pool bermasalah."""
    await db.execute(text("SELECT 1"))
    count = (
        await db.execute(select(Category).where(Category.parent_id.is_(None)).limit(1))
    ).scalars().first()
    return {"orm": "ok", "categories_sample": count.slug if count else None}
