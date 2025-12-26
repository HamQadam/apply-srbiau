from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, col

from app.api.deps import SessionDep
from app.models import (
    Applicant,
    LanguageCredential,
    LanguageCredentialCreate,
    LanguageCredentialRead,
    LanguageCredentialUpdate,
)

router = APIRouter(prefix="/applicants/{applicant_id}/languages", tags=["language-credentials"])


def get_applicant_or_404(applicant_id: int, session: SessionDep) -> Applicant:
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


@router.post("/", response_model=LanguageCredentialRead, status_code=201)
def add_language_credential(
    applicant_id: int,
    credential: LanguageCredentialCreate,
    session: SessionDep,
):
    """Add a language test score (IELTS, TOEFL, etc.)."""
    get_applicant_or_404(applicant_id, session)
    
    db_credential = LanguageCredential.model_validate(credential, update={"applicant_id": applicant_id})
    session.add(db_credential)
    session.commit()
    session.refresh(db_credential)
    return db_credential


@router.get("/", response_model=list[LanguageCredentialRead])
def list_language_credentials(applicant_id: int, session: SessionDep):
    """List all language credentials for an applicant."""
    get_applicant_or_404(applicant_id, session)
    
    query = select(LanguageCredential).where(LanguageCredential.applicant_id == applicant_id)
    return session.exec(query).all()


@router.get("/{credential_id}", response_model=LanguageCredentialRead)
def get_language_credential(applicant_id: int, credential_id: int, session: SessionDep):
    """Get a specific language credential."""
    credential = session.get(LanguageCredential, credential_id)
    if not credential or credential.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Language credential not found")
    return credential


@router.patch("/{credential_id}", response_model=LanguageCredentialRead)
def update_language_credential(
    applicant_id: int,
    credential_id: int,
    updates: LanguageCredentialUpdate,
    session: SessionDep,
):
    """Update a language credential."""
    credential = session.get(LanguageCredential, credential_id)
    if not credential or credential.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Language credential not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(credential, key, value)
    
    session.add(credential)
    session.commit()
    session.refresh(credential)
    return credential


@router.delete("/{credential_id}", status_code=204)
def delete_language_credential(applicant_id: int, credential_id: int, session: SessionDep):
    """Delete a language credential."""
    credential = session.get(LanguageCredential, credential_id)
    if not credential or credential.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Language credential not found")
    
    session.delete(credential)
    session.commit()


# Global search endpoint for language credentials
search_router = APIRouter(prefix="/languages", tags=["language-credentials"])


@search_router.get("/", response_model=list[LanguageCredentialRead])
def search_language_credentials(
    session: SessionDep,
    test_type: str | None = Query(None, description="Filter by test type (IELTS, TOEFL, etc.)"),
    language: str | None = Query(None, description="Filter by language"),
    min_score: str | None = Query(None, description="Minimum overall score"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Search language credentials across all applicants."""
    query = select(LanguageCredential)
    
    if test_type:
        query = query.where(col(LanguageCredential.test_type).ilike(f"%{test_type}%"))
    if language:
        query = query.where(col(LanguageCredential.language).ilike(f"%{language}%"))
    
    query = query.offset(skip).limit(limit)
    return session.exec(query).all()
