"""forum engagement

Revision ID: 027_forum_engagement
Revises: 026_member_share_token
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "027_forum_engagement"
down_revision: Union[str, None] = "026_member_share_token"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "forum_votes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "target_type", "target_id", name="uq_forum_vote"),
    )
    op.create_index("ix_forum_votes_user_id", "forum_votes", ["user_id"])
    op.create_index("ix_forum_votes_target_id", "forum_votes", ["target_id"])

    op.create_table(
        "forum_reactions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("target_type", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("emoji", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "target_type", "target_id", "emoji", name="uq_forum_reaction"),
    )
    op.create_index("ix_forum_reactions_user_id", "forum_reactions", ["user_id"])
    op.create_index("ix_forum_reactions_target_id", "forum_reactions", ["target_id"])


def downgrade() -> None:
    op.drop_index("ix_forum_reactions_target_id", table_name="forum_reactions")
    op.drop_index("ix_forum_reactions_user_id", table_name="forum_reactions")
    op.drop_table("forum_reactions")
    op.drop_index("ix_forum_votes_target_id", table_name="forum_votes")
    op.drop_index("ix_forum_votes_user_id", table_name="forum_votes")
    op.drop_table("forum_votes")
