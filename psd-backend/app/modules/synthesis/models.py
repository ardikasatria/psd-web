import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class SynthesisJob(Base):
    __tablename__ = "synthesis_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"syn_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String, default="queued")
    prompt: Mapped[str | None] = mapped_column(String, nullable=True)
    spec: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    n_rows: Mapped[int] = mapped_column(Integer, default=1000)
    used_llm: Mapped[bool] = mapped_column(Boolean, default=False)
    tokens_in: Mapped[int] = mapped_column(Integer, default=0)
    tokens_out: Mapped[int] = mapped_column(Integer, default=0)
    result_url: Mapped[str | None] = mapped_column(String, nullable=True)
    preview: Mapped[list | None] = mapped_column(JSON, nullable=True)
    dataset_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
