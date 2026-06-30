"""support tickets and content reports

Revision ID: 057_support_and_reports
Revises: 056_nested_comments_replies
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "057_support_and_reports"
down_revision: Union[str, None] = "056_nested_comments_replies"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "support_tickets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("priority", sa.String(), server_default="sedang", nullable=False),
        sa.Column("subject", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), server_default="open", nullable=False),
        sa.Column("assignee_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_support_tickets_user_id", "support_tickets", ["user_id"])
    op.create_index("ix_support_tickets_status", "support_tickets", ["status"])

    op.create_table(
        "ticket_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ticket_id", sa.String(), sa.ForeignKey("support_tickets.id"), nullable=False),
        sa.Column("author_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_staff", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_ticket_messages_ticket_id", "ticket_messages", ["ticket_id"])

    op.create_table(
        "content_reports",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("target_key", sa.String(), nullable=False, unique=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("target_id", sa.String(), nullable=False),
        sa.Column("report_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("flagged", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("status", sa.String(), server_default="pending", nullable=False),
        sa.Column("decision", sa.String(), nullable=True),
        sa.Column("reviewed_by", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_content_reports_target_key", "content_reports", ["target_key"])
    op.create_index("ix_content_reports_report_count", "content_reports", ["report_count"])
    op.create_index("ix_content_reports_flagged", "content_reports", ["flagged"])
    op.create_index("ix_content_reports_status", "content_reports", ["status"])

    op.create_table(
        "report_entries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("report_id", sa.String(), sa.ForeignKey("content_reports.id"), nullable=False),
        sa.Column("reporter_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("report_id", "reporter_id", name="uq_report_reporter"),
    )
    op.create_index("ix_report_entries_report_id", "report_entries", ["report_id"])
    op.create_index("ix_report_entries_reporter_id", "report_entries", ["reporter_id"])


def downgrade() -> None:
    op.drop_table("report_entries")
    op.drop_table("content_reports")
    op.drop_table("ticket_messages")
    op.drop_table("support_tickets")
