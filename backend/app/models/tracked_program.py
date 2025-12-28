"""TrackedProgram model - user's personal application tracker."""
from datetime import datetime, date
from typing import Optional, List, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Enum as SAEnum, JSON

if TYPE_CHECKING:
    from .user import User
    from .course import Course


class ApplicationStatus(str, Enum):
    """Application status - follows typical application lifecycle."""
    RESEARCHING = "researching"      # Just added, looking into it
    PREPARING = "preparing"          # Preparing documents
    SUBMITTED = "submitted"          # Application sent
    UNDER_REVIEW = "under_review"    # Being processed
    INTERVIEW = "interview"          # Interview stage
    WAITLISTED = "waitlisted"        # On waitlist
    ACCEPTED = "accepted"            # Got in!
    REJECTED = "rejected"            # Didn't make it
    WITHDRAWN = "withdrawn"          # User withdrew application
    DEFERRED = "deferred"            # Deferred to next intake


class Priority(str, Enum):
    """How much the user wants this program."""
    DREAM = "dream"      # Reach school, would be amazing
    TARGET = "target"    # Good fit, realistic
    SAFETY = "safety"    # Backup option


class IntakePeriod(str, Enum):
    FALL_2025 = "fall_2025"
    SPRING_2026 = "spring_2026"
    FALL_2026 = "fall_2026"
    SPRING_2027 = "spring_2027"
    FALL_2027 = "fall_2027"


class DocumentChecklistItem(SQLModel):
    """Single item in document checklist."""
    name: str
    required: bool = True
    completed: bool = False
    notes: Optional[str] = None


class TrackedProgramBase(SQLModel):
    """Base fields for tracked program."""
    # If not in database, user can add custom
    custom_program_name: Optional[str] = Field(default=None, max_length=300)
    custom_university_name: Optional[str] = Field(default=None, max_length=200)
    custom_country: Optional[str] = Field(default=None, max_length=100)
    custom_deadline: Optional[date] = Field(default=None)
    
    # Status tracking
    status: ApplicationStatus = Field(
        default=ApplicationStatus.RESEARCHING,
        sa_column=Column(SAEnum(ApplicationStatus))
    )
    priority: Priority = Field(
        default=Priority.TARGET,
        sa_column=Column(SAEnum(Priority))
    )
    intake: Optional[IntakePeriod] = Field(
        default=None,
        sa_column=Column(SAEnum(IntakePeriod))
    )
    
    # Important dates
    deadline: Optional[date] = Field(default=None)  # Override or custom deadline
    submitted_date: Optional[date] = Field(default=None)
    result_date: Optional[date] = Field(default=None)
    interview_date: Optional[date] = Field(default=None)
    
    # User notes (private)
    notes: Optional[str] = Field(default=None, max_length=2000)
    
    # Document checklist stored as JSON
    document_checklist: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON))
    
    # Application details
    application_portal_url: Optional[str] = Field(default=None, max_length=500)
    application_id: Optional[str] = Field(default=None, max_length=100)  # Their ref number
    
    # Post-result
    scholarship_offered: bool = Field(default=False)
    scholarship_amount: Optional[int] = Field(default=None)
    scholarship_notes: Optional[str] = Field(default=None, max_length=500)
    
    # Did user share this journey?
    shared_as_experience: bool = Field(default=False)


class TrackedProgram(TrackedProgramBase, table=True):
    __tablename__ = "tracked_programs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    course_id: Optional[int] = Field(default=None, foreign_key="courses.id", index=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: "User" = Relationship(back_populates="tracked_programs")
    course: Optional["Course"] = Relationship(back_populates="tracked_by")


class TrackedProgramCreate(SQLModel):
    """Create a tracked program - either from database or custom."""
    # Option 1: Link to existing course
    course_id: Optional[int] = None
    
    # Option 2: Custom entry
    custom_program_name: Optional[str] = None
    custom_university_name: Optional[str] = None
    custom_country: Optional[str] = None
    custom_deadline: Optional[date] = None
    
    # Common fields
    priority: Priority = Priority.TARGET
    intake: Optional[IntakePeriod] = None
    notes: Optional[str] = None


class TrackedProgramUpdate(SQLModel):
    """Update tracked program - all fields optional."""
    status: Optional[ApplicationStatus] = None
    priority: Optional[Priority] = None
    intake: Optional[IntakePeriod] = None
    deadline: Optional[date] = None
    submitted_date: Optional[date] = None
    result_date: Optional[date] = None
    interview_date: Optional[date] = None
    notes: Optional[str] = None
    document_checklist: Optional[List[dict]] = None
    application_portal_url: Optional[str] = None
    application_id: Optional[str] = None
    scholarship_offered: Optional[bool] = None
    scholarship_amount: Optional[int] = None
    scholarship_notes: Optional[str] = None


class TrackedProgramRead(TrackedProgramBase):
    """Read tracked program with joined course/university data."""
    id: int
    user_id: int
    course_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    # Joined data (from course)
    program_name: Optional[str] = None
    university_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    university_ranking_qs: Optional[int] = None
    degree_level: Optional[str] = None
    program_deadline: Optional[date] = None  # From course, if linked


class TrackerStats(SQLModel):
    """User's tracker statistics."""
    total_programs: int = 0
    by_status: dict = {}
    by_priority: dict = {}
    accepted_count: int = 0
    rejected_count: int = 0
    pending_count: int = 0
    upcoming_deadlines: int = 0  # In next 30 days


# Default document checklist for common applications
DEFAULT_CHECKLIST = [
    {"name": "Transcript", "required": True, "completed": False},
    {"name": "Degree Certificate", "required": True, "completed": False},
    {"name": "CV/Resume", "required": True, "completed": False},
    {"name": "Motivation Letter", "required": True, "completed": False},
    {"name": "Language Certificate", "required": True, "completed": False},
    {"name": "Recommendation Letter 1", "required": True, "completed": False},
    {"name": "Recommendation Letter 2", "required": False, "completed": False},
    {"name": "Passport Copy", "required": True, "completed": False},
    {"name": "Photo", "required": False, "completed": False},
    {"name": "Application Fee", "required": False, "completed": False},
]