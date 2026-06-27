"""micro learning

Revision ID: 025_micro_learning
Revises: 024_activity_events
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "025_micro_learning"
down_revision: Union[str, None] = "024_activity_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "micro_lessons",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("content_md", sa.String(), nullable=False, server_default=""),
        sa.Column("duration_min", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("category_id", sa.String(), nullable=True),
        sa.Column("quiz", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_micro_lessons_active"), "micro_lessons", ["active"], unique=False)
    op.create_index(op.f("ix_micro_lessons_category_id"), "micro_lessons", ["category_id"], unique=False)
    op.create_index(op.f("ix_micro_lessons_slug"), "micro_lessons", ["slug"], unique=True)

    op.create_table(
        "micro_completions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("micro_id", sa.String(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["micro_id"], ["micro_lessons.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "micro_id", name="uq_micro_done"),
    )
    op.create_index(op.f("ix_micro_completions_completed_at"), "micro_completions", ["completed_at"], unique=False)
    op.create_index(op.f("ix_micro_completions_micro_id"), "micro_completions", ["micro_id"], unique=False)
    op.create_index(op.f("ix_micro_completions_user_id"), "micro_completions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_micro_completions_user_id"), table_name="micro_completions")
    op.drop_index(op.f("ix_micro_completions_micro_id"), table_name="micro_completions")
    op.drop_index(op.f("ix_micro_completions_completed_at"), table_name="micro_completions")
    op.drop_table("micro_completions")
    op.drop_index(op.f("ix_micro_lessons_slug"), table_name="micro_lessons")
    op.drop_index(op.f("ix_micro_lessons_category_id"), table_name="micro_lessons")
    op.drop_index(op.f("ix_micro_lessons_active"), table_name="micro_lessons")
    op.drop_table("micro_lessons")
