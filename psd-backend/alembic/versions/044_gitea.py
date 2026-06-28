"""gitea repo fields

Revision ID: 044_gitea
Revises: 043_oauth
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "044_gitea"
down_revision: Union[str, None] = "043_oauth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("repos", sa.Column("gitea_repo_id", sa.Integer(), nullable=True))
    op.add_column("repos", sa.Column("clone_url", sa.String(), nullable=True))
    op.add_column("repos", sa.Column("gitea_owner", sa.String(), nullable=True))
    op.add_column("repos", sa.Column("gitea_name", sa.String(), nullable=True))
    op.add_column(
        "repos",
        sa.Column("source_of_truth", sa.String(), nullable=False, server_default="psd"),
    )
    op.create_index(op.f("ix_repos_gitea_repo_id"), "repos", ["gitea_repo_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_repos_gitea_repo_id"), table_name="repos")
    op.drop_column("repos", "source_of_truth")
    op.drop_column("repos", "gitea_name")
    op.drop_column("repos", "gitea_owner")
    op.drop_column("repos", "clone_url")
    op.drop_column("repos", "gitea_repo_id")
