"""repo notebook team_id

Revision ID: 029_repo_notebook_team_id
Revises: 028_teams
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "029_repo_notebook_team_id"
down_revision: Union[str, None] = "028_teams"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("repos", "notebooks"):
        op.add_column(table, sa.Column("team_id", sa.String(), nullable=True))
        op.create_index(op.f(f"ix_{table}_team_id"), table, ["team_id"], unique=False)
        op.create_foreign_key(f"fk_{table}_team_id", table, "teams", ["team_id"], ["id"])


def downgrade() -> None:
    for table in ("repos", "notebooks"):
        op.drop_constraint(f"fk_{table}_team_id", table, type_="foreignkey")
        op.drop_index(op.f(f"ix_{table}_team_id"), table_name=table)
        op.drop_column(table, "team_id")
