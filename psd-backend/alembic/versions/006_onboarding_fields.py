"""onboarding fields

Revision ID: 006_onboarding_fields
Revises: 005_email_verified
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_onboarding_fields"
down_revision: Union[str, None] = "005_email_verified"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("interests", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("users", sa.Column("onboarded", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("users", "onboarded")
    op.drop_column("users", "interests")
