"""user settings

Revision ID: 012_user_settings
Revises: 011_notebook_source_owner
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012_user_settings"
down_revision: Union[str, None] = "011_notebook_source_owner"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("settings", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))


def downgrade() -> None:
    op.drop_column("users", "settings")
