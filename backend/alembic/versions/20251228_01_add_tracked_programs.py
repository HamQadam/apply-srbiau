"""add tracked_programs table

Revision ID: 20251228_01
Revises: 20251227_00
Create Date: 2025-12-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20251228_01"
down_revision = "20251227_00"  # Now depends on initial schema
branch_labels = None
depends_on = None


def upgrade() -> None:
    status_enum = sa.Enum(
        "researching",
        "preparing",
        "submitted",
        "interview",
        "accepted",
        "rejected",
        "waitlisted",
        name="trackedprogramstatus",
    )
    priority_enum = sa.Enum("reach", "target", "safety", name="trackedprogrampriority")

    bind = op.get_bind()
    status_enum.create(bind, checkfirst=True)
    priority_enum.create(bind, checkfirst=True)

    op.create_table(
        "tracked_programs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("course_id", sa.Integer(), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("custom_program_name", sa.String(length=300), nullable=True),
        sa.Column("university_name", sa.String(length=200), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column(
            "status",
            status_enum,
            nullable=False,
            server_default="researching",
        ),
        sa.Column("submitted_date", sa.Date(), nullable=True),
        sa.Column("result_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.String(length=4000), nullable=True),
        sa.Column(
            "priority",
            priority_enum,
            nullable=False,
            server_default="target",
        ),
        sa.Column("documents_checklist", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    op.create_index("ix_tracked_programs_user_id", "tracked_programs", ["user_id"])
    op.create_index("ix_tracked_programs_course_id", "tracked_programs", ["course_id"])
    op.create_index("ix_tracked_programs_university_name", "tracked_programs", ["university_name"])
    op.create_index("ix_tracked_programs_country", "tracked_programs", ["country"])
    op.create_index("ix_tracked_programs_status", "tracked_programs", ["status"])
    op.create_index("ix_tracked_programs_priority", "tracked_programs", ["priority"])


def downgrade() -> None:
    op.drop_index("ix_tracked_programs_priority", table_name="tracked_programs")
    op.drop_index("ix_tracked_programs_status", table_name="tracked_programs")
    op.drop_index("ix_tracked_programs_country", table_name="tracked_programs")
    op.drop_index("ix_tracked_programs_university_name", table_name="tracked_programs")
    op.drop_index("ix_tracked_programs_course_id", table_name="tracked_programs")
    op.drop_index("ix_tracked_programs_user_id", table_name="tracked_programs")
    op.drop_table("tracked_programs")

    bind = op.get_bind()
    sa.Enum(name="trackedprogramstatus").drop(bind, checkfirst=True)
    sa.Enum(name="trackedprogrampriority").drop(bind, checkfirst=True)
