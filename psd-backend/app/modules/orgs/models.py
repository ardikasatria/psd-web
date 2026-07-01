import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"org_{uuid.uuid4().hex[:12]}")
    handle: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, default="community")
    verification: Mapped[str] = mapped_column(String, default="unverified")
    base_permission: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrgMember(Base):
    __tablename__ = "org_members"
    __table_args__ = (UniqueConstraint("org_id", "user_id", name="uq_org_member"),)

    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String, default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrgTeam(Base):
    __tablename__ = "org_teams"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ot_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str] = mapped_column(String)


class OrgTeamMember(Base):
    __tablename__ = "org_team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_org_team_member"),)

    team_id: Mapped[str] = mapped_column(ForeignKey("org_teams.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)


class OrgAsset(Base):
    __tablename__ = "org_assets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"oa_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    kind: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    path: Mapped[str] = mapped_column(String, default="")


class OrgAssetGrant(Base):
    __tablename__ = "org_asset_grants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    asset_id: Mapped[str] = mapped_column(String, index=True)
    team_id: Mapped[str | None] = mapped_column(ForeignKey("org_teams.id"), nullable=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    level: Mapped[str] = mapped_column(String)


class OrgVerificationRequest(Base):
    __tablename__ = "org_verification_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"vr_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    doc_keys: Mapped[str] = mapped_column(Text)
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"op_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    skills: Mapped[str] = mapped_column(Text, default="[]")
    status: Mapped[str] = mapped_column(String, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OpportunityApplication(Base):
    __tablename__ = "opportunity_applications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"app_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    opportunity_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"), index=True)
    applicant_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrgAnnouncement(Base):
    __tablename__ = "org_announcements"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ann_{uuid.uuid4().hex[:12]}")
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    body_md: Mapped[str] = mapped_column(Text)
    images: Mapped[str] = mapped_column(Text, default="[]")
    visibility: Mapped[str] = mapped_column(String, default="public")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, onupdate=func.now())
