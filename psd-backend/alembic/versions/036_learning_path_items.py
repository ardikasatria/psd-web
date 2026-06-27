"""learning path curated items

Revision ID: 036_learning_path_items
Revises: 035_room_provenance_challenge
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "036_learning_path_items"
down_revision: Union[str, None] = "035_room_provenance_challenge"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "learning_paths",
        sa.Column("items", sa.JSON(), nullable=False, server_default="[]"),
    )


def downgrade() -> None:
    op.drop_column("learning_paths", "items")
