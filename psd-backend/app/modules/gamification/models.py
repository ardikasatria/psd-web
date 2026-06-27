import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = (UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ubg_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    badge_id: Mapped[str] = mapped_column(String)
    awarded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
