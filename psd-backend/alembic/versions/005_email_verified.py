"""email_verified

Revision ID: 005_email_verified
Revises: 004_rich_profile
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_email_verified"
down_revision: Union[str, None] = "004_rich_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "email_verified")
