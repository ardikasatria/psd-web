"""event registration attended

Revision ID: 010_event_registration_attended
Revises: 009_learning_management
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010_event_registration_attended"
down_revision: Union[str, None] = "009_learning_management"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "event_registrations",
        sa.Column("attended", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "event_registrations",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("event_registrations", "created_at")
    op.drop_column("event_registrations", "attended")
