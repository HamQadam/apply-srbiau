from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

if TYPE_CHECKING:
    from app.models.applicant import Applicant


class ApplicationStatus(str, Enum):
    PREPARING = "preparing"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    INTERVIEW = "interview"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WAITLISTED = "waitlisted"
    WITHDRAWN = "withdrawn"


class DegreeLevel(str, Enum):
    MASTERS = "masters"
    PHD = "phd"
    MBA = "mba"
    POSTDOC = "postdoc"


class ApplicationBase(SQLModel):
    """A single program application."""
    # Target program info
    university_name: str = Field(max_length=200, index=True)
    country: str = Field(max_length=100, index=True)
    city: Optional[str] = Field(default=None, max_length=100)
    program_name: str = Field(max_length=300)
    department: Optional[str] = Field(default=None, max_length=200)
    degree_level: DegreeLevel
    
    # Application details
    application_year: int = Field(ge=2000, le=2100, index=True)
    application_round: Optional[str] = Field(default=None, max_length=100, description="e.g., Fall 2024, Spring 2025")
    application_deadline: Optional[date] = None
    submitted_date: Optional[date] = None
    
    # Result
    status: ApplicationStatus = Field(default=ApplicationStatus.PREPARING)
    decision_date: Optional[date] = None
    
    # Funding
    scholarship_applied: bool = Field(default=False)
    scholarship_received: bool = Field(default=False)
    scholarship_name: Optional[str] = Field(default=None, max_length=200)
    scholarship_amount: Optional[str] = Field(default=None, max_length=100, description="e.g., Full tuition, €500/month")
    
    # Valuable insights for others
    notes: Optional[str] = Field(default=None, max_length=3000, description="Tips, timeline, experience")
    interview_experience: Optional[str] = Field(default=None, max_length=2000)
    
    # How did they find this program?
    how_found: Optional[str] = Field(default=None, max_length=500)
    would_recommend: Optional[bool] = None


class Application(ApplicationBase, table=True):
    """Database table for applications."""
    __tablename__ = "applications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="applicants.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    applicant: Optional["Applicant"] = Relationship(back_populates="applications")


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


class ApplicationUpdate(SQLModel):
    """Schema for updating application."""
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
    how_found: Optional[str] = None
    would_recommend: Optional[bool] = None
