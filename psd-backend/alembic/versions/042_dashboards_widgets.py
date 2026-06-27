"""dashboards and widgets

Revision ID: 042_dashboards
Revises: 041_pipeline_runs
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "042_dashboards"
down_revision: Union[str, None] = "041_pipeline_runs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "dashboards",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=True),
        sa.Column("room_id", sa.String(), nullable=True),
        sa.Column("pipeline_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description_md", sa.String(), nullable=False),
        sa.Column("layout_json", sa.JSON(), nullable=False),
        sa.Column("visibility", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["idea_rooms.id"]),
        sa.ForeignKeyConstraint(["pipeline_id"], ["pipelines.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_dashboards_slug"), "dashboards", ["slug"], unique=True)
    op.create_index(op.f("ix_dashboards_team_id"), "dashboards", ["team_id"], unique=False)
    op.create_index(op.f("ix_dashboards_room_id"), "dashboards", ["room_id"], unique=False)

    op.create_table(
        "widgets",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("dashboard_id", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("query_json", sa.JSON(), nullable=False),
        sa.Column("options_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["dashboard_id"], ["dashboards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_widgets_dashboard_id"), "widgets", ["dashboard_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_widgets_dashboard_id"), table_name="widgets")
    op.drop_table("widgets")
    op.drop_index(op.f("ix_dashboards_room_id"), table_name="dashboards")
    op.drop_index(op.f("ix_dashboards_team_id"), table_name="dashboards")
    op.drop_index(op.f("ix_dashboards_slug"), table_name="dashboards")
    op.drop_table("dashboards")
