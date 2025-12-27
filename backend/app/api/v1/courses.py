from fastapi import APIRouter, HTTPException, Query, Request
from sqlmodel import select, col
from datetime import datetime

from app.api.deps import SessionDep, CurrentUser, CurrentUserRequired
from app.models import (
    Course,
    CourseCreate,
    CourseRead,
    CourseReadWithUniversity,
    CourseUpdate,
    University,
    DegreeLevel,
)
from app.services.course_access import CourseViewTracker

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("/", response_model=CourseRead, status_code=201)
def create_course(
    course: CourseCreate,
    session: SessionDep,
    user: CurrentUserRequired,
):
    """
    Create a new course in the global catalog.

    Requires authentication.
    """
    # Verify university exists
    university = session.get(University, course.university_id)
    if not university:
        raise HTTPException(status_code=404, detail="University not found")

    db_course = Course.model_validate(course)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course


@router.get("/", response_model=list[CourseReadWithUniversity])
def list_courses(
    request: Request,
    session: SessionDep,
    user: CurrentUser,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    university_id: int | None = Query(None, description="Filter by university"),
    degree_level: DegreeLevel | None = Query(None, description="Filter by degree level"),
    country: str | None = Query(None, description="Filter by country"),
    course_name: str | None = Query(None, description="Search by course name"),
):
    """
    List all courses with optional filters.

    Rate limited for unauthenticated users: N courses per 24 hours.
    Authenticated users have unlimited access.
    """
    # Rate limiting check
    client_ip = request.client.host if request.client else "unknown"
    can_view, remaining = CourseViewTracker.can_view_course(session, user, client_ip)

    if not can_view:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "You have reached the limit of free course views. Please sign in to continue.",
                "remaining_views": 0,
                "requires_auth": True,
            },
        )

    query = select(Course)

    if university_id:
        query = query.where(Course.university_id == university_id)
    if degree_level:
        query = query.where(Course.degree_level == degree_level)
    if course_name:
        query = query.where(col(Course.course_name).ilike(f"%{course_name}%"))

    # Filter by country requires join with University
    if country:
        query = query.join(University).where(col(University.country).ilike(f"%{country}%"))

    query = query.offset(skip).limit(limit).order_by(Course.course_name)
    courses = session.exec(query).all()

    # Record view for anonymous users
    if not user:
        CourseViewTracker.record_view(client_ip)

    return courses


@router.get("/check-access", response_model=dict)
def check_course_access(
    request: Request,
    session: SessionDep,
    user: CurrentUser,
):
    """Check how many free course views remaining for this user/IP."""
    client_ip = request.client.host if request.client else "unknown"
    can_view, remaining = CourseViewTracker.can_view_course(session, user, client_ip)

    return {
        "can_view": can_view,
        "remaining_views": remaining if remaining >= 0 else "unlimited",
        "is_authenticated": user is not None,
    }


@router.get("/{course_id}", response_model=CourseReadWithUniversity)
def get_course(
    course_id: int,
    request: Request,
    session: SessionDep,
    user: CurrentUser,
):
    """
    Get a specific course with university details.

    Rate limited for unauthenticated users.
    """
    # Rate limiting check
    client_ip = request.client.host if request.client else "unknown"
    can_view, remaining = CourseViewTracker.can_view_course(session, user, client_ip)

    if not can_view:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "You have reached the limit of free course views. Please sign in to continue.",
                "remaining_views": 0,
                "requires_auth": True,
            },
        )

    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Increment view count
    course.view_count += 1
    session.add(course)
    session.commit()
    session.refresh(course)

    # Record view for anonymous users
    if not user:
        CourseViewTracker.record_view(client_ip)

    return course


@router.patch("/{course_id}", response_model=CourseRead)
def update_course(
    course_id: int,
    updates: CourseUpdate,
    session: SessionDep,
    user: CurrentUserRequired,
):
    """Update a course's information."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = updates.model_dump(exclude_unset=True)

    # If updating university_id, verify it exists
    if "university_id" in update_data:
        university = session.get(University, update_data["university_id"])
        if not university:
            raise HTTPException(status_code=404, detail="University not found")

    for key, value in update_data.items():
        setattr(course, key, value)

    course.updated_at = datetime.utcnow()

    session.add(course)
    session.commit()
    session.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    session: SessionDep,
    user: CurrentUserRequired,
):
    """Delete a course from the catalog."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    session.delete(course)
    session.commit()
