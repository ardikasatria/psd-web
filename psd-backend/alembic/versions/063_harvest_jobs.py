"""harvest jobs

Revision ID: 063_harvest_jobs
Revises: 062_org_announcements
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "063_harvest_jobs"
down_revision: Union[str, None] = "062_org_announcements"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "harvest_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("source_url", sa.String(), nullable=False),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("params", sa.Text(), nullable=False),
        sa.Column("auth_type", sa.String(), nullable=False),
        sa.Column("auth_ref", sa.String(), nullable=True),
        sa.Column("pagination", sa.String(), nullable=False),
        sa.Column("page_size", sa.Integer(), nullable=False),
        sa.Column("max_pages", sa.Integer(), nullable=True),
        sa.Column("max_records", sa.Integer(), nullable=True),
        sa.Column("records_path", sa.String(), nullable=True),
        sa.Column("cursor_path", sa.String(), nullable=True),
        sa.Column("field_map", sa.Text(), nullable=True),
        sa.Column("rate_per_min", sa.Integer(), nullable=False),
        sa.Column("output_mode", sa.String(), nullable=False),
        sa.Column("output_format", sa.String(), nullable=False),
        sa.Column("dataset_slug", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("records_written", sa.Integer(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("result_dataset", sa.String(), nullable=True),
        sa.Column("run_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_harvest_jobs_user_id", "harvest_jobs", ["user_id"])
    op.create_index("ix_harvest_jobs_status", "harvest_jobs", ["status"])
    op.create_index("ix_harvest_jobs_created_at", "harvest_jobs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_harvest_jobs_created_at", table_name="harvest_jobs")
    op.drop_index("ix_harvest_jobs_status", table_name="harvest_jobs")
    op.drop_index("ix_harvest_jobs_user_id", table_name="harvest_jobs")
    op.drop_table("harvest_jobs")
