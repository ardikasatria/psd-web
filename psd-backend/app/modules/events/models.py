import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String)
    mode: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, index=True, default="upcoming")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    gallery_urls: Mapped[list] = mapped_column(JSON, default=list)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description_md: Mapped[str] = mapped_column(String, default="")
    agenda: Mapped[list] = mapped_column(JSON, default=list)
    speakers: Mapped[list] = mapped_column(JSON, default=list)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    proposer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)


class EventProposal(Base):
    __tablename__ = "event_proposals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"evtp_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    proposed_slug: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, default="webinar")
    mode: Mapped[str] = mapped_column(String, default="daring")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    gallery_urls: Mapped[list] = mapped_column(JSON, default=list)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description_md: Mapped[str] = mapped_column(String, default="")
    agenda: Mapped[list] = mapped_column(JSON, default=list)
    speakers: Mapped[list] = mapped_column(JSON, default=list)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    review_note: Mapped[str | None] = mapped_column(String, nullable=True)
    event_id: Mapped[str | None] = mapped_column(ForeignKey("events.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"reg_{uuid.uuid4().hex[:12]}")
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="registered")
    attended: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
