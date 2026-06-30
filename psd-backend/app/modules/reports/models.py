import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.users.models import User


class ContentReport(Base):
    __tablename__ = "content_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"rp_{uuid.uuid4().hex[:12]}")
    target_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    kind: Mapped[str] = mapped_column(String)
    target_id: Mapped[str] = mapped_column(String)
    report_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    decision: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    entries: Mapped[list["ReportEntry"]] = relationship(back_populates="report", lazy="selectin")


class ReportEntry(Base):
    __tablename__ = "report_entries"
    __table_args__ = (UniqueConstraint("report_id", "reporter_id", name="uq_report_reporter"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[str] = mapped_column(ForeignKey("content_reports.id"), index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str] = mapped_column(String)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    report: Mapped[ContentReport] = relationship(back_populates="entries")
    reporter: Mapped[User] = relationship(lazy="selectin")
