"""tos acceptance

Revision ID: 017_tos_acceptance
Revises: 016_blog
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "017_tos_acceptance"
down_revision: Union[str, None] = "016_blog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("accepted_tos_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("accepted_tos_version", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "accepted_tos_version")
    op.drop_column("users", "accepted_tos_at")
