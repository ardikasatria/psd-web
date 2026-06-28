import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class ModelRegistry(Base):
    __tablename__ = "model_registries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: _id("mreg"))
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    repo_id: Mapped[str | None] = mapped_column(ForeignKey("repos.id"), nullable=True, index=True)
    competition_id: Mapped[str | None] = mapped_column(ForeignKey("competitions.id"), nullable=True, index=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String)
    description_md: Mapped[str] = mapped_column(String, default="")
    mlflow_name: Mapped[str] = mapped_column(String, unique=True, index=True)
    reference_source_id: Mapped[str | None] = mapped_column(ForeignKey("data_sources.id"), nullable=True)
    features_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    monitoring_dashboard_id: Mapped[str | None] = mapped_column(ForeignKey("dashboards.id"), nullable=True)
    monitoring_gold_uri: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: _id("mver"))
    registry_id: Mapped[str] = mapped_column(ForeignKey("model_registries.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    repo_id: Mapped[str | None] = mapped_column(ForeignKey("repos.id"), nullable=True)
    submission_id: Mapped[str | None] = mapped_column(ForeignKey("submissions.id"), nullable=True)
    mlflow_run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    mlflow_model_version: Mapped[str | None] = mapped_column(String, nullable=True)
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    artifact_uri: Mapped[str | None] = mapped_column(String, nullable=True)
    stage: Mapped[str] = mapped_column(String, default="None")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DriftReport(Base):
    __tablename__ = "drift_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: _id("drft"))
    registry_id: Mapped[str] = mapped_column(ForeignKey("model_registries.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String, default="queued")
    reference_uri: Mapped[str | None] = mapped_column(String, nullable=True)
    current_uri: Mapped[str | None] = mapped_column(String, nullable=True)
    overall_psi: Mapped[float | None] = mapped_column(Float, nullable=True)
    accuracy: Mapped[float | None] = mapped_column(Float, nullable=True)
    metrics_json: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
