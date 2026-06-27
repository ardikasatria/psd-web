"""synthesis jobs

Revision ID: 030_synthesis_jobs
Revises: 029_repo_notebook_team_id
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "030_synthesis_jobs"
down_revision: Union[str, None] = "029_repo_notebook_team_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "synthesis_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("prompt", sa.String(), nullable=True),
        sa.Column("spec", sa.JSON(), nullable=True),
        sa.Column("n_rows", sa.Integer(), nullable=False),
        sa.Column("used_llm", sa.Boolean(), nullable=False),
        sa.Column("tokens_in", sa.Integer(), nullable=False),
        sa.Column("tokens_out", sa.Integer(), nullable=False),
        sa.Column("result_url", sa.String(), nullable=True),
        sa.Column("preview", sa.JSON(), nullable=True),
        sa.Column("dataset_slug", sa.String(), nullable=True),
        sa.Column("error", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_synthesis_jobs_user_id"), "synthesis_jobs", ["user_id"], unique=False)
    op.create_index(op.f("ix_synthesis_jobs_team_id"), "synthesis_jobs", ["team_id"], unique=False)
    op.create_index(op.f("ix_synthesis_jobs_created_at"), "synthesis_jobs", ["created_at"], unique=False)

    op.add_column("repos", sa.Column("synthetic", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("repos", sa.Column("generation_spec", sa.JSON(), nullable=True))
    op.create_index(op.f("ix_repos_synthetic"), "repos", ["synthetic"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_repos_synthetic"), table_name="repos")
    op.drop_column("repos", "generation_spec")
    op.drop_column("repos", "synthetic")
    op.drop_index(op.f("ix_synthesis_jobs_created_at"), table_name="synthesis_jobs")
    op.drop_index(op.f("ix_synthesis_jobs_team_id"), table_name="synthesis_jobs")
    op.drop_index(op.f("ix_synthesis_jobs_user_id"), table_name="synthesis_jobs")
    op.drop_table("synthesis_jobs")
