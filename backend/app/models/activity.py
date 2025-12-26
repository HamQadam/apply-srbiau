from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

if TYPE_CHECKING:
    from app.models.applicant import Applicant


class ActivityType(str, Enum):
    WORK = "work_experience"
    RESEARCH = "research"
    TEACHING = "teaching_assistant"
    VOLUNTEER = "volunteer"
    COMMUNITY = "community_leadership"
    PUBLICATION = "publication"
    AWARD = "award"
    PROJECT = "project"
    OTHER = "other"


class ExtracurricularActivityBase(SQLModel):
    """Work experience, research, volunteering, awards, etc."""
    activity_type: ActivityType
    title: str = Field(max_length=200, description="Position/Role title")
    organization: str = Field(max_length=200)
    location: Optional[str] = Field(default=None, max_length=200)
    
    description: str = Field(max_length=2000, description="What you did, achievements")
    
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_ongoing: bool = Field(default=False)
    
    # For publications, awards
    url: Optional[str] = Field(default=None, max_length=500, description="Link to publication/project")
    
    # How important was this for applications?
    impact_note: Optional[str] = Field(default=None, max_length=500, description="How this helped your applications")


class ExtracurricularActivity(ExtracurricularActivityBase, table=True):
    """Database table for activities."""
    __tablename__ = "extracurricular_activities"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="applicants.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    applicant: Optional["Applicant"] = Relationship(back_populates="activities")


class ExtracurricularActivityCreate(ExtracurricularActivityBase):
    """Schema for creating activity."""
    pass


class ExtracurricularActivityRead(ExtracurricularActivityBase):
    """Schema for reading activity."""
    id: int
    applicant_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ExtracurricularActivityUpdate(SQLModel):
    """Schema for updating activity."""
    activity_type: Optional[ActivityType] = None
    title: Optional[str] = None
    organization: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_ongoing: Optional[bool] = None
    url: Optional[str] = None
    impact_note: Optional[str] = None
