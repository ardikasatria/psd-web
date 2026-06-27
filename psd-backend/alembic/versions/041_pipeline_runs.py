"""pipeline runs

Revision ID: 041_pipeline_runs
Revises: 040_factory
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "041_pipeline_runs"
down_revision: Union[str, None] = "040_factory"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pipeline_runs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("pipeline_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("rows_out", sa.Integer(), nullable=False),
        sa.Column("layers_json", sa.JSON(), nullable=False),
        sa.Column("lineage_json", sa.JSON(), nullable=False),
        sa.Column("error", sa.String(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["pipeline_id"], ["pipelines.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pipeline_runs_pipeline_id"), "pipeline_runs", ["pipeline_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_pipeline_runs_pipeline_id"), table_name="pipeline_runs")
    op.drop_table("pipeline_runs")
