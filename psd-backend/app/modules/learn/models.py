import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.modules.users.models import User


class Course(Base):
    __tablename__ = "courses"

    slug: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    level: Mapped[str] = mapped_column(String)
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(String, default="")
    requirements_md: Mapped[str | None] = mapped_column(String, nullable=True)
    modules: Mapped[list] = mapped_column(JSON, default=list)
    author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    publisher_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    review_note: Mapped[str | None] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    access_type: Mapped[str] = mapped_column(String, default="lifetime")
    access_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)

    author: Mapped[User | None] = relationship(foreign_keys=[author_id], lazy="selectin")
    publisher: Mapped[User | None] = relationship(foreign_keys=[publisher_id], lazy="selectin")

    @property
    def lessons_count(self) -> int:
        return sum(len(m.get("lessons", [])) for m in (self.modules or []))


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_slug", name="uq_enroll"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"enr_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    course_slug: Mapped[str] = mapped_column(ForeignKey("courses.slug"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("user_id", "course_slug", "lesson_id", name="uq_progress"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"prg_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    course_slug: Mapped[str] = mapped_column(String, index=True)
    lesson_id: Mapped[str] = mapped_column(String)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LearningPath(Base):
    __tablename__ = "learning_paths"

    slug: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default="")
    course_slugs: Mapped[list] = mapped_column(JSON, default=list)
    items: Mapped[list] = mapped_column(JSON, default=list)


class Notebook(Base):
    __tablename__ = "notebooks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"nb_{uuid.uuid4().hex[:12]}")
    title: Mapped[str] = mapped_column(String)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    description: Mapped[str] = mapped_column(String, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    owner: Mapped[User] = relationship(lazy="selectin")
