import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class IdeaRoom(Base):
    __tablename__ = "idea_rooms"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"room_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    pitch_md: Mapped[str] = mapped_column(String, default="")
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    founder_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    max_members: Mapped[int | None] = mapped_column(Integer, nullable=True)
    framing_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    data_mode: Mapped[str | None] = mapped_column(String, nullable=True)
    synthesis_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    dataset_repo_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    generation_error: Mapped[str | None] = mapped_column(String, nullable=True)
    solution_template: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RoomProblem(Base):
    __tablename__ = "room_problems"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"rpb_{uuid.uuid4().hex[:12]}")
    room_id: Mapped[str] = mapped_column(ForeignKey("idea_rooms.id"), unique=True, index=True)
    statement_md: Mapped[str] = mapped_column(String, default="")
    suggested_metric: Mapped[str | None] = mapped_column(String, nullable=True)
    data_kind: Mapped[str] = mapped_column(String, default="structured")
    data_spec: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    unstructured_guidance_md: Mapped[str | None] = mapped_column(String, nullable=True)
    generated_by: Mapped[str] = mapped_column(String, default="ai")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProblemComponent(Base):
    __tablename__ = "problem_components"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"pcm_{uuid.uuid4().hex[:12]}")
    room_id: Mapped[str] = mapped_column(ForeignKey("idea_rooms.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String)
    content_md: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RoomSubmission(Base):
    __tablename__ = "room_submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"rsb_{uuid.uuid4().hex[:12]}")
    room_id: Mapped[str] = mapped_column(ForeignKey("idea_rooms.id"), unique=True, index=True)
    submitted_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    notebook_id: Mapped[str | None] = mapped_column(ForeignKey("notebooks.id"), nullable=True)
    result_summary_md: Mapped[str] = mapped_column(String, default="")
    asset_refs: Mapped[list] = mapped_column(JSON, default=list)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
