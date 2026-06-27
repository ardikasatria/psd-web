"""member share token

Revision ID: 026_member_share_token
Revises: 025_micro_learning
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "026_member_share_token"
down_revision: Union[str, None] = "025_micro_learning"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("member_share_token", sa.String(), nullable=True))
    op.create_index("ix_users_member_share_token", "users", ["member_share_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_member_share_token", table_name="users")
    op.drop_column("users", "member_share_token")
