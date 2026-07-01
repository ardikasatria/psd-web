"""repo trash: soft delete dengan retensi 30 hari

Revision ID: 059_repo_trash
Revises: 058_team_collab
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "059_repo_trash"
down_revision: Union[str, None] = "058_team_collab"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("repos", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("repos", sa.Column("deleted_by_id", sa.String(), nullable=True))
    op.create_foreign_key("fk_repos_deleted_by", "repos", "users", ["deleted_by_id"], ["id"])
    op.create_index("ix_repos_deleted_at", "repos", ["deleted_at"])


def downgrade() -> None:
    op.drop_index("ix_repos_deleted_at", table_name="repos")
    op.drop_constraint("fk_repos_deleted_by", "repos", type_="foreignkey")
    op.drop_column("repos", "deleted_by_id")
    op.drop_column("repos", "deleted_at")
