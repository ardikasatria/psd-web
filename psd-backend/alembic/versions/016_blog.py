"""blog

Revision ID: 016_blog
Revises: 015_roles
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_blog"
down_revision: Union[str, None] = "015_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "blog_posts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("summary", sa.String(), nullable=False, server_default=""),
        sa.Column("body_md", sa.String(), nullable=False, server_default=""),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_blog_posts_author_id"), "blog_posts", ["author_id"], unique=False)
    op.create_index(op.f("ix_blog_posts_slug"), "blog_posts", ["slug"], unique=True)
    op.create_index(op.f("ix_blog_posts_status"), "blog_posts", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_blog_posts_status"), table_name="blog_posts")
    op.drop_index(op.f("ix_blog_posts_slug"), table_name="blog_posts")
    op.drop_index(op.f("ix_blog_posts_author_id"), table_name="blog_posts")
    op.drop_table("blog_posts")
