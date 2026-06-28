"""Superset embed — rls_id tim + kolom dashboard (Langkah 53)

Revision ID: 045_superset
Revises: 044_gitea
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "045_superset"
down_revision: Union[str, None] = "044_gitea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("rls_id", sa.Integer(), nullable=True))
    conn = op.get_bind()
    rows = conn.execute(sa.text("SELECT id FROM teams ORDER BY created_at")).fetchall()
    for i, (tid,) in enumerate(rows, start=1):
        conn.execute(sa.text("UPDATE teams SET rls_id = :n WHERE id = :id"), {"n": i, "id": tid})
    op.alter_column("teams", "rls_id", nullable=False)
    op.create_index(op.f("ix_teams_rls_id"), "teams", ["rls_id"], unique=True)

    op.add_column("dashboards", sa.Column("superset_dataset_id", sa.Integer(), nullable=True))
    op.add_column("dashboards", sa.Column("superset_dashboard_id", sa.Integer(), nullable=True))
    op.add_column("dashboards", sa.Column("superset_embed_uuid", sa.String(), nullable=True))
    op.add_column("dashboards", sa.Column("superset_gold_table", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("dashboards", "superset_gold_table")
    op.drop_column("dashboards", "superset_embed_uuid")
    op.drop_column("dashboards", "superset_dashboard_id")
    op.drop_column("dashboards", "superset_dataset_id")
    op.drop_index(op.f("ix_teams_rls_id"), table_name="teams")
    op.drop_column("teams", "rls_id")
