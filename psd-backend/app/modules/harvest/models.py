import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class HarvestJob(Base):
    __tablename__ = "harvest_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"hv_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    source_url: Mapped[str] = mapped_column(String)
    method: Mapped[str] = mapped_column(String, default="GET")
    params: Mapped[str] = mapped_column(Text, default="{}")
    auth_type: Mapped[str] = mapped_column(String, default="none")
    auth_ref: Mapped[str | None] = mapped_column(String, nullable=True)
    pagination: Mapped[str] = mapped_column(String, default="none")
    page_size: Mapped[int] = mapped_column(Integer, default=50)
    max_pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_records: Mapped[int | None] = mapped_column(Integer, nullable=True)
    records_path: Mapped[str | None] = mapped_column(String, nullable=True)
    cursor_path: Mapped[str | None] = mapped_column(String, nullable=True)
    field_map: Mapped[str | None] = mapped_column(Text, nullable=True)
    rate_per_min: Mapped[int] = mapped_column(Integer, default=30)
    output_mode: Mapped[str] = mapped_column(String, default="new")
    output_format: Mapped[str] = mapped_column(String, default="csv")
    dataset_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    records_written: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    result_dataset: Mapped[str | None] = mapped_column(String, nullable=True)
    run_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
