import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class NotebookKernelRequest(Base):
    __tablename__ = "notebook_kernel_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"nkr_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    applicant_type: Mapped[str] = mapped_column(String(16), index=True)  # student | umum
    nim: Mapped[str | None] = mapped_column(String(32), nullable=True)
    institution: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reason_md: Mapped[str] = mapped_column(Text, default="")
    ktm_storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
