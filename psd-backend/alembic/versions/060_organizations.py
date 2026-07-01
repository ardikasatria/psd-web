"""organizations — tata kelola org, verifikasi, peluang

Revision ID: 060_organizations
Revises: 059_repo_trash
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "060_organizations"
down_revision: Union[str, None] = "059_repo_trash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("handle", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("verification", sa.String(), nullable=False),
        sa.Column("base_permission", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("suspended", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_organizations_handle"), "organizations", ["handle"], unique=True)

    op.create_table(
        "org_members",
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("org_id", "user_id"),
        sa.UniqueConstraint("org_id", "user_id", name="uq_org_member"),
    )

    op.create_table(
        "org_teams",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_org_teams_org_id"), "org_teams", ["org_id"], unique=False)

    op.create_table(
        "org_team_members",
        sa.Column("team_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["org_teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("team_id", "user_id"),
        sa.UniqueConstraint("team_id", "user_id", name="uq_org_team_member"),
    )

    op.create_table(
        "org_assets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("path", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_org_assets_org_id"), "org_assets", ["org_id"], unique=False)

    op.create_table(
        "org_asset_grants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("asset_id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("level", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["org_teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_org_asset_grants_org_id"), "org_asset_grants", ["org_id"], unique=False)
    op.create_index(op.f("ix_org_asset_grants_asset_id"), "org_asset_grants", ["asset_id"], unique=False)

    op.create_table(
        "org_verification_requests",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("doc_keys", sa.Text(), nullable=False),
        sa.Column("reviewed_by", sa.String(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_org_verification_requests_org_id"), "org_verification_requests", ["org_id"], unique=False)

    op.create_table(
        "opportunities",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("skills", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_opportunities_org_id"), "opportunities", ["org_id"], unique=False)

    op.create_table(
        "opportunity_applications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("opportunity_id", sa.String(), nullable=False),
        sa.Column("applicant_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["applicant_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["opportunity_id"], ["opportunities.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_opportunity_applications_org_id"), "opportunity_applications", ["org_id"], unique=False)
    op.create_index(op.f("ix_opportunity_applications_opportunity_id"), "opportunity_applications", ["opportunity_id"], unique=False)
    op.create_index(op.f("ix_opportunity_applications_applicant_id"), "opportunity_applications", ["applicant_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_opportunity_applications_applicant_id"), table_name="opportunity_applications")
    op.drop_index(op.f("ix_opportunity_applications_opportunity_id"), table_name="opportunity_applications")
    op.drop_index(op.f("ix_opportunity_applications_org_id"), table_name="opportunity_applications")
    op.drop_table("opportunity_applications")
    op.drop_index(op.f("ix_opportunities_org_id"), table_name="opportunities")
    op.drop_table("opportunities")
    op.drop_index(op.f("ix_org_verification_requests_org_id"), table_name="org_verification_requests")
    op.drop_table("org_verification_requests")
    op.drop_index(op.f("ix_org_asset_grants_asset_id"), table_name="org_asset_grants")
    op.drop_index(op.f("ix_org_asset_grants_org_id"), table_name="org_asset_grants")
    op.drop_table("org_asset_grants")
    op.drop_index(op.f("ix_org_assets_org_id"), table_name="org_assets")
    op.drop_table("org_assets")
    op.drop_table("org_team_members")
    op.drop_index(op.f("ix_org_teams_org_id"), table_name="org_teams")
    op.drop_table("org_teams")
    op.drop_table("org_members")
    op.drop_index(op.f("ix_organizations_handle"), table_name="organizations")
    op.drop_table("organizations")
