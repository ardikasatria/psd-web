"""Migrasi features_json registry (Langkah 55 scaffold)

Revision ID: 048_mlops_features
Revises: 047_mlops
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "048_mlops_features"
down_revision: Union[str, None] = "047_mlops"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("model_registries", sa.Column("features_json", sa.JSON(), nullable=True))
    op.drop_column("model_registries", "baseline_stats")


def downgrade() -> None:
    op.add_column("model_registries", sa.Column("baseline_stats", sa.JSON(), nullable=True))
    op.drop_column("model_registries", "features_json")
