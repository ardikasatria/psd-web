"""pipeline trash: soft delete dengan retensi 30 hari

Revision ID: 064_pipeline_trash
Revises: 063_harvest_jobs
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "064_pipeline_trash"
down_revision: Union[str, None] = "063_harvest_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("pipelines", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("pipelines", sa.Column("deleted_by_id", sa.String(), nullable=True))
    op.create_foreign_key("fk_pipelines_deleted_by", "pipelines", "users", ["deleted_by_id"], ["id"])
    op.create_index("ix_pipelines_deleted_at", "pipelines", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_pipelines_deleted_at", table_name="pipelines")
    op.drop_constraint("fk_pipelines_deleted_by", "pipelines", type_="foreignkey")
    op.drop_column("pipelines", "deleted_by_id")
    op.drop_column("pipelines", "deleted_at")
