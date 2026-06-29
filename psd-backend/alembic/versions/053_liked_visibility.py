"""Liked assets visibility fields

Revision ID: 053_liked_visibility
Revises: 052_engagement
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "053_liked_visibility"
down_revision: Union[str, None] = "052_engagement"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "asset_loves",
        sa.Column("is_public", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.create_index("ix_asset_loves_is_public", "asset_loves", ["is_public"])
    op.add_column(
        "users",
        sa.Column("liked_list_public", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("liked_default_public", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "liked_default_public")
    op.drop_column("users", "liked_list_public")
    op.drop_index("ix_asset_loves_is_public", table_name="asset_loves")
    op.drop_column("asset_loves", "is_public")
