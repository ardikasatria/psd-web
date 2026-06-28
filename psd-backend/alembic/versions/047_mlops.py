"""Registry model MLflow & monitoring (Langkah 55)

Revision ID: 047_mlops
Revises: 046_engine
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "047_mlops"
down_revision: Union[str, None] = "046_engine"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "model_registries",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("owner_id", sa.String(), nullable=False),
        sa.Column("team_id", sa.String(), nullable=True),
        sa.Column("repo_id", sa.String(), nullable=True),
        sa.Column("competition_id", sa.String(), nullable=True),
        sa.Column("room_id", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description_md", sa.String(), nullable=False, server_default=""),
        sa.Column("mlflow_name", sa.String(), nullable=False),
        sa.Column("reference_source_id", sa.String(), nullable=True),
        sa.Column("baseline_stats", sa.JSON(), nullable=True),
        sa.Column("monitoring_dashboard_id", sa.String(), nullable=True),
        sa.Column("monitoring_gold_uri", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["repo_id"], ["repos.id"]),
        sa.ForeignKeyConstraint(["competition_id"], ["competitions.id"]),
        sa.ForeignKeyConstraint(["room_id"], ["idea_rooms.id"]),
        sa.ForeignKeyConstraint(["reference_source_id"], ["data_sources.id"]),
        sa.ForeignKeyConstraint(["monitoring_dashboard_id"], ["dashboards.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_model_registries_slug"), "model_registries", ["slug"], unique=True)
    op.create_index(op.f("ix_model_registries_mlflow_name"), "model_registries", ["mlflow_name"], unique=True)
    op.create_index(op.f("ix_model_registries_owner_id"), "model_registries", ["owner_id"], unique=False)

    op.create_table(
        "model_versions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("registry_id", sa.String(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("repo_id", sa.String(), nullable=True),
        sa.Column("submission_id", sa.String(), nullable=True),
        sa.Column("mlflow_run_id", sa.String(), nullable=True),
        sa.Column("mlflow_model_version", sa.String(), nullable=True),
        sa.Column("metrics", sa.JSON(), nullable=False),
        sa.Column("artifact_uri", sa.String(), nullable=True),
        sa.Column("stage", sa.String(), nullable=False, server_default="None"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["registry_id"], ["model_registries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["repo_id"], ["repos.id"]),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_model_versions_registry_id"), "model_versions", ["registry_id"], unique=False)

    op.create_table(
        "drift_reports",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("registry_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="queued"),
        sa.Column("reference_uri", sa.String(), nullable=True),
        sa.Column("current_uri", sa.String(), nullable=True),
        sa.Column("overall_psi", sa.Float(), nullable=True),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column("metrics_json", sa.JSON(), nullable=False),
        sa.Column("error", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["registry_id"], ["model_registries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_drift_reports_registry_id"), "drift_reports", ["registry_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_drift_reports_registry_id"), table_name="drift_reports")
    op.drop_table("drift_reports")
    op.drop_index(op.f("ix_model_versions_registry_id"), table_name="model_versions")
    op.drop_table("model_versions")
    op.drop_index(op.f("ix_model_registries_owner_id"), table_name="model_registries")
    op.drop_index(op.f("ix_model_registries_mlflow_name"), table_name="model_registries")
    op.drop_index(op.f("ix_model_registries_slug"), table_name="model_registries")
    op.drop_table("model_registries")
