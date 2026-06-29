"""Pengajuan akses kernel notebook (mahasiswa / umum)

Revision ID: 050_notebook_kernel_requests
Revises: 049_notebook_content
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "050_notebook_kernel_requests"
down_revision: Union[str, None] = "049_notebook_content"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notebook_kernel_requests",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("applicant_type", sa.String(length=16), nullable=False),
        sa.Column("nim", sa.String(length=32), nullable=True),
        sa.Column("institution", sa.String(length=200), nullable=True),
        sa.Column("reason_md", sa.Text(), nullable=False, server_default=""),
        sa.Column("ktm_storage_key", sa.String(length=512), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="pending"),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notebook_kernel_requests_user_id", "notebook_kernel_requests", ["user_id"])
    op.create_index("ix_notebook_kernel_requests_status", "notebook_kernel_requests", ["status"])
    op.create_index("ix_notebook_kernel_requests_applicant_type", "notebook_kernel_requests", ["applicant_type"])


def downgrade() -> None:
    op.drop_index("ix_notebook_kernel_requests_applicant_type", table_name="notebook_kernel_requests")
    op.drop_index("ix_notebook_kernel_requests_status", table_name="notebook_kernel_requests")
    op.drop_index("ix_notebook_kernel_requests_user_id", table_name="notebook_kernel_requests")
    op.drop_table("notebook_kernel_requests")
