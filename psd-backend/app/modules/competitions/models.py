import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


def _id(p: str):
    return lambda: f"{p}_{uuid.uuid4().hex[:12]}"


class Competition(Base):
    __tablename__ = "competitions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("cmp"))
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    sponsor: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, index=True)
    metric: Mapped[str] = mapped_column(String)
    participants: Mapped[int] = mapped_column(Integer, default=0)
    prize_pool: Mapped[str | None] = mapped_column(String, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    overview_md: Mapped[str] = mapped_column(String, default="")
    rules_md: Mapped[str] = mapped_column(String, default="")
    dataset_info_md: Mapped[str] = mapped_column(String, default="")
    prizes: Mapped[list] = mapped_column(JSON, default=list)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    daily_submission_limit: Mapped[int] = mapped_column(Integer, default=5)
    ground_truth_key: Mapped[str | None] = mapped_column(String, nullable=True)
    max_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    higher_is_better: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
    proposer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)


class CompetitionProposal(Base):
    __tablename__ = "competition_proposals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("cmpp"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    proposed_slug: Mapped[str] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String)
    sponsor: Mapped[str | None] = mapped_column(String, nullable=True)
    metric: Mapped[str] = mapped_column(String, default="Accuracy")
    prize_pool: Mapped[str | None] = mapped_column(String, nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    overview_md: Mapped[str] = mapped_column(String, default="")
    rules_md: Mapped[str] = mapped_column(String, default="")
    dataset_info_md: Mapped[str] = mapped_column(String, default="")
    daily_submission_limit: Mapped[int] = mapped_column(Integer, default=5)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    review_note: Mapped[str | None] = mapped_column(String, nullable=True)
    competition_id: Mapped[str | None] = mapped_column(ForeignKey("competitions.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LeaderboardRow(Base):
    __tablename__ = "leaderboard_rows"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("lb"))
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    board: Mapped[str] = mapped_column(String, default="public")
    rank: Mapped[int] = mapped_column(Integer)
    participant_username: Mapped[str] = mapped_column(String)
    participant_avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    score: Mapped[float] = mapped_column(Float)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("sub"))
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    notebook_id: Mapped[str | None] = mapped_column(String, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    filename: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="submitted", index=True)
    public_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    private_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    file_key: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CompetitionNotebook(Base):
    __tablename__ = "competition_notebooks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("cnb"))
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    notebook_id: Mapped[str] = mapped_column(String, index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    favorite_count: Mapped[int] = mapped_column(Integer, default=0, index=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CompetitionNotebookFavorite(Base):
    __tablename__ = "competition_notebook_favorites"

    competition_notebook_id: Mapped[str] = mapped_column(
        ForeignKey("competition_notebooks.id"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
