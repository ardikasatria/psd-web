import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"src_{uuid.uuid4().hex[:12]}")
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String)
    uri: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String, default="dataset")
    schema_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Pipeline(Base):
    __tablename__ = "pipelines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"pl_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String)
    spec_json: Mapped[dict] = mapped_column(JSON, default=lambda: {"nodes": [], "edges": []})
    engine: Mapped[str] = mapped_column(String, default="auto")
    schedule_cron: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft")
    validation_error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"run_{uuid.uuid4().hex[:12]}")
    pipeline_id: Mapped[str] = mapped_column(ForeignKey("pipelines.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="queued")
    execution_engine: Mapped[str | None] = mapped_column(String, nullable=True)
    rows_out: Mapped[int] = mapped_column(Integer, default=0)
    layers_json: Mapped[dict] = mapped_column(JSON, default=dict)
    lineage_json: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"dsh_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
    pipeline_id: Mapped[str | None] = mapped_column(ForeignKey("pipelines.id"), nullable=True)
    title: Mapped[str] = mapped_column(String)
    description_md: Mapped[str] = mapped_column(String, default="")
    layout_json: Mapped[list] = mapped_column(JSON, default=list)
    visibility: Mapped[str] = mapped_column(String, default="private")
    superset_dataset_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    superset_dashboard_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    superset_embed_uuid: Mapped[str | None] = mapped_column(String, nullable=True)
    superset_gold_table: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Widget(Base):
    __tablename__ = "widgets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"wdg_{uuid.uuid4().hex[:12]}")
    dashboard_id: Mapped[str] = mapped_column(ForeignKey("dashboards.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String, default="")
    query_json: Mapped[dict] = mapped_column(JSON, default=dict)
    options_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
