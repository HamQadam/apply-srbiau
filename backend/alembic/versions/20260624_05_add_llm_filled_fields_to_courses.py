"""Add llm_filled_fields column to courses

Revision ID: 20260624_05
Revises: 20260624_04
Create Date: 2026-06-24

Adds a JSONB column that records which course fields were filled in by the
LLM enrichment job rather than deterministic parsing.  The frontend can use
this to show a "filled by AI — please verify" notice to users.

Example value: ["field", "deadline_fall", "teaching_language"]
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260624_05"
down_revision = "20260624_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column(
            "llm_filled_fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment='JSON array of field names filled by LLM enrichment, e.g. ["field", "deadline_fall"]',
        ),
    )


def downgrade() -> None:
    op.drop_column("courses", "llm_filled_fields")
