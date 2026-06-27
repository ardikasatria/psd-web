import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.users.models import User


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"blg_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(String, default="")
    body_md: Mapped[str] = mapped_column(String, default="")
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")
