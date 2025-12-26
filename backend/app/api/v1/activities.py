from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, col

from app.api.deps import SessionDep
from app.models import (
    Applicant,
    ExtracurricularActivity,
    ActivityType,
    ExtracurricularActivityCreate,
    ExtracurricularActivityRead,
    ExtracurricularActivityUpdate,
)

router = APIRouter(prefix="/applicants/{applicant_id}/activities", tags=["activities"])


def get_applicant_or_404(applicant_id: int, session: SessionDep) -> Applicant:
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


@router.post("/", response_model=ExtracurricularActivityRead, status_code=201)
def add_activity(
    applicant_id: int,
    activity: ExtracurricularActivityCreate,
    session: SessionDep,
):
    """Add an extracurricular activity (work, research, volunteering, etc.)."""
    get_applicant_or_404(applicant_id, session)
    
    db_activity = ExtracurricularActivity.model_validate(activity, update={"applicant_id": applicant_id})
    session.add(db_activity)
    session.commit()
    session.refresh(db_activity)
    return db_activity


@router.get("/", response_model=list[ExtracurricularActivityRead])
def list_activities(
    applicant_id: int,
    session: SessionDep,
    activity_type: ActivityType | None = None,
):
    """List all activities for an applicant."""
    get_applicant_or_404(applicant_id, session)
    
    query = select(ExtracurricularActivity).where(ExtracurricularActivity.applicant_id == applicant_id)
    
    if activity_type:
        query = query.where(ExtracurricularActivity.activity_type == activity_type)
    
    return session.exec(query).all()


@router.get("/{activity_id}", response_model=ExtracurricularActivityRead)
def get_activity(applicant_id: int, activity_id: int, session: SessionDep):
    """Get a specific activity."""
    activity = session.get(ExtracurricularActivity, activity_id)
    if not activity or activity.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity


@router.patch("/{activity_id}", response_model=ExtracurricularActivityRead)
def update_activity(
    applicant_id: int,
    activity_id: int,
    updates: ExtracurricularActivityUpdate,
    session: SessionDep,
):
    """Update an activity."""
    activity = session.get(ExtracurricularActivity, activity_id)
    if not activity or activity.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(activity, key, value)
    
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@router.delete("/{activity_id}", status_code=204)
def delete_activity(applicant_id: int, activity_id: int, session: SessionDep):
    """Delete an activity."""
    activity = session.get(ExtracurricularActivity, activity_id)
    if not activity or activity.applicant_id != applicant_id:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    session.delete(activity)
    session.commit()


# Global search endpoint
search_router = APIRouter(prefix="/activities", tags=["activities"])


@search_router.get("/", response_model=list[ExtracurricularActivityRead])
def search_activities(
    session: SessionDep,
    activity_type: ActivityType | None = None,
    organization: str | None = Query(None, description="Filter by organization name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Search activities across all applicants."""
    query = select(ExtracurricularActivity)
    
    if activity_type:
        query = query.where(ExtracurricularActivity.activity_type == activity_type)
    if organization:
        query = query.where(col(ExtracurricularActivity.organization).ilike(f"%{organization}%"))
    
    query = query.offset(skip).limit(limit)
    return session.exec(query).all()
