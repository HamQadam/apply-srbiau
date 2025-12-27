from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from app.models.application import DegreeLevel

if TYPE_CHECKING:
    from app.models.university import University


class CourseBase(SQLModel):
    """Base course fields for global course catalog."""
    course_name: str = Field(max_length=300, index=True, description="Name of the course/program")
    department: Optional[str] = Field(default=None, max_length=200, description="Department offering the course")
    degree_level: DegreeLevel = Field(index=True, description="masters, phd, mba, postdoc")

    # Course details
    website_url: Optional[str] = Field(default=None, max_length=500, description="Program-specific URL")
    description: Optional[str] = Field(default=None, max_length=3000, description="Course description and curriculum overview")

    # Requirements
    language_requirements: Optional[str] = Field(default=None, max_length=500, description="e.g., IELTS 6.5, TOEFL 90")
    minimum_gpa: Optional[str] = Field(default=None, max_length=50, description="Minimum GPA requirement")
    application_deadline: Optional[date] = Field(default=None, description="General application deadline")
    tuition_fees: Optional[str] = Field(default=None, max_length=200, description="Tuition fee information")

    # Additional info
    duration_months: Optional[int] = Field(default=None, description="Program duration in months")
    scholarships_available: bool = Field(default=False, description="Whether scholarships are available")
    notes: Optional[str] = Field(default=None, max_length=1000, description="Additional notes or tips")


class Course(CourseBase, table=True):
    """Database table for courses."""
    __tablename__ = "courses"

    id: Optional[int] = Field(default=None, primary_key=True)
    university_id: int = Field(foreign_key="universities.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Stats for rate limiting and analytics
    view_count: int = Field(default=0, description="Total number of views (for analytics)")

    # Relationships
    university: Optional["University"] = Relationship(back_populates="courses")


class CourseCreate(CourseBase):
    """Schema for creating a course."""
    university_id: int


class CourseRead(CourseBase):
    """Schema for reading course data."""
    id: int
    university_id: int
    created_at: datetime
    updated_at: datetime
    view_count: int

    class Config:
        from_attributes = True


class CourseReadWithUniversity(CourseRead):
    """Course with related university data."""
    university: "UniversityRead"


class CourseUpdate(SQLModel):
    """Schema for updating course - all fields optional."""
    course_name: Optional[str] = Field(default=None, max_length=300)
    department: Optional[str] = Field(default=None, max_length=200)
    degree_level: Optional[DegreeLevel] = None
    website_url: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None, max_length=3000)
    language_requirements: Optional[str] = Field(default=None, max_length=500)
    minimum_gpa: Optional[str] = Field(default=None, max_length=50)
    application_deadline: Optional[date] = None
    tuition_fees: Optional[str] = Field(default=None, max_length=200)
    duration_months: Optional[int] = None
    scholarships_available: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=1000)
    university_id: Optional[int] = None


# Import for type hints
from app.models.university import UniversityRead
CourseReadWithUniversity.model_rebuild()
