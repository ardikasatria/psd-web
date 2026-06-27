"""course requirements

Revision ID: 020_course_requirements
Revises: 019_course_review
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "020_course_requirements"
down_revision: Union[str, None] = "019_course_review"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("requirements_md", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("courses", "requirements_md")
