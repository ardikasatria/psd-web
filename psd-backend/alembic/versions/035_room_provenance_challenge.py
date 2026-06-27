"""room provenance and challenge

Revision ID: 035_room_provenance_challenge
Revises: 034_room_cover
Create Date: 2026-06-27

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "035_room_provenance_challenge"
down_revision: Union[str, None] = "034_room_cover"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("competitions", sa.Column("room_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_competitions_room_id"), "competitions", ["room_id"], unique=False)
    op.create_foreign_key("fk_competitions_room_id", "competitions", "idea_rooms", ["room_id"], ["id"])

    op.add_column("notebooks", sa.Column("room_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_notebooks_room_id"), "notebooks", ["room_id"], unique=False)
    op.create_foreign_key("fk_notebooks_room_id", "notebooks", "idea_rooms", ["room_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_notebooks_room_id", "notebooks", type_="foreignkey")
    op.drop_index(op.f("ix_notebooks_room_id"), table_name="notebooks")
    op.drop_column("notebooks", "room_id")
    op.drop_constraint("fk_competitions_room_id", "competitions", type_="foreignkey")
    op.drop_index(op.f("ix_competitions_room_id"), table_name="competitions")
    op.drop_column("competitions", "room_id")
