"""team collab: channels, messages, files, co-owner migration

Revision ID: 058_team_collab
Revises: 057_support_and_reports
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "058_team_collab"
down_revision: Union[str, None] = "057_support_and_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "team_channels",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("team_id", sa.String(), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("name", sa.String(), server_default="umum", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_team_channels_team_id", "team_channels", ["team_id"])

    op.create_table(
        "team_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("channel_id", sa.String(), sa.ForeignKey("team_channels.id"), nullable=False),
        sa.Column("author_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_team_messages_channel_id", "team_messages", ["channel_id"])

    op.create_table(
        "team_files",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("team_id", sa.String(), sa.ForeignKey("teams.id"), nullable=False),
        sa.Column("channel_id", sa.String(), sa.ForeignKey("team_channels.id"), nullable=True),
        sa.Column("message_id", sa.Integer(), sa.ForeignKey("team_messages.id"), nullable=True),
        sa.Column("uploader_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("storage_key", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_team_files_team_id", "team_files", ["team_id"])

    op.execute(sa.text("UPDATE team_members SET role = 'co-owner' WHERE role = 'admin'"))


def downgrade() -> None:
    op.execute(sa.text("UPDATE team_members SET role = 'admin' WHERE role = 'co-owner'"))
    op.drop_index("ix_team_files_team_id", table_name="team_files")
    op.drop_table("team_files")
    op.drop_index("ix_team_messages_channel_id", table_name="team_messages")
    op.drop_table("team_messages")
    op.drop_index("ix_team_channels_team_id", table_name="team_channels")
    op.drop_table("team_channels")
