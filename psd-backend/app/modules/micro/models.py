import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class MicroLesson(Base):
    __tablename__ = "micro_lessons"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"mic_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    content_md: Mapped[str] = mapped_column(String, default="")
    duration_min: Mapped[int] = mapped_column(Integer, default=5)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    quiz: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MicroCompletion(Base):
    __tablename__ = "micro_completions"
    __table_args__ = (UniqueConstraint("user_id", "micro_id", name="uq_micro_done"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"mcd_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    micro_id: Mapped[str] = mapped_column(ForeignKey("micro_lessons.id"), index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
