"""quests

Revision ID: 023_quests
Revises: 022_categories
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "023_quests"
down_revision: Union[str, None] = "022_categories"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "quests",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("steps", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("reward_reputation", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reward_badge", sa.String(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quests_slug"), "quests", ["slug"], unique=True)

    op.create_table(
        "quest_claims",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("quest_slug", sa.String(), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "quest_slug", name="uq_quest_claim"),
    )
    op.create_index(op.f("ix_quest_claims_quest_slug"), "quest_claims", ["quest_slug"], unique=False)
    op.create_index(op.f("ix_quest_claims_user_id"), "quest_claims", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_quest_claims_user_id"), table_name="quest_claims")
    op.drop_index(op.f("ix_quest_claims_quest_slug"), table_name="quest_claims")
    op.drop_table("quest_claims")
    op.drop_index(op.f("ix_quests_slug"), table_name="quests")
    op.drop_table("quests")
