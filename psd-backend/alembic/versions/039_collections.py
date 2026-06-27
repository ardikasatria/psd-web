"""collections table

Revision ID: 039_collections
Revises: 038_event_proposals
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "039_collections"
down_revision: Union[str, None] = "038_event_proposals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "collections",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description_md", sa.String(), nullable=False),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("category_id", sa.String(), nullable=True),
        sa.Column("is_featured", sa.Boolean(), nullable=False),
        sa.Column("items", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_collections_category_id"), "collections", ["category_id"], unique=False)
    op.create_index(op.f("ix_collections_is_featured"), "collections", ["is_featured"], unique=False)
    op.create_index(op.f("ix_collections_slug"), "collections", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_collections_slug"), table_name="collections")
    op.drop_index(op.f("ix_collections_is_featured"), table_name="collections")
    op.drop_index(op.f("ix_collections_category_id"), table_name="collections")
    op.drop_table("collections")
