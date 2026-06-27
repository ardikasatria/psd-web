import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Quest(Base):
    __tablename__ = "quests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"qst_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default="")
    steps: Mapped[list] = mapped_column(JSON, default=list)
    reward_reputation: Mapped[int] = mapped_column(Integer, default=0)
    reward_badge: Mapped[str | None] = mapped_column(String, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class QuestClaim(Base):
    __tablename__ = "quest_claims"
    __table_args__ = (UniqueConstraint("user_id", "quest_slug", name="uq_quest_claim"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"qcl_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    quest_slug: Mapped[str] = mapped_column(String, index=True)
    claimed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
