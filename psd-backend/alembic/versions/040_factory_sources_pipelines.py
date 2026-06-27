"""data sources and pipelines

Revision ID: 040_factory
Revises: 039_collections
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "040_factory"
down_revision: Union[str, None] = "039_collections"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "data_sources",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("uri", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("schema_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_data_sources_team_id"), "data_sources", ["team_id"], unique=False)

    op.create_table(
        "pipelines",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=True),
        sa.Column("room_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("spec_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("validation_error", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["idea_rooms.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pipelines_room_id"), "pipelines", ["room_id"], unique=False)
    op.create_index(op.f("ix_pipelines_slug"), "pipelines", ["slug"], unique=True)
    op.create_index(op.f("ix_pipelines_team_id"), "pipelines", ["team_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_pipelines_team_id"), table_name="pipelines")
    op.drop_index(op.f("ix_pipelines_slug"), table_name="pipelines")
    op.drop_index(op.f("ix_pipelines_room_id"), table_name="pipelines")
    op.drop_table("pipelines")
    op.drop_index(op.f("ix_data_sources_team_id"), table_name="data_sources")
    op.drop_table("data_sources")
