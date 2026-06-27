import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"col_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    description_md: Mapped[str] = mapped_column(String, default="")
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    items: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
