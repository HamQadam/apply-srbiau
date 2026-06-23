"""Add raw_crawl_items table for two-phase crawl pipeline

Revision ID: 20260624_01
Revises: 20260623_01
Create Date: 2026-06-24 00:00:00.000000

Adds a staging table that stores every raw API response from each source
before any parsing happens.  The parse pipeline then reads from this table,
attempts deterministic transformation, and promotes rows to courses/universities
or flags them for LLM-assisted parsing.

parse_status values:
  pending         - freshly crawled, not yet parsed
  parsed          - lexical rules succeeded; written to courses/universities
  needs_llm       - rules got partial/no result; queued for LLM job
  done            - LLM job completed; written to courses/universities
  failed          - unrecoverable error
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260624_01"
down_revision = "20260623_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "raw_crawl_items",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),

        # Source identity
        sa.Column("source", sa.String(50), nullable=False),       # 'daad', 'studyinnl', …
        sa.Column("source_id", sa.String(100), nullable=False),   # the source API's own id

        # The full original payload, untouched
        sa.Column("raw_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),

        # When we crawled it
        sa.Column("crawled_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),

        # Parse pipeline state
        sa.Column(
            "parse_status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        # Human/machine-readable reason for current status (e.g. missing fields list)
        sa.Column("parse_error", sa.Text(), nullable=True),
        # Which fields are still missing after lexical pass (JSON array of strings)
        sa.Column("missing_fields", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True),

        # Back-reference to the resulting course row (NULL until promoted)
        sa.Column(
            "course_id",
            sa.BigInteger(),
            sa.ForeignKey("courses.id", ondelete="SET NULL"),
            nullable=True,
        ),

        # Unique constraint: one row per (source, source_id); re-crawls UPDATE in place
        sa.UniqueConstraint("source", "source_id", name="uq_raw_crawl_source_id"),
    )

    # Indexes for the parse pipeline worker queries
    op.create_index(
        "ix_raw_crawl_parse_status",
        "raw_crawl_items",
        ["parse_status"],
    )
    op.create_index(
        "ix_raw_crawl_source",
        "raw_crawl_items",
        ["source"],
    )
    op.create_index(
        "ix_raw_crawl_crawled_at",
        "raw_crawl_items",
        ["crawled_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_raw_crawl_crawled_at", table_name="raw_crawl_items")
    op.drop_index("ix_raw_crawl_source", table_name="raw_crawl_items")
    op.drop_index("ix_raw_crawl_parse_status", table_name="raw_crawl_items")
    op.drop_table("raw_crawl_items")
