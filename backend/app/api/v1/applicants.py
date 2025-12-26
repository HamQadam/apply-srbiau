from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, col

from app.api.deps import SessionDep, CurrentUser, CurrentUserRequired
from app.models import (
    Applicant,
    ApplicantCreate,
    ApplicantRead,
    ApplicantReadFull,
    ApplicantPreview,
    ApplicantUpdate,
    UserRole,
)
from app.services.ghadam import reward_profile_created, can_view_applicant

router = APIRouter(prefix="/applicants", tags=["applicants"])


@router.post("/", response_model=ApplicantRead, status_code=201)
def create_applicant(
    applicant: ApplicantCreate, 
    session: SessionDep,
    user: CurrentUserRequired,
):
    """
    Create a new applicant profile to share your journey.
    
    Requires authentication. Awards ghadams for creating a profile.
    """
    # Check if user already has an applicant profile
    existing = session.exec(
        select(Applicant).where(Applicant.user_id == user.id)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="شما قبلاً پروفایل متقاضی ایجاد کرده‌اید",  # You already have a profile
        )
    
    # Create applicant linked to user
    db_applicant = Applicant.model_validate(applicant, update={"user_id": user.id})
    session.add(db_applicant)
    session.commit()
    session.refresh(db_applicant)
    
    # Award ghadams for creating profile
    reward_profile_created(session, user, db_applicant)
    
    return db_applicant


@router.get("/", response_model=list[ApplicantRead])
def list_applicants(
    session: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    university: str | None = None,
    major: str | None = None,
    graduation_year: int | None = None,
):
    """List all applicant profiles. Filter by university, major, or year."""
    query = select(Applicant)
    
    if university:
        query = query.where(col(Applicant.university).ilike(f"%{university}%"))
    if major:
        query = query.where(col(Applicant.major).ilike(f"%{major}%"))
    if graduation_year:
        query = query.where(Applicant.graduation_year == graduation_year)
    
    query = query.offset(skip).limit(limit).order_by(Applicant.created_at.desc())
    return session.exec(query).all()


@router.get("/{applicant_id}", response_model=ApplicantRead)
def get_applicant(applicant_id: int, session: SessionDep):
    """Get a specific applicant's basic profile."""
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


@router.get("/{applicant_id}/full", response_model=ApplicantReadFull)
def get_applicant_full(applicant_id: int, session: SessionDep, user: CurrentUser):
    """
    Get a complete applicant profile with all related data.
    
    Requires access (ownership, subscription, or free profile).
    """
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    # Check access
    if not can_view_applicant(session, user, applicant):
        raise HTTPException(
            status_code=403,
            detail={
                "message": "برای مشاهده این پروفایل نیاز به خرید دسترسی دارید",
                "view_price": applicant.view_price,
            }
        )
    
    return applicant


@router.get("/{applicant_id}/preview", response_model=ApplicantPreview)
def get_applicant_preview(applicant_id: int, session: SessionDep):
    """Get limited preview of an applicant (free, no auth required)."""
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    return ApplicantPreview(
        id=applicant.id,
        display_name=applicant.display_name,
        university=applicant.university,
        major=applicant.major,
        degree_level=applicant.degree_level,
        graduation_year=applicant.graduation_year,
        is_premium=applicant.is_premium,
        view_price=applicant.view_price,
        total_views=applicant.total_views,
        has_documents=len(applicant.documents) > 0,
        has_applications=len(applicant.applications) > 0,
        application_count=len(applicant.applications),
    )


@router.patch("/{applicant_id}", response_model=ApplicantRead)
def update_applicant(applicant_id: int, updates: ApplicantUpdate, session: SessionDep):
    """Update an applicant's profile."""
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(applicant, key, value)
    
    session.add(applicant)
    session.commit()
    session.refresh(applicant)
    return applicant


@router.delete("/{applicant_id}", status_code=204)
def delete_applicant(applicant_id: int, session: SessionDep):
    """Delete an applicant and all their data."""
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    session.delete(applicant)
    session.commit()
