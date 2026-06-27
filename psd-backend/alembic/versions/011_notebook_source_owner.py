"""notebook source and owner

Revision ID: 011_notebook_source_owner
Revises: 010_event_registration_attended
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_notebook_source_owner"
down_revision: Union[str, None] = "010_event_registration_attended"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DELETE FROM notebooks")
    op.drop_column("notebooks", "owner_username")
    op.drop_column("notebooks", "owner_avatar_url")
    op.drop_column("notebooks", "status")
    op.drop_column("notebooks", "updated_at")
    op.add_column("notebooks", sa.Column("owner_id", sa.String(), nullable=False))
    op.add_column("notebooks", sa.Column("source_url", sa.String(), nullable=True))
    op.add_column(
        "notebooks",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(op.f("ix_notebooks_owner_id"), "notebooks", ["owner_id"], unique=False)
    op.create_foreign_key("fk_notebooks_owner_id_users", "notebooks", "users", ["owner_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_notebooks_owner_id_users", "notebooks", type_="foreignkey")
    op.drop_index(op.f("ix_notebooks_owner_id"), table_name="notebooks")
    op.drop_column("notebooks", "created_at")
    op.drop_column("notebooks", "source_url")
    op.drop_column("notebooks", "owner_id")
    op.add_column("notebooks", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
    op.add_column("notebooks", sa.Column("status", sa.String(), nullable=False, server_default="stub"))
    op.add_column("notebooks", sa.Column("owner_avatar_url", sa.String(), nullable=True))
    op.add_column("notebooks", sa.Column("owner_username", sa.String(), nullable=False, server_default="psd"))
