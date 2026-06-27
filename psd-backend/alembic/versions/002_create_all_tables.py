"""create all tables

Revision ID: 002_create_all
Revises: 001_create_users
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_create_all"
down_revision: Union[str, None] = "001_create_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "repos",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("likes", sa.Integer(), nullable=False),
        sa.Column("downloads", sa.Integer(), nullable=False),
        sa.Column("visibility", sa.String(), nullable=False),
        sa.Column("readme_md", sa.String(), nullable=False),
        sa.Column("license", sa.String(), nullable=True),
        sa.Column("files", sa.JSON(), nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_repos_kind"), "repos", ["kind"], unique=False)
    op.create_index(op.f("ix_repos_owner_id"), "repos", ["owner_id"], unique=False)
    op.create_index(op.f("ix_repos_slug"), "repos", ["slug"], unique=True)

    op.create_table(
        "competitions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("sponsor", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("metric", sa.String(), nullable=False),
        sa.Column("participants", sa.Integer(), nullable=False),
        sa.Column("prize_pool", sa.String(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("overview_md", sa.String(), nullable=False),
        sa.Column("rules_md", sa.String(), nullable=False),
        sa.Column("dataset_info_md", sa.String(), nullable=False),
        sa.Column("prizes", sa.JSON(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_competitions_slug"), "competitions", ["slug"], unique=True)
    op.create_index(op.f("ix_competitions_status"), "competitions", ["status"], unique=False)

    op.create_table(
        "leaderboard_rows",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("competition_id", sa.String(), nullable=False),
        sa.Column("board", sa.String(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("participant_username", sa.String(), nullable=False),
        sa.Column("participant_avatar_url", sa.String(), nullable=True),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_leaderboard_rows_competition_id"), "leaderboard_rows", ["competition_id"], unique=False)

    op.create_table(
        "submissions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("competition_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("public_score", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_submissions_competition_id"), "submissions", ["competition_id"], unique=False)
    op.create_index(op.f("ix_submissions_user_id"), "submissions", ["user_id"], unique=False)

    op.create_table(
        "events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("mode", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("description_md", sa.String(), nullable=False),
        sa.Column("agenda", sa.JSON(), nullable=False),
        sa.Column("speakers", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_events_slug"), "events", ["slug"], unique=True)
    op.create_index(op.f("ix_events_status"), "events", ["status"], unique=False)

    op.create_table(
        "event_registrations",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_event_registrations_event_id"), "event_registrations", ["event_id"], unique=False)
    op.create_index(op.f("ix_event_registrations_user_id"), "event_registrations", ["user_id"], unique=False)

    op.create_table(
        "threads",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("body_md", sa.String(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "posts",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("thread_id", sa.String(), nullable=False),
        sa.Column("author_id", sa.String(), nullable=False),
        sa.Column("body_md", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_posts_thread_id"), "posts", ["thread_id"], unique=False)

    op.create_table(
        "courses",
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("level", sa.String(), nullable=False),
        sa.Column("cover_url", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("modules", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("slug"),
    )

    op.create_table(
        "learning_paths",
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("course_slugs", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("slug"),
    )

    op.create_table(
        "notebooks",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("owner_username", sa.String(), nullable=False),
        sa.Column("owner_avatar_url", sa.String(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("notebooks")
    op.drop_table("learning_paths")
    op.drop_table("courses")
    op.drop_index(op.f("ix_posts_thread_id"), table_name="posts")
    op.drop_table("posts")
    op.drop_table("threads")
    op.drop_index(op.f("ix_event_registrations_user_id"), table_name="event_registrations")
    op.drop_index(op.f("ix_event_registrations_event_id"), table_name="event_registrations")
    op.drop_table("event_registrations")
    op.drop_index(op.f("ix_events_status"), table_name="events")
    op.drop_index(op.f("ix_events_slug"), table_name="events")
    op.drop_table("events")
    op.drop_index(op.f("ix_submissions_user_id"), table_name="submissions")
    op.drop_index(op.f("ix_submissions_competition_id"), table_name="submissions")
    op.drop_table("submissions")
    op.drop_index(op.f("ix_leaderboard_rows_competition_id"), table_name="leaderboard_rows")
    op.drop_table("leaderboard_rows")
    op.drop_index(op.f("ix_competitions_status"), table_name="competitions")
    op.drop_index(op.f("ix_competitions_slug"), table_name="competitions")
    op.drop_table("competitions")
    op.drop_index(op.f("ix_repos_slug"), table_name="repos")
    op.drop_index(op.f("ix_repos_owner_id"), table_name="repos")
    op.drop_index(op.f("ix_repos_kind"), table_name="repos")
    op.drop_table("repos")
