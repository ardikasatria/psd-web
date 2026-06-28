"""Engine + schedule pipeline (Langkah 54)

Revision ID: 046_engine
Revises: 045_superset
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "046_engine"
down_revision: Union[str, None] = "045_superset"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pipelines",
        sa.Column("engine", sa.String(), server_default="auto", nullable=False),
    )
    op.add_column("pipelines", sa.Column("schedule_cron", sa.String(), nullable=True))
    op.add_column("pipeline_runs", sa.Column("execution_engine", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("pipeline_runs", "execution_engine")
    op.drop_column("pipelines", "schedule_cron")
    op.drop_column("pipelines", "engine")
