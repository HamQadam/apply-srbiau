from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, col
from datetime import datetime

from app.api.deps import SessionDep, CurrentUserRequired
from app.models import (
    University,
    UniversityCreate,
    UniversityRead,
    UniversityReadWithCourses,
    UniversityUpdate,
)

router = APIRouter(prefix="/universities", tags=["universities"])


@router.post("/", response_model=UniversityRead, status_code=201)
def create_university(
    university: UniversityCreate,
    session: SessionDep,
    user: CurrentUserRequired,
):
    """
    Create a new university.

    Requires authentication. Admin-only in production (add role check if needed).
    """
    # Optional: Add admin check
    # if user.role != UserRole.ADMIN:
    #     raise HTTPException(status_code=403, detail="Admin access required")

    db_university = University.model_validate(university)
    session.add(db_university)
    session.commit()
    session.refresh(db_university)
    return db_university


@router.get("/", response_model=list[UniversityRead])
def list_universities(
    session: SessionDep,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    name: str | None = Query(None, description="Filter by university name"),
    country: str | None = Query(None, description="Filter by country"),
    city: str | None = Query(None, description="Filter by city"),
):
    """List all universities with optional filters."""
    query = select(University)

    if name:
        query = query.where(col(University.name).ilike(f"%{name}%"))
    if country:
        query = query.where(col(University.country).ilike(f"%{country}%"))
    if city:
        query = query.where(col(University.city).ilike(f"%{city}%"))

    query = query.offset(skip).limit(limit).order_by(University.name)
    return session.exec(query).all()


@router.get("/{university_id}", response_model=UniversityRead)
def get_university(university_id: int, session: SessionDep):
    """Get a specific university by ID."""
    university = session.get(University, university_id)
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    return university


@router.get("/{university_id}/with-courses", response_model=UniversityReadWithCourses)
def get_university_with_courses(university_id: int, session: SessionDep):
    """Get a university with all its courses."""
    university = session.get(University, university_id)
    if not university:
        raise HTTPException(status_code=404, detail="University not found")
    return university


@router.patch("/{university_id}", response_model=UniversityRead)
def update_university(
    university_id: int,
    updates: UniversityUpdate,
    session: SessionDep,
    user: CurrentUserRequired,
):
    """Update a university's information."""
    university = session.get(University, university_id)
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(university, key, value)

    university.updated_at = datetime.utcnow()

    session.add(university)
    session.commit()
    session.refresh(university)
    return university


@router.delete("/{university_id}", status_code=204)
def delete_university(
    university_id: int,
    session: SessionDep,
    user: CurrentUserRequired,
):
    """Delete a university (admin only recommended)."""
    # Optional: Add admin check
    # if user.role != UserRole.ADMIN:
    #     raise HTTPException(status_code=403, detail="Admin access required")

    university = session.get(University, university_id)
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    # Check if university has courses or applications
    if len(university.courses) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete university with {len(university.courses)} courses. Delete courses first.",
        )
    if len(university.applications) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete university with {len(university.applications)} applications.",
        )

    session.delete(university)
    session.commit()
