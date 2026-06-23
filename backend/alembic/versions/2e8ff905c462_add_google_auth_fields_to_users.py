"""add google auth fields to users

Revision ID: 2e8ff905c462
Revises: 20251229_01
Create Date: 2026-01-05

This migration also repairs older development databases whose initial
migration created the pre-phone-login users/tracker schema.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "2e8ff905c462"
down_revision: Union[str, None] = "20251229_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(table_name)}


def _indexes(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {index["name"] for index in inspector.get_indexes(table_name)}


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in _columns(table_name):
        op.add_column(table_name, column)


def _create_index_if_missing(table_name: str, index_name: str, columns: list[str], *, unique: bool = False) -> None:
    if index_name not in _indexes(table_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def _drop_not_null_if_column_exists(table_name: str, column_name: str, existing_type: sa.types.TypeEngine) -> None:
    if column_name in _columns(table_name):
        op.alter_column(table_name, column_name, existing_type=existing_type, nullable=True)


def _postgres_enum_exists(enum_name: str) -> bool:
    bind = op.get_bind()
    return bool(
        bind.execute(
            sa.text("SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = :name)"),
            {"name": enum_name},
        ).scalar()
    )


def _add_postgres_enum_values(enum_name: str, values: list[str]) -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql" or not _postgres_enum_exists(enum_name):
        return
    for value in values:
        escaped = value.replace("'", "''")
        op.execute(sa.text(f"ALTER TYPE {enum_name} ADD VALUE IF NOT EXISTS '{escaped}'"))


def _repair_enum_values() -> None:
    _add_postgres_enum_values("onboardingstep", ["SIGNED_UP", "GOAL_SELECTED", "FIRST_PROGRAM_ADDED", "PROFILE_STARTED", "PROFILE_COMPLETED", "COMPLETED"])
    _add_postgres_enum_values("trackedprogramstatus", ["RESEARCHING", "PREPARING", "SUBMITTED", "UNDER_REVIEW", "INTERVIEW", "WAITLISTED", "ACCEPTED", "REJECTED", "WITHDRAWN", "DEFERRED"])
    _add_postgres_enum_values("trackedprogrampriority", ["DREAM", "TARGET", "SAFETY"])
    _add_postgres_enum_values("transactiontype", ["SIGNUP_BONUS", "ONBOARDING_BONUS", "FIRST_PROGRAM_BONUS", "PROFILE_CREATED", "PROFILE_COMPLETED", "DOCUMENT_UPLOADED", "APPLICATION_SHARED", "RESULT_SHARED", "PROFILE_VIEWED", "VERIFICATION_REWARD", "REFERRAL_BONUS", "PROFILE_VIEW_COST", "DOCUMENT_DOWNLOAD", "ADMIN_ADJUSTMENT", "WITHDRAWAL"])
    _add_postgres_enum_values("degreelevel", ["BACHELOR", "MASTER", "PHD", "DIPLOMA", "CERTIFICATE"])
    _add_postgres_enum_values("teachinglanguage", ["ENGLISH", "GERMAN", "FRENCH", "DUTCH", "SPANISH", "ITALIAN", "SWEDISH", "NORWEGIAN", "DANISH", "FINNISH", "POLISH", "CZECH", "JAPANESE", "CHINESE", "KOREAN", "OTHER"])
    _add_postgres_enum_values("currency", ["EUR", "USD", "CAD", "AUD", "GBP", "CHF", "SEK", "NOK", "DKK", "JPY", "CNY"])


def _repair_users_table(auth_provider_enum: postgresql.ENUM) -> None:
    user_goal_enum = postgresql.ENUM("APPLYING", "APPLIED", "BROWSING", name="usergoal", create_type=False)
    user_goal_enum.create(op.get_bind(), checkfirst=True)

    _add_column_if_missing("users", sa.Column("phone", sa.String(length=20), nullable=True))
    _add_column_if_missing("users", sa.Column("display_name", sa.String(length=100), nullable=True))
    _add_column_if_missing("users", sa.Column("origin_country", sa.String(length=100), nullable=True))
    _add_column_if_missing("users", sa.Column("origin_university", sa.String(length=200), nullable=True))
    _add_column_if_missing("users", sa.Column("field_of_study", sa.String(length=200), nullable=True))
    _add_column_if_missing("users", sa.Column("graduation_year", sa.Integer(), nullable=True))
    _add_column_if_missing("users", sa.Column("goal", user_goal_enum, nullable=True))
    _add_column_if_missing("users", sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default="false"))
    _add_column_if_missing("users", sa.Column("email_notifications", sa.Boolean(), nullable=False, server_default="true"))
    _add_column_if_missing("users", sa.Column("deadline_reminders", sa.Boolean(), nullable=False, server_default="true"))
    _add_column_if_missing("users", sa.Column("auth_provider", auth_provider_enum, nullable=True))
    _add_column_if_missing("users", sa.Column("google_sub", sa.String(length=50), nullable=True))
    _add_column_if_missing("users", sa.Column("picture_url", sa.String(length=500), nullable=True))
    _add_column_if_missing("users", sa.Column("email_verified", sa.Boolean(), nullable=True))

    _drop_not_null_if_column_exists("users", "phone", sa.VARCHAR(length=20))
    _drop_not_null_if_column_exists("users", "email", sa.VARCHAR(length=255))

    _create_index_if_missing("users", "ix_users_phone", ["phone"], unique=True)
    _create_index_if_missing("users", "ix_users_google_sub", ["google_sub"], unique=True)


def _repair_tracked_programs_table() -> None:
    intake_enum = postgresql.ENUM("FALL_2025", "SPRING_2026", "FALL_2026", "SPRING_2027", "FALL_2027", name="intakeperiod", create_type=False)
    intake_enum.create(op.get_bind(), checkfirst=True)

    _add_column_if_missing("tracked_programs", sa.Column("custom_university_name", sa.String(length=200), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("custom_country", sa.String(length=100), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("custom_deadline", sa.Date(), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("intake", intake_enum, nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("interview_date", sa.Date(), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("document_checklist", postgresql.JSON(), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("application_portal_url", sa.String(length=500), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("application_id", sa.String(length=100), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("scholarship_offered", sa.Boolean(), nullable=False, server_default="false"))
    _add_column_if_missing("tracked_programs", sa.Column("scholarship_amount", sa.Integer(), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("scholarship_notes", sa.String(length=500), nullable=True))
    _add_column_if_missing("tracked_programs", sa.Column("shared_as_experience", sa.Boolean(), nullable=False, server_default="false"))

    if "university_name" in _columns("tracked_programs"):
        _drop_not_null_if_column_exists("tracked_programs", "university_name", sa.String(length=200))
    if "country" in _columns("tracked_programs"):
        _drop_not_null_if_column_exists("tracked_programs", "country", sa.String(length=100))


def upgrade() -> None:
    bind = op.get_bind()
    auth_provider_enum = postgresql.ENUM("PHONE", "GOOGLE", name="authprovider", create_type=False)
    auth_provider_enum.create(bind, checkfirst=True)

    _repair_enum_values()
    _repair_users_table(auth_provider_enum)
    _repair_tracked_programs_table()


def downgrade() -> None:
    bind = op.get_bind()
    auth_provider_enum = postgresql.ENUM("PHONE", "GOOGLE", name="authprovider", create_type=False)

    if "ix_users_google_sub" in _indexes("users"):
        op.drop_index("ix_users_google_sub", table_name="users")

    columns = _columns("users")
    for column_name in ["email_verified", "picture_url", "google_sub", "auth_provider"]:
        if column_name in columns:
            op.drop_column("users", column_name)

    auth_provider_enum.drop(bind, checkfirst=True)
