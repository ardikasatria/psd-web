"""rich profile fields

Revision ID: 004_rich_profile
Revises: 003_community_admin
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_rich_profile"
down_revision: Union[str, None] = "003_community_admin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("banner_url", sa.String(), nullable=True))
    op.add_column("users", sa.Column("accent_color", sa.String(), nullable=True))
    op.add_column("users", sa.Column("pronouns", sa.String(), nullable=True))
    op.add_column("users", sa.Column("location", sa.String(), nullable=True))
    op.add_column("users", sa.Column("about_md", sa.String(), nullable=True))
    op.add_column("users", sa.Column("status_emoji", sa.String(), nullable=True))
    op.add_column("users", sa.Column("status_text", sa.String(), nullable=True))
    op.add_column("users", sa.Column("links", sa.JSON(), nullable=False, server_default="[]"))


def downgrade() -> None:
    op.drop_column("users", "links")
    op.drop_column("users", "status_text")
    op.drop_column("users", "status_emoji")
    op.drop_column("users", "about_md")
    op.drop_column("users", "location")
    op.drop_column("users", "pronouns")
    op.drop_column("users", "accent_color")
    op.drop_column("users", "banner_url")
