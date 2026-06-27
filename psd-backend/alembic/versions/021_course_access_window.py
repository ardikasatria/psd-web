"""course access window

Revision ID: 021_course_access_window
Revises: 020_course_requirements
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "021_course_access_window"
down_revision: Union[str, None] = "020_course_requirements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("access_type", sa.String(), nullable=False, server_default="lifetime"))
    op.add_column("courses", sa.Column("access_days", sa.Integer(), nullable=True))
    op.add_column("enrollments", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("enrollments", "expires_at")
    op.drop_column("courses", "access_days")
    op.drop_column("courses", "access_type")
