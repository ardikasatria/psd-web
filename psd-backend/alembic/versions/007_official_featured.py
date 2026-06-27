"""official featured announcements

Revision ID: 007_official_featured
Revises: 006_onboarding_fields
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_official_featured"
down_revision: Union[str, None] = "006_onboarding_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_official", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("repos", sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_repos_featured", "repos", ["featured"])
    op.add_column("competitions", sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_competitions_featured", "competitions", ["featured"])
    op.add_column("events", sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_events_featured", "events", ["featured"])
    op.create_table(
        "announcements",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body_md", sa.String(), nullable=False, server_default=""),
        sa.Column("level", sa.String(), nullable=False, server_default="info"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("announcements")
    op.drop_index("ix_events_featured", table_name="events")
    op.drop_column("events", "featured")
    op.drop_index("ix_competitions_featured", table_name="competitions")
    op.drop_column("competitions", "featured")
    op.drop_index("ix_repos_featured", table_name="repos")
    op.drop_column("repos", "featured")
    op.drop_column("users", "is_official")
