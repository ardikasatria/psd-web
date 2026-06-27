"""room problem and data

Revision ID: 032_room_problem_and_data
Revises: 031_idea_rooms
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "032_room_problem_and_data"
down_revision: Union[str, None] = "031_idea_rooms"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "room_problems",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("room_id", sa.String(), nullable=False),
        sa.Column("statement_md", sa.String(), nullable=False),
        sa.Column("suggested_metric", sa.String(), nullable=True),
        sa.Column("data_kind", sa.String(), nullable=False),
        sa.Column("data_spec", sa.JSON(), nullable=True),
        sa.Column("unstructured_guidance_md", sa.String(), nullable=True),
        sa.Column("generated_by", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["room_id"], ["idea_rooms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_room_problems_room_id"), "room_problems", ["room_id"], unique=True)

    op.add_column("idea_rooms", sa.Column("generation_error", sa.String(), nullable=True))
    op.add_column("repos", sa.Column("room_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_repos_room_id"), "repos", ["room_id"], unique=False)
    op.create_foreign_key("fk_repos_room_id", "repos", "idea_rooms", ["room_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_repos_room_id", "repos", type_="foreignkey")
    op.drop_index(op.f("ix_repos_room_id"), table_name="repos")
    op.drop_column("repos", "room_id")
    op.drop_column("idea_rooms", "generation_error")
    op.drop_index(op.f("ix_room_problems_room_id"), table_name="room_problems")
    op.drop_table("room_problems")
