"""add google auth fields to users

Revision ID: 2e8ff905c462
Revises: 20251229_01
Create Date: 2026-01-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = "2e8ff905c462"
down_revision: Union[str, None] = "20251229_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("auth_provider", sa.Enum("PHONE", "GOOGLE", name="authprovider"), nullable=True))
    op.add_column("users", sa.Column("google_sub", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.add_column("users", sa.Column("picture_url", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True))
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=True))
    op.alter_column("users", "phone", existing_type=sa.VARCHAR(length=20), nullable=True)
    op.create_index(op.f("ix_users_google_sub"), "users", ["google_sub"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_google_sub"), table_name="users")
    op.alter_column("users", "phone", existing_type=sa.VARCHAR(length=20), nullable=False)
    op.drop_column("users", "email_verified")
    op.drop_column("users", "picture_url")
    op.drop_column("users", "google_sub")
    op.drop_column("users", "auth_provider")
