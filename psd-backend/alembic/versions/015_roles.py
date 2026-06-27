"""account_type and roles

Revision ID: 015_roles
Revises: 014_gamification
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "015_roles"
down_revision: Union[str, None] = "014_gamification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("account_type", sa.String(), nullable=False, server_default="individual"),
    )
    op.execute("UPDATE users SET account_type='organization' WHERE role='org_admin'")
    op.execute("UPDATE users SET role='member' WHERE role IN ('user', 'org_admin')")
    op.execute("UPDATE users SET role='superadmin' WHERE role='admin'")
    op.execute("UPDATE users SET role='superadmin' WHERE username='satria'")


def downgrade() -> None:
    op.execute("UPDATE users SET role='admin' WHERE role='superadmin'")
    op.execute("UPDATE users SET role='org_admin' WHERE account_type='organization'")
    op.execute("UPDATE users SET role='user' WHERE role='member' AND account_type='individual'")
    op.drop_column("users", "account_type")
