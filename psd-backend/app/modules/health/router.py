from fastapi import APIRouter

from app.email.provider import email_config_status

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/health/email")
async def health_email():
    """Diagnostik konfigurasi Resend (tanpa mengirim email)."""
    return email_config_status()
