"""room submission

Revision ID: 033_room_submission
Revises: 032_room_problem_and_data
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "033_room_submission"
down_revision: Union[str, None] = "032_room_problem_and_data"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "room_submissions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("room_id", sa.String(), nullable=False),
        sa.Column("submitted_by", sa.String(), nullable=False),
        sa.Column("notebook_id", sa.String(), nullable=True),
        sa.Column("result_summary_md", sa.String(), nullable=False),
        sa.Column("asset_refs", sa.JSON(), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["notebook_id"], ["notebooks.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["idea_rooms.id"]),
        sa.ForeignKeyConstraint(["submitted_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_room_submissions_room_id"), "room_submissions", ["room_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_room_submissions_room_id"), table_name="room_submissions")
    op.drop_table("room_submissions")
