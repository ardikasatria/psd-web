"""competition proposals and proposer

Revision ID: 037_competition_proposals
Revises: 036_learning_path_items
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "037_competition_proposals"
down_revision: Union[str, None] = "036_learning_path_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("competitions", sa.Column("proposer_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_competitions_proposer_id"), "competitions", ["proposer_id"], unique=False)
    op.create_foreign_key(
        "fk_competitions_proposer_id_users",
        "competitions",
        "users",
        ["proposer_id"],
        ["id"],
    )

    op.create_table(
        "competition_proposals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("proposed_slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("sponsor", sa.String(), nullable=True),
        sa.Column("metric", sa.String(), nullable=False),
        sa.Column("prize_pool", sa.String(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("overview_md", sa.String(), nullable=False),
        sa.Column("rules_md", sa.String(), nullable=False),
        sa.Column("dataset_info_md", sa.String(), nullable=False),
        sa.Column("daily_submission_limit", sa.Integer(), nullable=False),
        sa.Column("category_id", sa.String(), nullable=True),
        sa.Column("subcategory_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("review_note", sa.String(), nullable=True),
        sa.Column("competition_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["subcategory_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_competition_proposals_proposed_slug"), "competition_proposals", ["proposed_slug"], unique=False)
    op.create_index(op.f("ix_competition_proposals_status"), "competition_proposals", ["status"], unique=False)
    op.create_index(op.f("ix_competition_proposals_user_id"), "competition_proposals", ["user_id"], unique=False)
    op.create_index(op.f("ix_competition_proposals_competition_id"), "competition_proposals", ["competition_id"], unique=False)


def downgrade() -> None:
    op.drop_table("competition_proposals")
    op.drop_constraint("fk_competitions_proposer_id_users", "competitions", type_="foreignkey")
    op.drop_index(op.f("ix_competitions_proposer_id"), table_name="competitions")
    op.drop_column("competitions", "proposer_id")
