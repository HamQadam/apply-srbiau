"""repair ghadam transaction context columns

Revision ID: 20260623_01
Revises: 2e8ff905c462
Create Date: 2026-06-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260623_01"
down_revision: Union[str, None] = "2e8ff905c462"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in _columns(table_name):
        op.add_column(table_name, column)


def upgrade() -> None:
    _add_column_if_missing(
        "ghadam_transactions",
        sa.Column("related_user_id", sa.Integer(), nullable=True),
    )
    _add_column_if_missing(
        "ghadam_transactions",
        sa.Column("related_entity_type", sa.String(length=50), nullable=True),
    )
    _add_column_if_missing(
        "ghadam_transactions",
        sa.Column("related_entity_id", sa.Integer(), nullable=True),
    )

    op.alter_column(
        "ghadam_transactions",
        "description",
        existing_type=sa.String(length=500),
        type_=sa.String(length=200),
        existing_nullable=True,
    )


def downgrade() -> None:
    columns = _columns("ghadam_transactions")
    for column_name in ["related_entity_id", "related_entity_type", "related_user_id"]:
        if column_name in columns:
            op.drop_column("ghadam_transactions", column_name)

    op.alter_column(
        "ghadam_transactions",
        "description",
        existing_type=sa.String(length=200),
        type_=sa.String(length=500),
        existing_nullable=True,
    )
