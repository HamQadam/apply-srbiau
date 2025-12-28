"""University API endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, col

from app.database import get_session
from app.models import (
    University, UniversityCreate, UniversityRead, UniversitySearch,
    Course,
)
from app.services.auth import get_optional_user

router = APIRouter(prefix="/universities", tags=["universities"])


@router.get("", response_model=List[UniversityRead])
def list_universities(
    query: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    max_ranking_qs: Optional[int] = None,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
):
    """List and search universities."""
    stmt = select(University)
    
    if query:
        stmt = stmt.where(
            col(University.name).ilike(f"%{query}%") |
            col(University.city).ilike(f"%{query}%")
        )
    if country:
        stmt = stmt.where(University.country == country)
    if city:
        stmt = stmt.where(University.city == city)
    if max_ranking_qs:
        stmt = stmt.where(University.ranking_qs <= max_ranking_qs)
    
    stmt = stmt.order_by(University.ranking_qs.asc().nullslast(), University.name)
    stmt = stmt.offset(offset).limit(limit)
    
    universities = session.exec(stmt).all()
    
    # Add course count
    result = []
    for uni in universities:
        data = UniversityRead.model_validate(uni)
        data.course_count = len(uni.courses)
        result.append(data)
    
    return result


@router.get("/countries")
def list_countries(
    session: Session = Depends(get_session),
):
    """Get list of countries with universities."""
    countries = session.exec(
        select(University.country, func.count(University.id))
        .group_by(University.country)
        .order_by(func.count(University.id).desc())
    ).all()
    
    return [{"country": c[0], "count": c[1]} for c in countries]


@router.get("/{university_id}", response_model=UniversityRead)
def get_university(
    university_id: int,
    session: Session = Depends(get_session),
):
    """Get a single university."""
    uni = session.get(University, university_id)
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    
    data = UniversityRead.model_validate(uni)
    data.course_count = len(uni.courses)
    return data


@router.get("/{university_id}/courses")
def get_university_courses(
    university_id: int,
    session: Session = Depends(get_session),
):
    """Get courses at a university."""
    uni = session.get(University, university_id)
    if not uni:
        raise HTTPException(status_code=404, detail="University not found")
    
    from app.models import CourseRead
    
    courses = session.exec(
        select(Course)
        .where(Course.university_id == university_id)
        .order_by(Course.name)
    ).all()
    
    result = []
    for course in courses:
        data = CourseRead.model_validate(course)
        data.university_name = uni.name
        data.university_country = uni.country
        data.university_city = uni.city
        data.university_ranking_qs = uni.ranking_qs
        result.append(data)
    
    return result