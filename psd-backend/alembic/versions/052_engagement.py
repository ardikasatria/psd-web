"""Engagement counters + user summary fields

Revision ID: 052_engagement
Revises: 051_discovery_fields
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "052_engagement"
down_revision: Union[str, None] = "051_discovery_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "asset_engagement",
        sa.Column("asset_key", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("love_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("download_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("view_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("share_feed", sa.Integer(), server_default="0", nullable=False),
        sa.Column("share_forum", sa.Integer(), server_default="0", nullable=False),
        sa.Column("share_external", sa.Integer(), server_default="0", nullable=False),
        sa.Column("share_link", sa.Integer(), server_default="0", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("asset_key"),
    )
    op.create_index("ix_asset_engagement_owner_id", "asset_engagement", ["owner_id"])

    op.create_table(
        "asset_loves",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("asset_key", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "asset_key", name="uq_asset_love"),
    )
    op.create_index("ix_asset_loves_user_id", "asset_loves", ["user_id"])
    op.create_index("ix_asset_loves_asset_key", "asset_loves", ["asset_key"])

    op.add_column("users", sa.Column("total_loves_received", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("total_shares", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("total_downloads", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("total_views", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("engagement_asset_count", sa.Integer(), server_default="0", nullable=False))
    op.create_index("ix_users_total_loves_received", "users", ["total_loves_received"])

    op.execute(
        """
        INSERT INTO asset_engagement (asset_key, owner_id, love_count, download_count, view_count)
        SELECT kind || ':' || slug, owner_id, COALESCE(likes, 0), COALESCE(downloads, 0), 0
        FROM repos
        """
    )
    op.execute(
        """
        INSERT INTO asset_loves (id, user_id, asset_key)
        SELECT 'alv_' || substr(md5(rl.user_id || rl.repo_id), 1, 12), rl.user_id, r.kind || ':' || r.slug
        FROM repo_likes rl
        JOIN repos r ON r.id = rl.repo_id
        """
    )
    op.execute(
        """
        UPDATE users SET
            total_loves_received = sub.loves,
            total_downloads = sub.downloads,
            engagement_asset_count = sub.cnt
        FROM (
            SELECT owner_id,
                   COALESCE(SUM(likes), 0) AS loves,
                   COALESCE(SUM(downloads), 0) AS downloads,
                   COUNT(*) AS cnt
            FROM repos GROUP BY owner_id
        ) sub
        WHERE users.id = sub.owner_id
        """
    )


def downgrade() -> None:
    op.drop_index("ix_users_total_loves_received", table_name="users")
    op.drop_column("users", "engagement_asset_count")
    op.drop_column("users", "total_views")
    op.drop_column("users", "total_downloads")
    op.drop_column("users", "total_shares")
    op.drop_column("users", "total_loves_received")
    op.drop_index("ix_asset_loves_asset_key", table_name="asset_loves")
    op.drop_index("ix_asset_loves_user_id", table_name="asset_loves")
    op.drop_table("asset_loves")
    op.drop_index("ix_asset_engagement_owner_id", table_name="asset_engagement")
    op.drop_table("asset_engagement")
