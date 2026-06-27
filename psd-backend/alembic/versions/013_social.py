"""social follow and feed

Revision ID: 013_social
Revises: 012_user_settings
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "013_social"
down_revision: Union[str, None] = "012_user_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "follows",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("follower_id", sa.String(), nullable=False),
        sa.Column("following_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["follower_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["following_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("follower_id", "following_id", name="uq_follow"),
    )
    op.create_index(op.f("ix_follows_follower_id"), "follows", ["follower_id"], unique=False)
    op.create_index(op.f("ix_follows_following_id"), "follows", ["following_id"], unique=False)

    op.create_table(
        "social_posts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("body_md", sa.String(), nullable=False),
        sa.Column("images", sa.JSON(), nullable=False),
        sa.Column("asset_kind", sa.String(), nullable=True),
        sa.Column("asset_slug", sa.String(), nullable=True),
        sa.Column("like_count", sa.Integer(), nullable=False),
        sa.Column("comment_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_social_posts_author_id"), "social_posts", ["author_id"], unique=False)

    op.create_table(
        "social_post_likes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("post_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["social_posts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "post_id", name="uq_post_like"),
    )
    op.create_index(op.f("ix_social_post_likes_post_id"), "social_post_likes", ["post_id"], unique=False)
    op.create_index(op.f("ix_social_post_likes_user_id"), "social_post_likes", ["user_id"], unique=False)

    op.create_table(
        "social_post_comments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("post_id", sa.String(), nullable=False),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("body_md", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["post_id"], ["social_posts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_social_post_comments_author_id"), "social_post_comments", ["author_id"], unique=False)
    op.create_index(op.f("ix_social_post_comments_post_id"), "social_post_comments", ["post_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_social_post_comments_post_id"), table_name="social_post_comments")
    op.drop_index(op.f("ix_social_post_comments_author_id"), table_name="social_post_comments")
    op.drop_table("social_post_comments")
    op.drop_index(op.f("ix_social_post_likes_user_id"), table_name="social_post_likes")
    op.drop_index(op.f("ix_social_post_likes_post_id"), table_name="social_post_likes")
    op.drop_table("social_post_likes")
    op.drop_index(op.f("ix_social_posts_author_id"), table_name="social_posts")
    op.drop_table("social_posts")
    op.drop_index(op.f("ix_follows_following_id"), table_name="follows")
    op.drop_index(op.f("ix_follows_follower_id"), table_name="follows")
    op.drop_table("follows")
