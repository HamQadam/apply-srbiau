from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, col, func

from app.api.deps import SessionDep, CurrentUserRequired
from app.models import (
    Applicant,
    Application,
    ApplicationStatus,
    DegreeLevel,
    ApplicationCreate,
    ApplicationRead,
    ApplicationUpdate,
)
from app.services.ghadam import reward_application_added

router = APIRouter(prefix="/applicants/{applicant_id}/applications", tags=["applications"])


def get_applicant_or_404(applicant_id: int, session: SessionDep) -> Applicant:
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


def verify_ownership(applicant: Applicant, user: CurrentUserRequired):
    """Verify user owns this applicant profile."""
    if applicant.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="شما اجازه ویرایش این پروفایل را ندارید",
        )


@router.post("/", response_model=ApplicationRead, status_code=201)
def add_application(
    applicant_id: int,
    application: ApplicationCreate,
    session: SessionDep,
    user: CurrentUserRequired,
):
    """
    Add a program application.
    
    Awards ghadams for adding an application (more if includes notes).
    """
    applicant = get_applicant_or_404(applicant_id, session)
    verify_ownership(applicant, user)
    
    db_application = Application.model_validate(application, update={"applicant_id": applicant_id})
    session.add(db_application)
    session.commit()
    session.refresh(db_application)
    
    # Award ghadams
    has_notes = bool(application.notes)
    reward_application_added(session, user, db_application.id, has_notes)
    
    return db_application


@router.get("/", response_model=list[ApplicationRead])
def list_applications(
    applicant_id: int,
    session: SessionDep,
    status: ApplicationStatus | None = None,
    year: int | None = None,
):
    """List all applications for an applicant."""
    get_applicant_or_404(applicant_id, session)
    
    query = select(Application).where(Application.applicant_id == applicant_id)
    
    if status:
        query = query.where(Application.status == status)
    if year:
        query = query.where(Application.application_year == year)
    
    return session.exec(query).all()


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(applicant_id: int, application_id: int, session: SessionDep):
    """Get a specific application."""
    application = session.get(Application, application_id)
    if not application or application.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.patch("/{application_id}", response_model=ApplicationRead)
def update_application(
    applicant_id: int,
    application_id: int,
    updates: ApplicationUpdate,
    session: SessionDep,
):
    """Update an application (e.g., when you get a decision)."""
    application = session.get(Application, application_id)
    if not application or application.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Application not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(application, key, value)
    
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


@router.delete("/{application_id}", status_code=204)
def delete_application(applicant_id: int, application_id: int, session: SessionDep):
    """Delete an application."""
    application = session.get(Application, application_id)
    if not application or application.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Application not found")
    
    session.delete(application)
    session.commit()


# Global search and statistics endpoints
search_router = APIRouter(prefix="/applications", tags=["applications"])


@search_router.get("/", response_model=list[ApplicationRead])
def search_applications(
    session: SessionDep,
    university: str | None = Query(None, description="Filter by university name"),
    country: str | None = Query(None, description="Filter by country"),
    program: str | None = Query(None, description="Filter by program name"),
    status: ApplicationStatus | None = None,
    degree_level: DegreeLevel | None = None,
    year: int | None = Query(None, description="Application year"),
    scholarship_received: bool | None = Query(None, description="Filter by scholarship status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Search applications across all applicants. Great for finding success stories!"""
    query = select(Application)
    
    if university:
        query = query.where(col(Application.university_name).ilike(f"%{university}%"))
    if country:
        query = query.where(col(Application.country).ilike(f"%{country}%"))
    if program:
        query = query.where(col(Application.program_name).ilike(f"%{program}%"))
    if status:
        query = query.where(Application.status == status)
    if degree_level:
        query = query.where(Application.degree_level == degree_level)
    if year:
        query = query.where(Application.application_year == year)
    if scholarship_received is not None:
        query = query.where(Application.scholarship_received == scholarship_received)
    
    query = query.offset(skip).limit(limit).order_by(Application.created_at.desc())
    return session.exec(query).all()


@search_router.get("/stats/by-university")
def stats_by_university(
    session: SessionDep,
    year: int | None = None,
):
    """Get application statistics grouped by university."""
    query = select(
        Application.university_name,
        Application.country,
        func.count(Application.id).label("total"),
        func.count(Application.id).filter(Application.status == ApplicationStatus.ACCEPTED).label("accepted"),
        func.count(Application.id).filter(Application.status == ApplicationStatus.REJECTED).label("rejected"),
    ).group_by(Application.university_name, Application.country)
    
    if year:
        query = query.where(Application.application_year == year)
    
    results = session.exec(query).all()
    return [
        {
            "university": r[0],
            "country": r[1],
            "total_applications": r[2],
            "accepted": r[3],
            "rejected": r[4],
            "acceptance_rate": round(r[3] / r[2] * 100, 1) if r[2] > 0 else 0,
        }
        for r in results
    ]


@search_router.get("/stats/by-country")
def stats_by_country(
    session: SessionDep,
    year: int | None = None,
):
    """Get application statistics grouped by country."""
    query = select(
        Application.country,
        func.count(Application.id).label("total"),
        func.count(Application.id).filter(Application.status == ApplicationStatus.ACCEPTED).label("accepted"),
        func.count(Application.id).filter(Application.scholarship_received == True).label("with_scholarship"),
    ).group_by(Application.country)
    
    if year:
        query = query.where(Application.application_year == year)
    
    results = session.exec(query).all()
    return [
        {
            "country": r[0],
            "total_applications": r[1],
            "accepted": r[2],
            "with_scholarship": r[3],
        }
        for r in results
    ]
