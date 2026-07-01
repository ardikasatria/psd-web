import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.users.models import User

ORG_USERNAMES = frozenset({"psd", "itera-ds", "umkm-lampung"})


class Repo(Base):
    __tablename__ = "repos"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"repo_{uuid.uuid4().hex[:12]}")
    kind: Mapped[str] = mapped_column(String, index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str] = mapped_column(String, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    downloads: Mapped[int] = mapped_column(Integer, default=0)
    visibility: Mapped[str] = mapped_column(String, default="public")
    featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    readme_md: Mapped[str] = mapped_column(String, default="")
    license: Mapped[str | None] = mapped_column(String, nullable=True)
    files: Mapped[list] = mapped_column(JSON, default=list)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    synthetic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    generation_spec: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
    gitea_repo_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    clone_url: Mapped[str | None] = mapped_column(String, nullable=True)
    gitea_owner: Mapped[str | None] = mapped_column(String, nullable=True)
    gitea_name: Mapped[str | None] = mapped_column(String, nullable=True)
    source_of_truth: Mapped[str] = mapped_column(String, default="psd")
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    deleted_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped[User] = relationship(lazy="selectin")


class RepoLike(Base):
    __tablename__ = "repo_likes"
    __table_args__ = (UniqueConstraint("user_id", "repo_id", name="uq_user_repo_like"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"lik_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    repo_id: Mapped[str] = mapped_column(ForeignKey("repos.id"), index=True)
