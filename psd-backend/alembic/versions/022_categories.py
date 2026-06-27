"""categories

Revision ID: 022_categories
Revises: 021_course_access_window
Create Date: 2026-06-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "022_categories"
down_revision: Union[str, None] = "021_course_access_window"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False, server_default=""),
        sa.Column("parent_id", sa.String(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("parent_id", "slug", name="uq_category_parent_slug"),
    )
    op.create_index(op.f("ix_categories_parent_id"), "categories", ["parent_id"], unique=False)
    op.create_index(op.f("ix_categories_slug"), "categories", ["slug"], unique=False)

    for table in ("repos", "courses", "notebooks", "competitions", "events"):
        op.add_column(table, sa.Column("category_id", sa.String(), nullable=True))
        op.add_column(table, sa.Column("subcategory_id", sa.String(), nullable=True))
        op.create_index(op.f(f"ix_{table}_category_id"), table, ["category_id"], unique=False)
        op.create_index(op.f(f"ix_{table}_subcategory_id"), table, ["subcategory_id"], unique=False)
        op.create_foreign_key(f"fk_{table}_category_id", table, "categories", ["category_id"], ["id"])
        op.create_foreign_key(f"fk_{table}_subcategory_id", table, "categories", ["subcategory_id"], ["id"])


def downgrade() -> None:
    for table in ("events", "competitions", "notebooks", "courses", "repos"):
        op.drop_constraint(f"fk_{table}_subcategory_id", table, type_="foreignkey")
        op.drop_constraint(f"fk_{table}_category_id", table, type_="foreignkey")
        op.drop_index(op.f(f"ix_{table}_subcategory_id"), table_name=table)
        op.drop_index(op.f(f"ix_{table}_category_id"), table_name=table)
        op.drop_column(table, "subcategory_id")
        op.drop_column(table, "category_id")

    op.drop_index(op.f("ix_categories_slug"), table_name="categories")
    op.drop_index(op.f("ix_categories_parent_id"), table_name="categories")
    op.drop_table("categories")
