"""competition scoring fields

Revision ID: 008_competition_scoring_fields
Revises: 007_official_featured
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_competition_scoring_fields"
down_revision: Union[str, None] = "007_official_featured"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "competitions",
        sa.Column("daily_submission_limit", sa.Integer(), nullable=False, server_default="5"),
    )
    op.add_column("competitions", sa.Column("ground_truth_key", sa.String(), nullable=True))
    op.add_column("submissions", sa.Column("private_score", sa.Float(), nullable=True))
    op.add_column("submissions", sa.Column("file_key", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("submissions", "file_key")
    op.drop_column("submissions", "private_score")
    op.drop_column("competitions", "ground_truth_key")
    op.drop_column("competitions", "daily_submission_limit")
