"""Add recommendation snapshot fields to tracked programs

Revision ID: 20260624_02
Revises: 20260624_01
Create Date: 2026-06-24 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260624_02"
down_revision = "20260624_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tracked_programs", sa.Column("match_reasons", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("tracked_programs", sa.Column("match_warnings", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("tracked_programs", sa.Column("matching_profile_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("tracked_programs", sa.Column("recommendation_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("tracked_programs", "recommendation_snapshot")
    op.drop_column("tracked_programs", "matching_profile_snapshot")
    op.drop_column("tracked_programs", "match_warnings")
    op.drop_column("tracked_programs", "match_reasons")
