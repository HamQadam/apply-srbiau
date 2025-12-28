"""Course/Program model with structured requirements and tuition."""
from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Enum as SAEnum

if TYPE_CHECKING:
    from .university import University
    from .course_language_requirement import CourseLanguageRequirement
    from .tracked_program import TrackedProgram


class DegreeLevel(str, Enum):
    BACHELOR = "bachelor"
    MASTER = "master"
    PHD = "phd"
    DIPLOMA = "diploma"
    CERTIFICATE = "certificate"


class Currency(str, Enum):
    EUR = "EUR"
    USD = "USD"
    CAD = "CAD"
    AUD = "AUD"
    GBP = "GBP"
    CHF = "CHF"
    SEK = "SEK"
    NOK = "NOK"
    DKK = "DKK"
    JPY = "JPY"
    CNY = "CNY"


class TeachingLanguage(str, Enum):
    ENGLISH = "english"
    GERMAN = "german"
    FRENCH = "french"
    DUTCH = "dutch"
    SPANISH = "spanish"
    ITALIAN = "italian"
    SWEDISH = "swedish"
    NORWEGIAN = "norwegian"
    DANISH = "danish"
    FINNISH = "finnish"
    POLISH = "polish"
    CZECH = "czech"
    JAPANESE = "japanese"
    CHINESE = "chinese"
    KOREAN = "korean"
    OTHER = "other"


class IntakeType(str, Enum):
    FALL = "fall"
    SPRING = "spring"
    WINTER = "winter"
    SUMMER = "summer"
    ROLLING = "rolling"


class CourseBase(SQLModel):
    # Basic info
    name: str = Field(max_length=300, index=True)
    degree_level: DegreeLevel = Field(sa_column=Column(SAEnum(DegreeLevel)))
    field: str = Field(max_length=200, index=True)  # Normalized field: "Computer Science", "Data Science"
    
    # Teaching
    teaching_language: TeachingLanguage = Field(sa_column=Column(SAEnum(TeachingLanguage)))
    duration_months: Optional[int] = Field(default=None, ge=1, le=120)
    credits_ects: Optional[int] = Field(default=None)  # ECTS credits if applicable
    
    # Tuition - structured for filtering
    tuition_fee_amount: Optional[int] = Field(default=None, ge=0)  # Annual amount
    tuition_fee_currency: Optional[Currency] = Field(default=None, sa_column=Column(SAEnum(Currency)))
    tuition_fee_per: str = Field(default="year", max_length=20)  # "year", "semester", "total"
    is_tuition_free: bool = Field(default=False)  # For free programs (Germany, Norway, etc.)
    
    # Deadlines
    deadline_fall: Optional[date] = Field(default=None)
    deadline_spring: Optional[date] = Field(default=None)
    deadline_notes: Optional[str] = Field(default=None, max_length=500)  # "EU: March 1, Non-EU: January 15"
    
    # Academic requirements
    gpa_minimum: Optional[float] = Field(default=None, ge=0, le=4.0)  # On 4.0 scale
    gpa_scale: str = Field(default="4.0", max_length=10)  # "4.0", "20", "100", etc.
    gre_required: bool = Field(default=False)
    gre_minimum: Optional[int] = Field(default=None)  # Combined score
    gmat_required: bool = Field(default=False)
    gmat_minimum: Optional[int] = Field(default=None)
    work_experience_months: Optional[int] = Field(default=None, ge=0)
    
    # Scholarships & funding
    scholarships_available: bool = Field(default=False)
    scholarship_details: Optional[str] = Field(default=None, max_length=1000)
    
    # Links
    program_url: Optional[str] = Field(default=None, max_length=500)
    application_url: Optional[str] = Field(default=None, max_length=500)
    
    # Meta
    description: Optional[str] = Field(default=None, max_length=3000)
    notes: Optional[str] = Field(default=None, max_length=1000)
    
    # Verification
    last_verified_at: Optional[datetime] = Field(default=None)
    verified_by_count: int = Field(default=0)  # Community verification count


class Course(CourseBase, table=True):
    __tablename__ = "courses"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    university_id: int = Field(foreign_key="universities.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    view_count: int = Field(default=0)
    
    # Relationships
    university: "University" = Relationship(back_populates="courses")
    language_requirements: List["CourseLanguageRequirement"] = Relationship(back_populates="course")
    tracked_by: List["TrackedProgram"] = Relationship(back_populates="course")


class CourseCreate(CourseBase):
    university_id: int


class CourseRead(CourseBase):
    id: int
    university_id: int
    created_at: datetime
    view_count: int
    
    # Joined data
    university_name: Optional[str] = None
    university_country: Optional[str] = None
    university_city: Optional[str] = None
    university_ranking_qs: Optional[int] = None


class CourseSearch(SQLModel):
    """Search/filter parameters for courses."""
    query: Optional[str] = None
    field: Optional[str] = None
    degree_level: Optional[DegreeLevel] = None
    country: Optional[str] = None
    teaching_language: Optional[TeachingLanguage] = None
    max_tuition: Optional[int] = None  # In EUR equivalent
    tuition_free_only: bool = False
    scholarships_only: bool = False
    gre_not_required: bool = False
    max_gpa_required: Optional[float] = None
    university_id: Optional[int] = None
    deadline_after: Optional[date] = None
    deadline_before: Optional[date] = None
    limit: int = Field(default=20, le=100)
    offset: int = Field(default=0, ge=0)


class CourseSummary(SQLModel):
    """Minimal course info for lists and autocomplete."""
    id: int
    name: str
    degree_level: DegreeLevel
    university_name: str
    university_country: str
    deadline_fall: Optional[date] = None