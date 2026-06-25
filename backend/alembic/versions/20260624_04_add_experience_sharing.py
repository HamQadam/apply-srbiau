"""Add experience sharing moderation fields

Revision ID: 20260624_04
Revises: 20260624_03
Create Date: 2026-06-24 03:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260624_04"
down_revision = "20260624_03"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in _columns(table_name):
        op.add_column(table_name, column)


def _indexes(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _create_index_if_missing(table_name: str, index_name: str, columns: list[str]) -> None:
    if index_name not in _indexes(table_name):
        op.create_index(index_name, table_name, columns)


def upgrade() -> None:
    visibility_enum = postgresql.ENUM("PRIVATE", "ANONYMIZED", "PUBLIC", name="experiencevisibility", create_type=False)
    moderation_enum = postgresql.ENUM("DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "HIDDEN", name="experiencemoderationstatus", create_type=False)
    visibility_enum.create(op.get_bind(), checkfirst=True)
    moderation_enum.create(op.get_bind(), checkfirst=True)

    _add_column_if_missing("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))

    _add_column_if_missing("applications", sa.Column("course_id", sa.Integer(), sa.ForeignKey("courses.id"), nullable=True))
    _add_column_if_missing("applications", sa.Column("advice_for_applicants", sa.String(length=2000), nullable=True))
    _add_column_if_missing("applications", sa.Column("timeline_notes", sa.String(length=2000), nullable=True))
    _add_column_if_missing("applications", sa.Column("visibility", visibility_enum, nullable=False, server_default="ANONYMIZED"))
    _add_column_if_missing("applications", sa.Column("moderation_status", moderation_enum, nullable=False, server_default="DRAFT"))
    _add_column_if_missing("applications", sa.Column("pii_warning_accepted", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add_column_if_missing("applications", sa.Column("source_tracked_program_id", sa.Integer(), sa.ForeignKey("tracked_programs.id"), nullable=True))
    _add_column_if_missing("applications", sa.Column("submitted_for_review_at", sa.DateTime(), nullable=True))
    _add_column_if_missing("applications", sa.Column("reviewed_at", sa.DateTime(), nullable=True))
    _add_column_if_missing("applications", sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    _add_column_if_missing("applications", sa.Column("moderation_notes", sa.String(length=1000), nullable=True))

    _add_column_if_missing("tracked_programs", sa.Column("shared_experience_id", sa.Integer(), sa.ForeignKey("applications.id"), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("shared_at", sa.DateTime(), nullable=True))

    columns = _columns("applications")
    if "course_id" in columns:
        _create_index_if_missing("applications", "ix_applications_course_id", ["course_id"])
    if "source_tracked_program_id" in columns:
        _create_index_if_missing("applications", "ix_applications_source_tracked_program_id", ["source_tracked_program_id"])


def downgrade() -> None:
    for index_name in ["ix_applications_source_tracked_program_id", "ix_applications_course_id"]:
        try:
            op.drop_index(index_name, table_name="applications")
        except Exception:
            pass

    for column_name in ["shared_at", "shared_experience_id"]:
        if column_name in _columns("tracked_programs"):
            op.drop_column("tracked_programs", column_name)

    for column_name in [
        "moderation_notes",
        "reviewer_id",
        "reviewed_at",
        "submitted_for_review_at",
        "source_tracked_program_id",
        "pii_warning_accepted",
        "moderation_status",
        "visibility",
        "timeline_notes",
        "advice_for_applicants",
        "course_id",
    ]:
        if column_name in _columns("applications"):
            op.drop_column("applications", column_name)
