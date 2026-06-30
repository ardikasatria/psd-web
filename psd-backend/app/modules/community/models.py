import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.users.models import User


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"thr_{uuid.uuid4().hex[:12]}")
    title: Mapped[str] = mapped_column(String)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body_md: Mapped[str] = mapped_column(String, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    repo_id: Mapped[str | None] = mapped_column(ForeignKey("repos.id"), nullable=True, index=True)
    visibility: Mapped[str] = mapped_column(String, default="public", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"pst_{uuid.uuid4().hex[:12]}")
    thread_id: Mapped[str] = mapped_column(ForeignKey("threads.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("posts.id"), nullable=True, index=True)
    reply_to_author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    body_md: Mapped[str] = mapped_column(String)
    visibility: Mapped[str] = mapped_column(String, default="public", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(foreign_keys=[author_id], lazy="selectin")
    reply_to_author: Mapped[User | None] = relationship(foreign_keys=[reply_to_author_id], lazy="selectin")


class ForumVote(Base):
    __tablename__ = "forum_votes"
    __table_args__ = (UniqueConstraint("user_id", "target_type", "target_id", name="uq_forum_vote"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"fv_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String)
    target_id: Mapped[str] = mapped_column(String, index=True)
    value: Mapped[int] = mapped_column(Integer)


class ForumReaction(Base):
    __tablename__ = "forum_reactions"
    __table_args__ = (
        UniqueConstraint("user_id", "target_type", "target_id", "emoji", name="uq_forum_reaction"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"fr_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_type: Mapped[str] = mapped_column(String)
    target_id: Mapped[str] = mapped_column(String, index=True)
    emoji: Mapped[str] = mapped_column(String)
