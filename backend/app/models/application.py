from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Enum as SAEnum
from enum import Enum

if TYPE_CHECKING:
    from app.models.applicant import Applicant
    from app.models.university import University
    from app.models.course import Course


class ApplicationStatus(str, Enum):
    PREPARING = "preparing"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    INTERVIEW = "interview"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WAITLISTED = "waitlisted"
    WITHDRAWN = "withdrawn"


class ExperienceVisibility(str, Enum):
    PRIVATE = "private"
    ANONYMIZED = "anonymized"
    PUBLIC = "public"


class ExperienceModerationStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    HIDDEN = "hidden"


class DegreeLevel(str, Enum):
    MASTERS = "masters"
    PHD = "phd"
    MBA = "mba"
    POSTDOC = "postdoc"


class ApplicationBase(SQLModel):
    """A single public or private application experience."""
    university_id: Optional[int] = Field(
        default=None,
        foreign_key="universities.id",
        index=True,
        description="Foreign key to universities table",
    )
    course_id: Optional[int] = Field(default=None, foreign_key="courses.id", index=True)

    # Custom/legacy target fields for experiences that cannot be matched to catalogue rows.
    university_name: Optional[str] = Field(default=None, max_length=200, index=True)
    country: Optional[str] = Field(default=None, max_length=100, index=True)
    city: Optional[str] = Field(default=None, max_length=100)
    program_name: str = Field(max_length=300)
    department: Optional[str] = Field(default=None, max_length=200)
    degree_level: DegreeLevel

    application_year: int = Field(ge=2000, le=2100, index=True)
    application_round: Optional[str] = Field(default=None, max_length=100, description="e.g., Fall 2024, Spring 2025")
    application_deadline: Optional[date] = None
    submitted_date: Optional[date] = None

    status: ApplicationStatus = Field(default=ApplicationStatus.PREPARING)
    decision_date: Optional[date] = None

    scholarship_applied: bool = Field(default=False)
    scholarship_received: bool = Field(default=False)
    scholarship_name: Optional[str] = Field(default=None, max_length=200)
    scholarship_amount: Optional[str] = Field(default=None, max_length=100, description="e.g., Full tuition, EUR 500/month")

    notes: Optional[str] = Field(default=None, max_length=3000, description="Tips, timeline, experience")
    interview_experience: Optional[str] = Field(default=None, max_length=2000)
    advice_for_applicants: Optional[str] = Field(default=None, max_length=2000)
    timeline_notes: Optional[str] = Field(default=None, max_length=2000)

    how_found: Optional[str] = Field(default=None, max_length=500)
    would_recommend: Optional[bool] = None

    visibility: ExperienceVisibility = Field(
        default=ExperienceVisibility.ANONYMIZED,
        sa_column=Column(SAEnum(ExperienceVisibility)),
    )
    moderation_status: ExperienceModerationStatus = Field(
        default=ExperienceModerationStatus.DRAFT,
        sa_column=Column(SAEnum(ExperienceModerationStatus)),
    )
    pii_warning_accepted: bool = Field(default=False)
    source_tracked_program_id: Optional[int] = Field(default=None, foreign_key="tracked_programs.id", index=True)
    submitted_for_review_at: Optional[datetime] = Field(default=None)
    reviewed_at: Optional[datetime] = Field(default=None)
    reviewer_id: Optional[int] = Field(default=None, foreign_key="users.id")
    moderation_notes: Optional[str] = Field(default=None, max_length=1000)


class Application(ApplicationBase, table=True):
    """Database table for applicant application experiences."""
    __tablename__ = "applications"

    id: Optional[int] = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="applicants.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    applicant: Optional["Applicant"] = Relationship(back_populates="applications")
    university: Optional["University"] = Relationship(back_populates="applications")
    course: Optional["Course"] = Relationship()


class ApplicationCreate(ApplicationBase):
    """Schema for creating application."""
    pass


class ApplicationRead(ApplicationBase):
    """Schema for reading application."""
    id: int
    applicant_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PublicExperienceRead(SQLModel):
    id: int
    university_id: Optional[int] = None
    course_id: Optional[int] = None
    university_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    program_name: str
    department: Optional[str] = None
    degree_level: DegreeLevel
    application_year: int
    application_round: Optional[str] = None
    status: ApplicationStatus
    decision_date: Optional[date] = None
    scholarship_applied: bool
    scholarship_received: bool
    scholarship_name: Optional[str] = None
    scholarship_amount: Optional[str] = None
    notes: Optional[str] = None
    interview_experience: Optional[str] = None
    advice_for_applicants: Optional[str] = None
    timeline_notes: Optional[str] = None
    would_recommend: Optional[bool] = None
    visibility: ExperienceVisibility
    view_price: int = 0
    requires_unlock: bool = False
    applicant_display_name: Optional[str] = None
    applicant_degree_level: Optional[str] = None
    applicant_major: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExperienceSubmitFromTracker(SQLModel):
    visibility: ExperienceVisibility = ExperienceVisibility.ANONYMIZED
    status: Optional[ApplicationStatus] = ApplicationStatus.ACCEPTED
    program_name: Optional[str] = None
    university_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    university_id: Optional[int] = None
    course_id: Optional[int] = None
    degree_level: Optional[DegreeLevel] = None
    application_year: int = Field(ge=2000, le=2100)
    application_round: Optional[str] = Field(default=None, max_length=100)
    application_deadline: Optional[date] = None
    submitted_date: Optional[date] = None
    decision_date: Optional[date] = None
    scholarship_applied: bool = False
    scholarship_received: bool = False
    scholarship_name: Optional[str] = Field(default=None, max_length=200)
    scholarship_amount: Optional[str] = Field(default=None, max_length=100)
    notes: str = Field(min_length=20, max_length=3000)
    interview_experience: Optional[str] = Field(default=None, max_length=2000)
    advice_for_applicants: Optional[str] = Field(default=None, max_length=2000)
    timeline_notes: Optional[str] = Field(default=None, max_length=2000)
    how_found: Optional[str] = Field(default=None, max_length=500)
    would_recommend: Optional[bool] = None
    pii_warning_accepted: bool = False


class ExperienceModerationUpdate(SQLModel):
    moderation_status: ExperienceModerationStatus
    moderation_notes: Optional[str] = Field(default=None, max_length=1000)


class ApplicationUpdate(SQLModel):
    """Schema for updating application."""
    university_id: Optional[int] = None
    course_id: Optional[int] = None
    university_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    program_name: Optional[str] = None
    department: Optional[str] = None
    degree_level: Optional[DegreeLevel] = None
    application_year: Optional[int] = None
    application_round: Optional[str] = None
    application_deadline: Optional[date] = None
    submitted_date: Optional[date] = None
    status: Optional[ApplicationStatus] = None
    decision_date: Optional[date] = None
    scholarship_applied: Optional[bool] = None
    scholarship_received: Optional[bool] = None
    scholarship_name: Optional[str] = None
    scholarship_amount: Optional[str] = None
    notes: Optional[str] = None
    interview_experience: Optional[str] = None
    advice_for_applicants: Optional[str] = None
    timeline_notes: Optional[str] = None
    how_found: Optional[str] = None
    would_recommend: Optional[bool] = None
    visibility: Optional[ExperienceVisibility] = None
    moderation_status: Optional[ExperienceModerationStatus] = None
    pii_warning_accepted: Optional[bool] = None
