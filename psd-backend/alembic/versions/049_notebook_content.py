"""Kolom content_json notebook (.ipynb) — Langkah 52B

Revision ID: 049_notebook_content
Revises: 048_mlops_features
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "049_notebook_content"
down_revision: Union[str, None] = "048_mlops_features"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("notebooks", sa.Column("content_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("notebooks", "content_json")
