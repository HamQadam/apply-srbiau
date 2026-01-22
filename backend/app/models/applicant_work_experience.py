from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.applicant import Applicant


class ApplicantWorkExperienceBase(SQLModel):
    company_name: str = Field(max_length=200)
    job_title: str = Field(max_length=200)
    duration_months: Optional[int] = Field(default=None, ge=0)
    is_current: bool = Field(default=False)
    sort_order: int = Field(default=0)


class ApplicantWorkExperience(ApplicantWorkExperienceBase, table=True):
    __tablename__ = "applicant_work_experiences"

    id: Optional[int] = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="applicants.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    applicant: Optional["Applicant"] = Relationship(back_populates="work_experiences")


class ApplicantWorkExperienceRead(ApplicantWorkExperienceBase):
    id: int
    class Config:
        from_attributes = True
