"""course review workflow

Revision ID: 019_course_review
Revises: 018_notifications
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "019_course_review"
down_revision: Union[str, None] = "018_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("publisher_id", sa.String(), nullable=True))
    op.add_column("courses", sa.Column("review_note", sa.String(), nullable=True))
    op.create_foreign_key("fk_courses_publisher_id", "courses", "users", ["publisher_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_courses_publisher_id", "courses", type_="foreignkey")
    op.drop_column("courses", "review_note")
    op.drop_column("courses", "publisher_id")
