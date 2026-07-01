"""team featured and focus for admin

Revision ID: 061_team_admin_fields
Revises: 060_organizations
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "061_team_admin_fields"
down_revision: Union[str, None] = "060_organizations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("focus", sa.String(), nullable=True))
    op.add_column(
        "teams",
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_teams_featured", "teams", ["featured"])


def downgrade() -> None:
    op.drop_index("ix_teams_featured", table_name="teams")
    op.drop_column("teams", "featured")
    op.drop_column("teams", "focus")
