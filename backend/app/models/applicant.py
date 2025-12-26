from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from decimal import Decimal

if TYPE_CHECKING:
    from app.models.language import LanguageCredential
    from app.models.document import Document
    from app.models.activity import ExtracurricularActivity
    from app.models.application import Application
    from app.models.user import User
    from app.models.subscription import Subscription


class ApplicantBase(SQLModel):
    """Base applicant fields shared between create/read/update."""
    display_name: str = Field(max_length=100, description="Public name or anonymous alias")
    is_anonymous: bool = Field(default=False, description="Hide real identity")
    
    # Pricing for pay-to-read
    is_premium: bool = Field(default=False, description="Premium content costs more")
    view_price: int = Field(default=20, description="Ghadams required to view full profile")
    
    # Academic background
    university: str = Field(max_length=200, description="Home university name")
    faculty: Optional[str] = Field(default=None, max_length=200)
    major: str = Field(max_length=200, description="Field of study / Course")
    degree_level: str = Field(max_length=50, description="Bachelor's, Master's, PhD")
    graduation_year: int = Field(ge=1990, le=2100)
    
    # GPA info - using string to preserve exact format (some use 4.0, others 20.0)
    overall_gpa: Optional[str] = Field(default=None, max_length=20, description="e.g., 3.8/4.0 or 18.5/20")
    last_two_years_gpa: Optional[str] = Field(default=None, max_length=20)
    gpa_scale: Optional[str] = Field(default=None, max_length=20, description="e.g., 4.0, 20, 100")
    
    bio: Optional[str] = Field(default=None, max_length=1000, description="Brief intro about yourself")


class Applicant(ApplicantBase, table=True):
    """Database table for applicants."""
    __tablename__ = "applicants"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id", unique=True, index=True)
    email: Optional[str] = Field(default=None, max_length=255, unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Ghadam stats
    total_views: int = Field(default=0, description="Total paid views")
    ghadams_earned: int = Field(default=0, description="Total ghadams earned from this profile")
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="applicant")
    language_credentials: list["LanguageCredential"] = Relationship(back_populates="applicant")
    documents: list["Document"] = Relationship(back_populates="applicant")
    activities: list["ExtracurricularActivity"] = Relationship(back_populates="applicant")
    applications: list["Application"] = Relationship(back_populates="applicant")
    subscribers: list["Subscription"] = Relationship(back_populates="applicant")


class ApplicantCreate(ApplicantBase):
    """Schema for creating a new applicant."""
    email: Optional[str] = Field(default=None, max_length=255)


class ApplicantRead(ApplicantBase):
    """Schema for reading applicant data."""
    id: int
    created_at: datetime
    total_views: int = 0
    is_premium: bool = False
    view_price: int = 20
    
    # Don't expose email in public reads
    class Config:
        from_attributes = True


class ApplicantPreview(SQLModel):
    """Limited preview for non-subscribers."""
    id: int
    display_name: str
    university: str
    major: str
    degree_level: str
    graduation_year: int
    is_premium: bool
    view_price: int
    total_views: int
    has_documents: bool = False
    has_applications: bool = False
    application_count: int = 0
    
    class Config:
        from_attributes = True


class ApplicantReadFull(ApplicantRead):
    """Full applicant profile with all related data."""
    language_credentials: list["LanguageCredentialRead"] = []
    documents: list["DocumentRead"] = []
    activities: list["ExtracurricularActivityRead"] = []
    applications: list["ApplicationRead"] = []


class ApplicantUpdate(SQLModel):
    """Schema for updating applicant - all fields optional."""
    display_name: Optional[str] = None
    is_anonymous: Optional[bool] = None
    university: Optional[str] = None
    faculty: Optional[str] = None
    major: Optional[str] = None
    degree_level: Optional[str] = None
    graduation_year: Optional[int] = None
    overall_gpa: Optional[str] = None
    last_two_years_gpa: Optional[str] = None
    gpa_scale: Optional[str] = None
    bio: Optional[str] = None


# Import for type hints at runtime
from app.models.language import LanguageCredentialRead
from app.models.document import DocumentRead
from app.models.activity import ExtracurricularActivityRead
from app.models.application import ApplicationRead
from app.models.subscription import Subscription

ApplicantReadFull.model_rebuild()
