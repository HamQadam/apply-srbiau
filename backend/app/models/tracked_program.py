from datetime import datetime, date
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.course import Course


class TrackedProgramStatus(str, Enum):
    RESEARCHING = "researching"
    PREPARING = "preparing"
    SUBMITTED = "submitted"
    INTERVIEW = "interview"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WAITLISTED = "waitlisted"


class TrackedProgramPriority(str, Enum):
    REACH = "reach"
    TARGET = "target"
    SAFETY = "safety"


class TrackedProgramBase(SQLModel):
    """Base fields for the personal application tracker."""

    # Optional link to the global course catalog
    course_id: Optional[int] = Field(default=None, foreign_key="courses.id", index=True)

    # Custom program entry (when course_id is null)
    custom_program_name: Optional[str] = Field(default=None, max_length=300)

    # Stored denormalized for fast display + stability even if catalog changes
    university_name: str = Field(max_length=200, index=True)
    country: str = Field(max_length=100, index=True)

    deadline: Optional[date] = Field(default=None, description="Application deadline")
    status: TrackedProgramStatus = Field(default=TrackedProgramStatus.RESEARCHING, index=True)

    submitted_date: Optional[date] = None
    result_date: Optional[date] = None

    notes: Optional[str] = Field(default=None, max_length=4000, description="Private notes")
    priority: TrackedProgramPriority = Field(default=TrackedProgramPriority.TARGET, index=True)

    # [{ name: "SOP", done: true }, ...]
    documents_checklist: Optional[list[dict]] = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
        description="Private checklist stored as JSON",
    )


class TrackedProgram(TrackedProgramBase, table=True):
    __tablename__ = "tracked_programs"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="tracked_programs")
    course: Optional["Course"] = Relationship()


class TrackedProgramCreate(SQLModel):
    """Create payload."""

    course_id: Optional[int] = None
    custom_program_name: Optional[str] = None

    # If course_id is provided, these can be omitted and will be auto-filled
    university_name: Optional[str] = None
    country: Optional[str] = None

    deadline: Optional[date] = None
    status: TrackedProgramStatus = TrackedProgramStatus.RESEARCHING
    submitted_date: Optional[date] = None
    result_date: Optional[date] = None
    notes: Optional[str] = None
    priority: TrackedProgramPriority = TrackedProgramPriority.TARGET
    documents_checklist: Optional[list[dict]] = None


class TrackedProgramRead(TrackedProgramBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    # Helpful display fields (for DB-linked entries)
    course_name: Optional[str] = None

    class Config:
        from_attributes = True


class TrackedProgramUpdate(SQLModel):
    """Patch payload - all fields optional."""

    course_id: Optional[int] = None
    custom_program_name: Optional[str] = None
    university_name: Optional[str] = None
    country: Optional[str] = None

    deadline: Optional[date] = None
    status: Optional[TrackedProgramStatus] = None
    submitted_date: Optional[date] = None
    result_date: Optional[date] = None
    notes: Optional[str] = None
    priority: Optional[TrackedProgramPriority] = None
    documents_checklist: Optional[list[dict]] = None
