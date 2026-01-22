from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Enum as SAEnum, JSON

if TYPE_CHECKING:
    from app.models.applicant import Applicant


class LanguageTestType(str, Enum):
    IELTS = "ielts"
    TOEFL = "toefl"


class ApplicantLanguageTestBase(SQLModel):
    test_type: LanguageTestType = Field(sa_column=Column(SAEnum(LanguageTestType)))
    taken_at: Optional[date] = None
    expires_at: Optional[date] = None

    overall_score: Optional[float] = None
    details: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class ApplicantLanguageTest(ApplicantLanguageTestBase, table=True):
    __tablename__ = "applicant_language_tests"

    id: Optional[int] = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="applicants.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    applicant: Optional["Applicant"] = Relationship(back_populates="language_tests")


class ApplicantLanguageTestRead(ApplicantLanguageTestBase):
    id: int
    class Config:
        from_attributes = True
