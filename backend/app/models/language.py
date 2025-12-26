from datetime import datetime, date
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.applicant import Applicant


class LanguageCredentialBase(SQLModel):
    """Language test scores - IELTS, TOEFL, DELF, etc."""
    language: str = Field(max_length=50, description="English, French, German, etc.")
    test_type: str = Field(max_length=50, description="IELTS, TOEFL, DELF, TestDaF, etc.")
    
    overall_score: str = Field(max_length=20, description="Overall band/score")
    reading_score: Optional[str] = Field(default=None, max_length=20)
    writing_score: Optional[str] = Field(default=None, max_length=20)
    speaking_score: Optional[str] = Field(default=None, max_length=20)
    listening_score: Optional[str] = Field(default=None, max_length=20)
    
    test_date: Optional[date] = Field(default=None)
    valid_until: Optional[date] = Field(default=None, description="Expiry date if applicable")
    notes: Optional[str] = Field(default=None, max_length=500, description="Tips or experience")


class LanguageCredential(LanguageCredentialBase, table=True):
    """Database table for language credentials."""
    __tablename__ = "language_credentials"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="applicants.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    applicant: Optional["Applicant"] = Relationship(back_populates="language_credentials")


class LanguageCredentialCreate(LanguageCredentialBase):
    """Schema for creating language credential."""
    pass


class LanguageCredentialRead(LanguageCredentialBase):
    """Schema for reading language credential."""
    id: int
    applicant_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class LanguageCredentialUpdate(SQLModel):
    """Schema for updating - all optional."""
    language: Optional[str] = None
    test_type: Optional[str] = None
    overall_score: Optional[str] = None
    reading_score: Optional[str] = None
    writing_score: Optional[str] = None
    speaking_score: Optional[str] = None
    listening_score: Optional[str] = None
    test_date: Optional[date] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
