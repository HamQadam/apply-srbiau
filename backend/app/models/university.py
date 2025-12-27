from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.application import Application


class UniversityBase(SQLModel):
    """Base university fields shared between schemas."""
    name: str = Field(max_length=200, index=True, description="University name")
    country: str = Field(max_length=100, index=True, description="Country where university is located")
    city: Optional[str] = Field(default=None, max_length=100, description="City where university is located")
    website: Optional[str] = Field(default=None, max_length=300, description="Official university website")
    logo_url: Optional[str] = Field(default=None, max_length=500, description="URL to university logo/image")
    description: Optional[str] = Field(default=None, max_length=2000, description="Brief description of the university")


class University(UniversityBase, table=True):
    """Database table for universities."""
    __tablename__ = "universities"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    courses: list["Course"] = Relationship(back_populates="university", cascade_delete=True)
    applications: list["Application"] = Relationship(back_populates="university")


class UniversityCreate(UniversityBase):
    """Schema for creating a university."""
    pass


class UniversityRead(UniversityBase):
    """Schema for reading university data."""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UniversityReadWithCourses(UniversityRead):
    """University with related courses."""
    courses: list["CourseRead"] = []


class UniversityUpdate(SQLModel):
    """Schema for updating university - all fields optional."""
    name: Optional[str] = Field(default=None, max_length=200)
    country: Optional[str] = Field(default=None, max_length=100)
    city: Optional[str] = Field(default=None, max_length=100)
    website: Optional[str] = Field(default=None, max_length=300)
    logo_url: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None, max_length=2000)


# Import for type hints at runtime
from app.models.course import CourseRead
UniversityReadWithCourses.model_rebuild()
