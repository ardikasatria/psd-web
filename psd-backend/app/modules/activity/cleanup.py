"""Hapus event aktivitas mentah lebih tua dari RETENTION_DAYS (default 180). Jalankan via cron."""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete

from app.core.db import SessionLocal
from app.modules.activity.models import ActivityEvent

RETENTION_DAYS = 180


async def cleanup_old_events(retention_days: int = RETENTION_DAYS) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    async with SessionLocal() as db:
        result = await db.execute(delete(ActivityEvent).where(ActivityEvent.created_at < cutoff))
        await db.commit()
        return result.rowcount or 0


def main() -> None:
    deleted = asyncio.run(cleanup_old_events())
    print(f"Deleted {deleted} activity events older than {RETENTION_DAYS} days")


if __name__ == "__main__":
    main()
