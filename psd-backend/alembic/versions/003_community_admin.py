"""repo likes, per-asset discussions, user is_active

Revision ID: 003_community_admin
Revises: 002_create_all
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_community_admin"
down_revision: Union[str, None] = "002_create_all"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))

    op.create_table(
        "repo_likes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("repo_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["repo_id"], ["repos.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "repo_id", name="uq_user_repo_like"),
    )
    op.create_index(op.f("ix_repo_likes_repo_id"), "repo_likes", ["repo_id"], unique=False)
    op.create_index(op.f("ix_repo_likes_user_id"), "repo_likes", ["user_id"], unique=False)

    op.add_column("threads", sa.Column("repo_id", sa.String(), nullable=True))
    op.create_foreign_key("fk_threads_repo_id", "threads", "repos", ["repo_id"], ["id"])
    op.create_index(op.f("ix_threads_repo_id"), "threads", ["repo_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_threads_repo_id"), table_name="threads")
    op.drop_constraint("fk_threads_repo_id", "threads", type_="foreignkey")
    op.drop_column("threads", "repo_id")

    op.drop_index(op.f("ix_repo_likes_user_id"), table_name="repo_likes")
    op.drop_index(op.f("ix_repo_likes_repo_id"), table_name="repo_likes")
    op.drop_table("repo_likes")

    op.drop_column("users", "is_active")
