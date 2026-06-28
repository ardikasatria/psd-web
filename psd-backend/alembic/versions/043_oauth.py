"""oauth tables

Revision ID: 043_oauth
Revises: 042_dashboards
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "043_oauth"
down_revision: Union[str, None] = "042_dashboards"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "oauth_clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("client_secret_hash", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("redirect_uris", sa.Text(), nullable=False),
        sa.Column("allowed_scopes", sa.Text(), nullable=False),
        sa.Column("is_internal", sa.Boolean(), nullable=False),
        sa.Column("is_confidential", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_oauth_clients_client_id"), "oauth_clients", ["client_id"], unique=True)

    op.create_table(
        "oauth_authorization_codes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("redirect_uri", sa.Text(), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("nonce", sa.String(length=255), nullable=True),
        sa.Column("code_challenge", sa.String(length=128), nullable=True),
        sa.Column("code_challenge_method", sa.String(length=10), nullable=True),
        sa.Column("auth_time", sa.BigInteger(), nullable=False),
        sa.Column("expires_at", sa.BigInteger(), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_oauth_authorization_codes_client_id"),
        "oauth_authorization_codes",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_oauth_authorization_codes_code"),
        "oauth_authorization_codes",
        ["code"],
        unique=True,
    )
    op.create_index(
        op.f("ix_oauth_authorization_codes_user_id"),
        "oauth_authorization_codes",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "oauth_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("access_token", sa.String(length=255), nullable=False),
        sa.Column("refresh_token", sa.String(length=255), nullable=True),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("token_type", sa.String(length=20), nullable=False),
        sa.Column("issued_at", sa.BigInteger(), nullable=False),
        sa.Column("access_token_expires_at", sa.BigInteger(), nullable=False),
        sa.Column("refresh_token_expires_at", sa.BigInteger(), nullable=True),
        sa.Column("revoked", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_oauth_tokens_access_token"),
        "oauth_tokens",
        ["access_token"],
        unique=True,
    )
    op.create_index(
        op.f("ix_oauth_tokens_client_id"),
        "oauth_tokens",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_oauth_tokens_refresh_token"),
        "oauth_tokens",
        ["refresh_token"],
        unique=True,
    )
    op.create_index(
        op.f("ix_oauth_tokens_user_id"),
        "oauth_tokens",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "oauth_consents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("scope", sa.Text(), nullable=False),
        sa.Column("granted_at", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_oauth_consents_client_id"),
        "oauth_consents",
        ["client_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_oauth_consents_user_id"),
        "oauth_consents",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_oauth_consents_user_id"), table_name="oauth_consents")
    op.drop_index(op.f("ix_oauth_consents_client_id"), table_name="oauth_consents")
    op.drop_table("oauth_consents")
    op.drop_index(op.f("ix_oauth_tokens_user_id"), table_name="oauth_tokens")
    op.drop_index(op.f("ix_oauth_tokens_refresh_token"), table_name="oauth_tokens")
    op.drop_index(op.f("ix_oauth_tokens_client_id"), table_name="oauth_tokens")
    op.drop_index(op.f("ix_oauth_tokens_access_token"), table_name="oauth_tokens")
    op.drop_table("oauth_tokens")
    op.drop_index(op.f("ix_oauth_authorization_codes_user_id"), table_name="oauth_authorization_codes")
    op.drop_index(op.f("ix_oauth_authorization_codes_code"), table_name="oauth_authorization_codes")
    op.drop_index(op.f("ix_oauth_authorization_codes_client_id"), table_name="oauth_authorization_codes")
    op.drop_table("oauth_authorization_codes")
    op.drop_index(op.f("ix_oauth_clients_client_id"), table_name="oauth_clients")
    op.drop_table("oauth_clients")
