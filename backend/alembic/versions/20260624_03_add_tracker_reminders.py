"""Add tracker reminder fields

Revision ID: 20260624_03
Revises: 20260624_02
Create Date: 2026-06-24 02:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260624_03"
down_revision = "20260624_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tracked_programs", sa.Column("reminders_enabled", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("tracked_programs", sa.Column("reminder_offsets_days", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("tracked_programs", sa.Column("next_reminder_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("tracked_programs", "next_reminder_at")
    op.drop_column("tracked_programs", "reminder_offsets_days")
    op.drop_column("tracked_programs", "reminders_enabled")
