"""gamification reputation and badges

Revision ID: 014_gamification
Revises: 013_social
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "014_gamification"
down_revision: Union[str, None] = "013_social"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("reputation", sa.Integer(), nullable=False, server_default="0"))
    op.create_index(op.f("ix_users_reputation"), "users", ["reputation"], unique=False)

    op.create_table(
        "user_badges",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("badge_id", sa.String(), nullable=False),
        sa.Column("awarded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )
    op.create_index(op.f("ix_user_badges_user_id"), "user_badges", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_badges_user_id"), table_name="user_badges")
    op.drop_table("user_badges")
    op.drop_index(op.f("ix_users_reputation"), table_name="users")
    op.drop_column("users", "reputation")
