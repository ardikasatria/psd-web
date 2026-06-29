"""Model engagement aset."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class AssetEngagement(Base):
    __tablename__ = "asset_engagement"

    asset_key: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    love_count: Mapped[int] = mapped_column(Integer, default=0)
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    share_feed: Mapped[int] = mapped_column(Integer, default=0)
    share_forum: Mapped[int] = mapped_column(Integer, default=0)
    share_external: Mapped[int] = mapped_column(Integer, default=0)
    share_link: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AssetLove(Base):
    __tablename__ = "asset_loves"
    __table_args__ = (UniqueConstraint("user_id", "asset_key", name="uq_asset_love"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"alv_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    asset_key: Mapped[str] = mapped_column(String, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
