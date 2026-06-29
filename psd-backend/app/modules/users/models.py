import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"usr_{uuid.uuid4().hex[:12]}")
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    hashed_password: Mapped[str] = mapped_column(String)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String, nullable=True)
    accent_color: Mapped[str | None] = mapped_column(String, nullable=True)
    pronouns: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    about_md: Mapped[str | None] = mapped_column(String, nullable=True)
    status_emoji: Mapped[str | None] = mapped_column(String, nullable=True)
    status_text: Mapped[str | None] = mapped_column(String, nullable=True)
    links: Mapped[list] = mapped_column(JSON, default=list)
    interests: Mapped[list] = mapped_column(JSON, default=list)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    is_official: Mapped[bool] = mapped_column(Boolean, default=False)
    account_type: Mapped[str] = mapped_column(String, default="individual")
    role: Mapped[str] = mapped_column(String, default="member")
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_instructor: Mapped[bool] = mapped_column(Boolean, default=False)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    member_share_token: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    reputation: Mapped[int] = mapped_column(Integer, default=0, index=True)
    affiliation: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    follower_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    post_like_total: Mapped[int] = mapped_column(Integer, default=0)
    total_loves_received: Mapped[int] = mapped_column(Integer, default=0, index=True)
    total_shares: Mapped[int] = mapped_column(Integer, default=0)
    total_downloads: Mapped[int] = mapped_column(Integer, default=0)
    total_views: Mapped[int] = mapped_column(Integer, default=0)
    engagement_asset_count: Mapped[int] = mapped_column(Integer, default=0)
    liked_list_public: Mapped[bool] = mapped_column(Boolean, default=True)
    liked_default_public: Mapped[bool] = mapped_column(Boolean, default=True)
    accepted_tos_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_tos_version: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
