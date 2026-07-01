"""org announcements

Revision ID: 062_org_announcements
Revises: 061_team_admin_fields
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "062_org_announcements"
down_revision: Union[str, None] = "061_team_admin_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "org_announcements",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("org_id", sa.String(), nullable=False),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("body_md", sa.Text(), nullable=False),
        sa.Column("images", sa.Text(), server_default="[]", nullable=False),
        sa.Column("visibility", sa.String(), server_default="public", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_org_announcements_org_id", "org_announcements", ["org_id"])
    op.create_index("ix_org_announcements_author_id", "org_announcements", ["author_id"])


def downgrade() -> None:
    op.drop_index("ix_org_announcements_author_id", table_name="org_announcements")
    op.drop_index("ix_org_announcements_org_id", table_name="org_announcements")
    op.drop_table("org_announcements")
