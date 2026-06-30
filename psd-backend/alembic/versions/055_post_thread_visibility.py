"""post and thread visibility

Revision ID: 055_post_thread_visibility
Revises: 054_competition_enhance
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "055_post_thread_visibility"
down_revision: Union[str, None] = "054_competition_enhance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "social_posts",
        sa.Column("visibility", sa.String(), server_default="public", nullable=False),
    )
    op.add_column(
        "threads",
        sa.Column("visibility", sa.String(), server_default="public", nullable=False),
    )
    op.add_column(
        "posts",
        sa.Column("visibility", sa.String(), server_default="public", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("posts", "visibility")
    op.drop_column("threads", "visibility")
    op.drop_column("social_posts", "visibility")
