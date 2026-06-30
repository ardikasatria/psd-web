"""nested comments and forum replies

Revision ID: 056_nested_comments_replies
Revises: 055_post_thread_visibility
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "056_nested_comments_replies"
down_revision: Union[str, None] = "055_post_thread_visibility"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "social_post_comments",
        sa.Column("parent_id", sa.String(), sa.ForeignKey("social_post_comments.id"), nullable=True),
    )
    op.add_column(
        "social_post_comments",
        sa.Column("reply_to_author_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_social_post_comments_parent_id", "social_post_comments", ["parent_id"])

    op.add_column(
        "posts",
        sa.Column("parent_id", sa.String(), sa.ForeignKey("posts.id"), nullable=True),
    )
    op.add_column(
        "posts",
        sa.Column("reply_to_author_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_posts_parent_id", "posts", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_posts_parent_id", table_name="posts")
    op.drop_column("posts", "reply_to_author_id")
    op.drop_column("posts", "parent_id")
    op.drop_index("ix_social_post_comments_parent_id", table_name="social_post_comments")
    op.drop_column("social_post_comments", "reply_to_author_id")
    op.drop_column("social_post_comments", "parent_id")
