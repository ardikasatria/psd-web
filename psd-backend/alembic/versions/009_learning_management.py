"""learning management

Revision ID: 009_learning_management
Revises: 008_competition_scoring_fields
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_learning_management"
down_revision: Union[str, None] = "008_competition_scoring_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_instructor", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("courses", sa.Column("author_id", sa.String(), nullable=True))
    op.add_column("courses", sa.Column("status", sa.String(), nullable=False, server_default="draft"))
    op.add_column("courses", sa.Column("published_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_courses_author_id"), "courses", ["author_id"], unique=False)
    op.create_index(op.f("ix_courses_status"), "courses", ["status"], unique=False)
    op.create_foreign_key("fk_courses_author_id_users", "courses", "users", ["author_id"], ["id"])

    op.create_table(
        "enrollments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("course_slug", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["course_slug"], ["courses.slug"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_slug", name="uq_enroll"),
    )
    op.create_index(op.f("ix_enrollments_course_slug"), "enrollments", ["course_slug"], unique=False)
    op.create_index(op.f("ix_enrollments_user_id"), "enrollments", ["user_id"], unique=False)

    op.create_table(
        "lesson_progress",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("course_slug", sa.String(), nullable=False),
        sa.Column("lesson_id", sa.String(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "course_slug", "lesson_id", name="uq_progress"),
    )
    op.create_index(op.f("ix_lesson_progress_course_slug"), "lesson_progress", ["course_slug"], unique=False)
    op.create_index(op.f("ix_lesson_progress_user_id"), "lesson_progress", ["user_id"], unique=False)

    op.create_table(
        "instructor_applications",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("expertise", sa.String(), nullable=False),
        sa.Column("motivation_md", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_instructor_applications_status"), "instructor_applications", ["status"], unique=False)
    op.create_index(op.f("ix_instructor_applications_user_id"), "instructor_applications", ["user_id"], unique=False)

    # Mark existing seed courses as published
    op.execute("UPDATE courses SET status = 'published', published_at = NOW() WHERE status = 'draft'")


def downgrade() -> None:
    op.drop_index(op.f("ix_instructor_applications_user_id"), table_name="instructor_applications")
    op.drop_index(op.f("ix_instructor_applications_status"), table_name="instructor_applications")
    op.drop_table("instructor_applications")
    op.drop_index(op.f("ix_lesson_progress_user_id"), table_name="lesson_progress")
    op.drop_index(op.f("ix_lesson_progress_course_slug"), table_name="lesson_progress")
    op.drop_table("lesson_progress")
    op.drop_index(op.f("ix_enrollments_user_id"), table_name="enrollments")
    op.drop_index(op.f("ix_enrollments_course_slug"), table_name="enrollments")
    op.drop_table("enrollments")
    op.drop_constraint("fk_courses_author_id_users", "courses", type_="foreignkey")
    op.drop_index(op.f("ix_courses_status"), table_name="courses")
    op.drop_index(op.f("ix_courses_author_id"), table_name="courses")
    op.drop_column("courses", "published_at")
    op.drop_column("courses", "status")
    op.drop_column("courses", "author_id")
    op.drop_column("users", "is_instructor")
