"""University model with comprehensive ranking and metadata."""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .course import Course


class UniversityBase(SQLModel):
    name: str = Field(max_length=200, index=True)
    name_local: Optional[str] = Field(default=None, max_length=200)  # Native language name
    country: str = Field(max_length=100, index=True)
    city: str = Field(max_length=100, index=True)
    website: Optional[str] = Field(default=None, max_length=300)
    logo_url: Optional[str] = Field(default=None, max_length=500)
    
    # Rankings (nullable - not all unis are ranked)
    ranking_qs: Optional[int] = Field(default=None, ge=1)  # QS World Ranking
    ranking_the: Optional[int] = Field(default=None, ge=1)  # Times Higher Education
    ranking_shanghai: Optional[int] = Field(default=None, ge=1)  # ARWU Shanghai
    ranking_national: Optional[int] = Field(default=None, ge=1)  # National ranking
    
    # Metadata
    university_type: Optional[str] = Field(default=None, max_length=50)  # public, private, technical
    founded_year: Optional[int] = Field(default=None)
    student_count: Optional[int] = Field(default=None)
    international_student_percent: Optional[float] = Field(default=None, ge=0, le=100)
    acceptance_rate: Optional[float] = Field(default=None, ge=0, le=100)
    
    # Location details
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)


class University(UniversityBase, table=True):
    __tablename__ = "universities"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    courses: List["Course"] = Relationship(back_populates="university")


class UniversityCreate(UniversityBase):
    pass


class UniversityRead(UniversityBase):
    id: int
    created_at: datetime
    course_count: Optional[int] = None


class UniversitySearch(SQLModel):
    """Search/filter parameters for universities."""
    query: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    max_ranking_qs: Optional[int] = None
    university_type: Optional[str] = None
    limit: int = Field(default=20, le=100)
    offset: int = Field(default=0, ge=0)