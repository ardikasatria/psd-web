"""competition enhance: admin review, notebooks, deadline fields

Revision ID: 054_competition_enhance
Revises: 053_liked_visibility
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "054_competition_enhance"
down_revision: Union[str, None] = "053_liked_visibility"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("competitions", sa.Column("max_score", sa.Float(), nullable=True))
    op.add_column(
        "competitions",
        sa.Column("higher_is_better", sa.Boolean(), nullable=True),
    )

    op.add_column("submissions", sa.Column("team_id", sa.String(), nullable=True))
    op.add_column("submissions", sa.Column("notebook_id", sa.String(), nullable=True))
    op.add_column("submissions", sa.Column("note", sa.Text(), nullable=True))
    op.add_column("submissions", sa.Column("review_note", sa.Text(), nullable=True))
    op.add_column("submissions", sa.Column("reviewed_by", sa.String(), nullable=True))
    op.add_column("submissions", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_submissions_team_id", "submissions", ["team_id"])
    op.create_foreign_key("fk_submissions_team_id", "submissions", "teams", ["team_id"], ["id"])
    op.create_foreign_key("fk_submissions_reviewed_by", "submissions", "users", ["reviewed_by"], ["id"])

    op.create_table(
        "competition_notebooks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("competition_id", sa.String(), sa.ForeignKey("competitions.id"), nullable=False, index=True),
        sa.Column("notebook_id", sa.String(), nullable=False, index=True),
        sa.Column("owner_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("favorite_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_public", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "competition_notebook_favorites",
        sa.Column("competition_notebook_id", sa.String(), sa.ForeignKey("competition_notebooks.id"), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("competition_notebook_favorites")
    op.drop_table("competition_notebooks")
    op.drop_constraint("fk_submissions_reviewed_by", "submissions", type_="foreignkey")
    op.drop_constraint("fk_submissions_team_id", "submissions", type_="foreignkey")
    op.drop_index("ix_submissions_team_id", table_name="submissions")
    op.drop_column("submissions", "reviewed_at")
    op.drop_column("submissions", "reviewed_by")
    op.drop_column("submissions", "review_note")
    op.drop_column("submissions", "note")
    op.drop_column("submissions", "notebook_id")
    op.drop_column("submissions", "team_id")
    op.drop_column("competitions", "higher_is_better")
    op.drop_column("competitions", "max_score")
