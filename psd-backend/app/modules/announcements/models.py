import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ann_{uuid.uuid4().hex[:12]}")
    title: Mapped[str] = mapped_column(String)
    body_md: Mapped[str] = mapped_column(String, default="")
    level: Mapped[str] = mapped_column(String, default="info")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
