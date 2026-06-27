import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.users.models import User


def _id(p):
    return lambda: f"{p}_{uuid.uuid4().hex[:12]}"


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="uq_follow"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("fol"))
    follower_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    following_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Post(Base):
    __tablename__ = "social_posts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("sps"))
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    body_md: Mapped[str] = mapped_column(String, default="")
    images: Mapped[list] = mapped_column(JSON, default=list)
    asset_kind: Mapped[str | None] = mapped_column(String, nullable=True)
    asset_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")


class PostLike(Base):
    __tablename__ = "social_post_likes"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_post_like"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("spl"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    post_id: Mapped[str] = mapped_column(ForeignKey("social_posts.id"), index=True)


class PostComment(Base):
    __tablename__ = "social_post_comments"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("spc"))
    post_id: Mapped[str] = mapped_column(ForeignKey("social_posts.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    body_md: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")
