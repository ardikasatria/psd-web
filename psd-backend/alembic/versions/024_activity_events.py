"""activity events

Revision ID: 024_activity_events
Revises: 023_quests
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "024_activity_events"
down_revision: Union[str, None] = "023_quests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "activity_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=True),
        sa.Column("session_id", sa.String(), nullable=True),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("entity_type", sa.String(), nullable=True),
        sa.Column("entity_id", sa.String(), nullable=True),
        sa.Column("category_id", sa.String(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_activity_events_action"), "activity_events", ["action"], unique=False)
    op.create_index(op.f("ix_activity_events_category_id"), "activity_events", ["category_id"], unique=False)
    op.create_index(op.f("ix_activity_events_created_at"), "activity_events", ["created_at"], unique=False)
    op.create_index(op.f("ix_activity_events_session_id"), "activity_events", ["session_id"], unique=False)
    op.create_index(op.f("ix_activity_events_user_id"), "activity_events", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_activity_events_user_id"), table_name="activity_events")
    op.drop_index(op.f("ix_activity_events_session_id"), table_name="activity_events")
    op.drop_index(op.f("ix_activity_events_created_at"), table_name="activity_events")
    op.drop_index(op.f("ix_activity_events_category_id"), table_name="activity_events")
    op.drop_index(op.f("ix_activity_events_action"), table_name="activity_events")
    op.drop_table("activity_events")
