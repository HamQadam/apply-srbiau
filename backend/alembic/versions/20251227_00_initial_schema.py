"""Initial schema - create all base tables

Revision ID: 20251227_00
Revises: 
Create Date: 2025-12-27 00:00:00.000000

This migration creates all foundational tables needed before any other migrations.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20251227_00"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # =====================
    # ENUMS
    # =====================
    degree_level_enum = sa.Enum(
        "bachelor", "master", "phd", "diploma", "certificate",
        name="degreelevel"
    )
    currency_enum = sa.Enum(
        "EUR", "USD", "CAD", "AUD", "GBP", "CHF", "SEK", "NOK", "DKK", "JPY", "CNY",
        name="currency"
    )
    teaching_language_enum = sa.Enum(
        "english", "german", "french", "dutch", "spanish", "italian",
        "swedish", "norwegian", "danish", "finnish", "polish", "czech",
        "japanese", "chinese", "korean", "other",
        name="teachinglanguage"
    )
    onboarding_step_enum = sa.Enum(
        "profile", "goals", "first_program", "complete",
        name="onboardingstep"
    )
    transaction_type_enum = sa.Enum(
        "signup_bonus", "profile_reward", "profile_view_cost",
        "first_program_bonus", "onboarding_complete",
        "referral_bonus", "admin_adjustment",
        name="transactiontype"
    )
    language_test_type_enum = sa.Enum(
        "IELTS", "TOEFL_IBT", "TOEFL_PBT", "DUOLINGO", "PTE",
        "CAMBRIDGE_CAE", "CAMBRIDGE_CPE", "GOETHE", "TELC", "DSH", "TESTDAF",
        "DELF", "DALF", "TCF", "TEF",
        name="languagetesttype"
    )
    cefr_level_enum = sa.Enum(
        "A1", "A2", "B1", "B2", "C1", "C2",
        name="cefrlevel"
    )

    #bind = op.get_bind()
    #degree_level_enum.create(bind, checkfirst=True)
    #currency_enum.create(bind, checkfirst=True)
    #teaching_language_enum.create(bind, checkfirst=True)
    #onboarding_step_enum.create(bind, checkfirst=True)
    #transaction_type_enum.create(bind, checkfirst=True)
    #language_test_type_enum.create(bind, checkfirst=True)
    #cefr_level_enum.create(bind, checkfirst=True)

    # =====================
    # UNIVERSITIES
    # =====================
    op.create_table(
        "universities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False, index=True),
        sa.Column("name_local", sa.String(200), nullable=True),
        sa.Column("country", sa.String(100), nullable=False, index=True),
        sa.Column("city", sa.String(100), nullable=False, index=True),
        sa.Column("website", sa.String(300), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        # Rankings
        sa.Column("ranking_qs", sa.Integer(), nullable=True),
        sa.Column("ranking_the", sa.Integer(), nullable=True),
        sa.Column("ranking_shanghai", sa.Integer(), nullable=True),
        sa.Column("ranking_national", sa.Integer(), nullable=True),
        # Metadata
        sa.Column("university_type", sa.String(50), nullable=True),
        sa.Column("founded_year", sa.Integer(), nullable=True),
        sa.Column("student_count", sa.Integer(), nullable=True),
        sa.Column("international_student_percent", sa.Float(), nullable=True),
        sa.Column("acceptance_rate", sa.Float(), nullable=True),
        # Location
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # =====================
    # COURSES
    # =====================
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("university_id", sa.Integer(), sa.ForeignKey("universities.id"), nullable=False, index=True),
        sa.Column("name", sa.String(300), nullable=False, index=True),
        sa.Column("degree_level", degree_level_enum, nullable=False),
        sa.Column("field", sa.String(200), nullable=False, index=True),
        # Teaching
        sa.Column("teaching_language", teaching_language_enum, nullable=False),
        sa.Column("duration_months", sa.Integer(), nullable=True),
        sa.Column("credits_ects", sa.Integer(), nullable=True),
        # Tuition
        sa.Column("tuition_fee_amount", sa.Integer(), nullable=True),
        sa.Column("tuition_fee_currency", currency_enum, nullable=True),
        sa.Column("tuition_fee_per", sa.String(20), nullable=False, server_default="year"),
        sa.Column("is_tuition_free", sa.Boolean(), nullable=False, server_default="false"),
        # Deadlines
        sa.Column("deadline_fall", sa.Date(), nullable=True),
        sa.Column("deadline_spring", sa.Date(), nullable=True),
        sa.Column("deadline_notes", sa.String(500), nullable=True),
        # Academic requirements
        sa.Column("gpa_minimum", sa.Float(), nullable=True),
        sa.Column("gpa_scale", sa.String(10), nullable=False, server_default="4.0"),
        sa.Column("gre_required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("gre_minimum", sa.Integer(), nullable=True),
        sa.Column("gmat_required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("gmat_minimum", sa.Integer(), nullable=True),
        sa.Column("work_experience_months", sa.Integer(), nullable=True),
        # Scholarships
        sa.Column("scholarships_available", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("scholarship_details", sa.String(1000), nullable=True),
        # Links
        sa.Column("program_url", sa.String(500), nullable=True),
        sa.Column("application_url", sa.String(500), nullable=True),
        # Meta
        sa.Column("description", sa.String(3000), nullable=True),
        sa.Column("notes", sa.String(1000), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(), nullable=True),
        sa.Column("verified_by_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # =====================
    # COURSE LANGUAGE REQUIREMENTS
    # =====================
    op.create_table(
        "course_language_requirements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("course_id", sa.Integer(), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("test_type", language_test_type_enum, nullable=False),
        sa.Column("minimum_score", sa.String(20), nullable=False),
        sa.Column("minimum_cefr", cefr_level_enum, nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # =====================
    # USERS
    # =====================
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("full_name", sa.String(200), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
        # Profile
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("bio", sa.String(1000), nullable=True),
        sa.Column("current_country", sa.String(100), nullable=True),
        sa.Column("target_countries", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("target_fields", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("target_degree_levels", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("target_intake_year", sa.Integer(), nullable=True),
        # Onboarding
        sa.Column("onboarding_step", onboarding_step_enum, nullable=True),
        sa.Column("onboarding_completed_at", sa.DateTime(), nullable=True),
        # Ghadam wallet
        sa.Column("ghadam_balance", sa.Integer(), nullable=False, server_default="0"),
        # Timestamps
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
    )

    # =====================
    # OTP CODES
    # =====================
    op.create_table(
        "otp_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone", sa.String(20), nullable=False, index=True),
        sa.Column("code", sa.String(6), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
    )
    # =====================
    # GHADAM TRANSACTIONS
    # =====================
    op.create_table(
        "ghadam_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("transaction_type", transaction_type_enum, nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("reference_id", sa.String(100), nullable=True),
        sa.Column("balance_after", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("ghadam_transactions")
    op.drop_table("otp_codes")
    op.drop_table("users")
    op.drop_table("course_language_requirements")
    op.drop_table("courses")
    op.drop_table("universities")

    bind = op.get_bind()
    sa.Enum(name="cefrlevel").drop(bind, checkfirst=True)
    sa.Enum(name="languagetesttype").drop(bind, checkfirst=True)
    sa.Enum(name="transactiontype").drop(bind, checkfirst=True)
    sa.Enum(name="onboardingstep").drop(bind, checkfirst=True)
    sa.Enum(name="teachinglanguage").drop(bind, checkfirst=True)
    sa.Enum(name="currency").drop(bind, checkfirst=True)
    sa.Enum(name="degreelevel").drop(bind, checkfirst=True)
