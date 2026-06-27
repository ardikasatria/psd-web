"""event proposals, gallery, proposer

Revision ID: 038_event_proposals
Revises: 037_competition_proposals
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "038_event_proposals"
down_revision: Union[str, None] = "037_competition_proposals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("gallery_urls", sa.JSON(), nullable=False, server_default="[]"))
    op.add_column("events", sa.Column("proposer_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_events_proposer_id"), "events", ["proposer_id"], unique=False)
    op.create_foreign_key("fk_events_proposer_id_users", "events", "users", ["proposer_id"], ["id"])

    op.create_table(
        "event_proposals",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("proposed_slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("gallery_urls", sa.JSON(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("description_md", sa.String(), nullable=False),
        sa.Column("agenda", sa.JSON(), nullable=False),
        sa.Column("speakers", sa.JSON(), nullable=False),
        sa.Column("category_id", sa.String(), nullable=True),
        sa.Column("subcategory_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("review_note", sa.String(), nullable=True),
        sa.Column("event_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["subcategory_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_event_proposals_proposed_slug"), "event_proposals", ["proposed_slug"], unique=False)
    op.create_index(op.f("ix_event_proposals_status"), "event_proposals", ["status"], unique=False)
    op.create_index(op.f("ix_event_proposals_user_id"), "event_proposals", ["user_id"], unique=False)
    op.create_index(op.f("ix_event_proposals_event_id"), "event_proposals", ["event_id"], unique=False)


def downgrade() -> None:
    op.drop_table("event_proposals")
    op.drop_constraint("fk_events_proposer_id_users", "events", type_="foreignkey")
    op.drop_index(op.f("ix_events_proposer_id"), table_name="events")
    op.drop_column("events", "proposer_id")
    op.drop_column("events", "gallery_urls")
