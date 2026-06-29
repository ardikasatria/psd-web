"""Penemuan komunitas — afiliasi & counter sosial

Revision ID: 051_discovery_fields
Revises: 050_notebook_kernel_requests
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "051_discovery_fields"
down_revision: Union[str, None] = "050_notebook_kernel_requests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("affiliation", sa.String(), nullable=True))
    op.add_column("users", sa.Column("follower_count", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("post_like_total", sa.Integer(), server_default="0", nullable=False))
    op.create_index("ix_users_affiliation", "users", ["affiliation"])
    op.create_index("ix_users_follower_count", "users", ["follower_count"])

    op.execute(
        """
        UPDATE users SET follower_count = (
            SELECT COUNT(*) FROM follows WHERE follows.following_id = users.id
        )
        """
    )
    op.execute(
        """
        UPDATE users SET post_like_total = (
            SELECT COALESCE(SUM(social_posts.like_count), 0)
            FROM social_posts WHERE social_posts.author_id = users.id
        )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_users_follower_count", table_name="users")
    op.drop_index("ix_users_affiliation", table_name="users")
    op.drop_column("users", "post_like_total")
    op.drop_column("users", "follower_count")
    op.drop_column("users", "affiliation")
