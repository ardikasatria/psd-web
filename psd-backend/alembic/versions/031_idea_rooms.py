"""idea rooms

Revision ID: 031_idea_rooms
Revises: 030_synthesis_jobs
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "031_idea_rooms"
down_revision: Union[str, None] = "030_synthesis_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "idea_rooms",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("pitch_md", sa.String(), nullable=False),
        sa.Column("founder_id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=False),
        sa.Column("category_id", sa.String(), nullable=True),
        sa.Column("subcategory_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("max_members", sa.Integer(), nullable=True),
        sa.Column("framing_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data_mode", sa.String(), nullable=True),
        sa.Column("synthesis_job_id", sa.String(), nullable=True),
        sa.Column("dataset_repo_slug", sa.String(), nullable=True),
        sa.Column("solution_template", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["founder_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["subcategory_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_idea_rooms_slug"), "idea_rooms", ["slug"], unique=True)
    op.create_index(op.f("ix_idea_rooms_team_id"), "idea_rooms", ["team_id"], unique=False)
    op.create_index(op.f("ix_idea_rooms_category_id"), "idea_rooms", ["category_id"], unique=False)
    op.create_index(op.f("ix_idea_rooms_status"), "idea_rooms", ["status"], unique=False)

    op.create_table(
        "problem_components",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("room_id", sa.String(), nullable=False),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("content_md", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["idea_rooms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_problem_components_room_id"), "problem_components", ["room_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_problem_components_room_id"), table_name="problem_components")
    op.drop_table("problem_components")
    op.drop_index(op.f("ix_idea_rooms_status"), table_name="idea_rooms")
    op.drop_index(op.f("ix_idea_rooms_category_id"), table_name="idea_rooms")
    op.drop_index(op.f("ix_idea_rooms_team_id"), table_name="idea_rooms")
    op.drop_index(op.f("ix_idea_rooms_slug"), table_name="idea_rooms")
    op.drop_table("idea_rooms")
