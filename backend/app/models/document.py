from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

if TYPE_CHECKING:
    from app.models.applicant import Applicant


class DocumentType(str, Enum):
    CV = "cv"
    SOP = "statement_of_purpose"
    MOTIVATION = "motivation_letter"
    RECOMMENDATION = "recommendation_letter"
    TRANSCRIPT = "transcript"
    CERTIFICATE = "certificate"
    PORTFOLIO = "portfolio"
    OTHER = "other"


class DocumentBase(SQLModel):
    """Uploaded documents like CV, SOP, etc."""
    document_type: DocumentType = Field(description="Type of document")
    title: str = Field(max_length=200, description="Display name for the document")
    description: Optional[str] = Field(default=None, max_length=500)
    is_public: bool = Field(default=True, description="Whether others can download")
    
    # For which application/program this was used (optional context)
    used_for_university: Optional[str] = Field(default=None, max_length=200)
    used_for_program: Optional[str] = Field(default=None, max_length=200)


class Document(DocumentBase, table=True):
    """Database table for documents."""
    __tablename__ = "documents"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    applicant_id: int = Field(foreign_key="applicants.id", index=True)
    
    # File storage info
    file_name: str = Field(max_length=255)
    file_path: str = Field(max_length=500)
    file_size: int = Field(description="Size in bytes")
    mime_type: str = Field(max_length=100)
    
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    applicant: Optional["Applicant"] = Relationship(back_populates="documents")


class DocumentCreate(DocumentBase):
    """Schema for creating document metadata."""
    pass


class DocumentRead(DocumentBase):
    """Schema for reading document."""
    id: int
    applicant_id: int
    file_name: str
    file_size: int
    mime_type: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class DocumentUpdate(SQLModel):
    """Schema for updating document metadata."""
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    used_for_university: Optional[str] = None
    used_for_program: Optional[str] = None
