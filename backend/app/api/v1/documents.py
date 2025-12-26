from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlmodel import select, col

from app.api.deps import SessionDep
from app.models import (
    Applicant,
    Document,
    DocumentType,
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
)
from app.services.file_storage import save_upload, delete_file, get_file_path

router = APIRouter(prefix="/applicants/{applicant_id}/documents", tags=["documents"])


def get_applicant_or_404(applicant_id: int, session: SessionDep) -> Applicant:
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


@router.post("/", response_model=DocumentRead, status_code=201)
async def upload_document(
    applicant_id: int,
    session: SessionDep,
    file: UploadFile = File(...),
    document_type: DocumentType = Form(...),
    title: str = Form(...),
    description: str | None = Form(None),
    is_public: bool = Form(True),
    used_for_university: str | None = Form(None),
    used_for_program: str | None = Form(None),
):
    """Upload a document (CV, SOP, etc.)."""
    get_applicant_or_404(applicant_id, session)
    
    # Save file to disk
    file_name, file_path, file_size, mime_type = await save_upload(file, applicant_id)
    
    # Create database record
    db_document = Document(
        applicant_id=applicant_id,
        document_type=document_type,
        title=title,
        description=description,
        is_public=is_public,
        used_for_university=used_for_university,
        used_for_program=used_for_program,
        file_name=file_name,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type,
    )
    
    session.add(db_document)
    session.commit()
    session.refresh(db_document)
    return db_document


@router.get("/", response_model=list[DocumentRead])
def list_documents(applicant_id: int, session: SessionDep):
    """List all documents for an applicant."""
    get_applicant_or_404(applicant_id, session)
    
    query = select(Document).where(Document.applicant_id == applicant_id)
    return session.exec(query).all()


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(applicant_id: int, document_id: int, session: SessionDep):
    """Get document metadata."""
    document = session.get(Document, document_id)
    if not document or document.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("/{document_id}/download")
def download_document(applicant_id: int, document_id: int, session: SessionDep):
    """Download a document file."""
    document = session.get(Document, document_id)
    if not document or document.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.is_public:
        raise HTTPException(status_code=403, detail="This document is not public")
    
    file_path = get_file_path(document.file_path)
    return FileResponse(
        path=file_path,
        filename=document.file_name,
        media_type=document.mime_type,
    )


@router.patch("/{document_id}", response_model=DocumentRead)
def update_document(
    applicant_id: int,
    document_id: int,
    updates: DocumentUpdate,
    session: SessionDep,
):
    """Update document metadata."""
    document = session.get(Document, document_id)
    if not document or document.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(document, key, value)
    
    session.add(document)
    session.commit()
    session.refresh(document)
    return document


@router.delete("/{document_id}", status_code=204)
async def delete_document(applicant_id: int, document_id: int, session: SessionDep):
    """Delete a document."""
    document = session.get(Document, document_id)
    if not document or document.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from disk
    await delete_file(document.file_path)
    
    session.delete(document)
    session.commit()


# Global search endpoint
search_router = APIRouter(prefix="/documents", tags=["documents"])


@search_router.get("/", response_model=list[DocumentRead])
def search_documents(
    session: SessionDep,
    document_type: DocumentType | None = None,
    university: str | None = Query(None, description="Filter by target university"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Search public documents across all applicants."""
    query = select(Document).where(Document.is_public == True)
    
    if document_type:
        query = query.where(Document.document_type == document_type)
    if university:
        query = query.where(col(Document.used_for_university).ilike(f"%{university}%"))
    
    query = query.offset(skip).limit(limit)
    return session.exec(query).all()
