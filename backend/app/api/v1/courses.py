"""Course/Program API endpoints with pagination and multi-select filters."""
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, col

from app.database import get_session
from app.models import (
    Course, CourseCreate, CourseRead, CourseSearch, CourseSummary,
    University, DegreeLevel, TeachingLanguage,
    CourseLanguageRequirement, CourseLanguageRequirementRead,
)
from app.services.auth import get_optional_user

router = APIRouter(prefix="/courses", tags=["courses"])


def enrich_course(course: Course) -> CourseRead:
    """Add university data to course response."""
    data = CourseRead.model_validate(course)
    if course.university:
        data.university_name = course.university.name
        data.university_country = course.university.country
        data.university_city = course.university.city
        data.university_ranking_qs = course.university.ranking_qs
    return data


@router.get("")
def search_courses(
    query: Optional[str] = None,
    field: Optional[str] = None,
    fields: Optional[List[str]] = Query(default=None, description="Multiple fields filter"),
    degree_level: Optional[DegreeLevel] = None,
    country: Optional[str] = None,
    countries: Optional[List[str]] = Query(default=None, description="Multiple countries filter"),
    teaching_language: Optional[TeachingLanguage] = None,
    max_tuition: Optional[int] = None,
    tuition_free_only: bool = False,
    scholarships_only: bool = False,
    gre_not_required: bool = False,
    deadline_after: Optional[date] = None,
    deadline_before: Optional[date] = None,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
):
    """Search and filter courses with pagination."""
    # Build base query
    stmt = select(Course).join(University)
    count_stmt = select(func.count(Course.id)).join(University)
    
    # Text search
    if query:
        search_filter = (
            col(Course.name).ilike(f"%{query}%") |
            col(Course.field).ilike(f"%{query}%") |
            col(University.name).ilike(f"%{query}%")
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)
    
    # Field filter - support both single and multiple
    if fields and len(fields) > 0:
        field_filter = col(Course.field).in_(fields)
        stmt = stmt.where(field_filter)
        count_stmt = count_stmt.where(field_filter)
    elif field:
        field_filter = col(Course.field).ilike(f"%{field}%")
        stmt = stmt.where(field_filter)
        count_stmt = count_stmt.where(field_filter)
    
    # Country filter - support both single and multiple
    if countries and len(countries) > 0:
        country_filter = University.country.in_(countries)
        stmt = stmt.where(country_filter)
        count_stmt = count_stmt.where(country_filter)
    elif country:
        country_filter = University.country == country
        stmt = stmt.where(country_filter)
        count_stmt = count_stmt.where(country_filter)
    
    # Degree level
    if degree_level:
        stmt = stmt.where(Course.degree_level == degree_level)
        count_stmt = count_stmt.where(Course.degree_level == degree_level)
    
    # Teaching language
    if teaching_language:
        stmt = stmt.where(Course.teaching_language == teaching_language)
        count_stmt = count_stmt.where(Course.teaching_language == teaching_language)
    
    # Tuition filters
    if tuition_free_only:
        stmt = stmt.where(Course.is_tuition_free == True)
        count_stmt = count_stmt.where(Course.is_tuition_free == True)
    if max_tuition:
        tuition_filter = (Course.is_tuition_free == True) | (Course.tuition_fee_amount <= max_tuition)
        stmt = stmt.where(tuition_filter)
        count_stmt = count_stmt.where(tuition_filter)
    
    # Scholarships
    if scholarships_only:
        stmt = stmt.where(Course.scholarships_available == True)
        count_stmt = count_stmt.where(Course.scholarships_available == True)
    
    # GRE requirement
    if gre_not_required:
        stmt = stmt.where(Course.gre_required == False)
        count_stmt = count_stmt.where(Course.gre_required == False)
    
    # Deadline filters
    if deadline_after:
        stmt = stmt.where(Course.deadline_fall >= deadline_after)
        count_stmt = count_stmt.where(Course.deadline_fall >= deadline_after)
    if deadline_before:
        stmt = stmt.where(Course.deadline_fall <= deadline_before)
        count_stmt = count_stmt.where(Course.deadline_fall <= deadline_before)
    
    # Get total count
    total = session.exec(count_stmt).one()
    
    # Apply ordering and pagination
    stmt = stmt.order_by(University.ranking_qs.asc().nullslast(), Course.name)
    stmt = stmt.offset(offset).limit(limit)
    
    courses = session.exec(stmt).all()
    
    return {
        "courses": [enrich_course(c) for c in courses],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/autocomplete", response_model=List[CourseSummary])
def autocomplete_courses(
    q: str = Query(min_length=2),
    limit: int = Query(default=10, le=20),
    session: Session = Depends(get_session),
):
    """Autocomplete search for courses (for tracker add flow)."""
    stmt = (
        select(Course)
        .join(University)
        .where(
            col(Course.name).ilike(f"%{q}%") |
            col(University.name).ilike(f"%{q}%")
        )
        .order_by(University.ranking_qs.asc().nullslast())
        .limit(limit)
    )
    
    courses = session.exec(stmt).all()
    
    return [
        CourseSummary(
            id=c.id,
            name=c.name,
            degree_level=c.degree_level,
            university_name=c.university.name if c.university else "Unknown",
            university_country=c.university.country if c.university else "Unknown",
            deadline_fall=c.deadline_fall,
        )
        for c in courses
    ]


@router.get("/fields")
def list_fields(
    min_count: int = Query(default=1, ge=1, description="Minimum number of courses in a field"),
    session: Session = Depends(get_session),
):
    """Get list of fields/disciplines with course count, filtered by minimum count."""
    fields = session.exec(
        select(Course.field, func.count(Course.id).label("count"))
        .group_by(Course.field)
        .having(func.count(Course.id) >= min_count)
        .order_by(func.count(Course.id).desc())
    ).all()
    
    return [{"field": f[0], "count": f[1]} for f in fields]


@router.get("/{course_id}", response_model=CourseRead)
def get_course(
    course_id: int,
    session: Session = Depends(get_session),
):
    """Get a single course with details."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Increment view count
    course.view_count += 1
    session.commit()
    
    return enrich_course(course)


@router.get("/{course_id}/language-requirements", response_model=List[CourseLanguageRequirementRead])
def get_course_language_requirements(
    course_id: int,
    session: Session = Depends(get_session),
):
    """Get language requirements for a course."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    reqs = session.exec(
        select(CourseLanguageRequirement)
        .where(CourseLanguageRequirement.course_id == course_id)
    ).all()
    
    return [CourseLanguageRequirementRead.model_validate(r) for r in reqs]


@router.get("/{course_id}/stats")
def get_course_stats(
    course_id: int,
    session: Session = Depends(get_session),
):
    """Get application stats for a course (from shared profiles)."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    from app.models import TrackedProgram, ApplicationStatus
    
    tracked = session.exec(
        select(TrackedProgram)
        .where(TrackedProgram.course_id == course_id)
        .where(TrackedProgram.shared_as_experience == True)
    ).all()
    
    total = len(tracked)
    accepted = len([t for t in tracked if t.status == ApplicationStatus.ACCEPTED])
    rejected = len([t for t in tracked if t.status == ApplicationStatus.REJECTED])
    
    return {
        "course_id": course_id,
        "total_applications": total,
        "accepted": accepted,
        "rejected": rejected,
        "acceptance_rate": round(accepted / total * 100, 1) if total > 0 else None,
    }