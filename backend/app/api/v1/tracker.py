from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, func

from app.api.deps import SessionDep, CurrentUserRequired
from app.models import (
    TrackedProgram,
    TrackedProgramCreate,
    TrackedProgramRead,
    TrackedProgramUpdate,
    Course,
    University,
)

router = APIRouter(prefix="/tracker", tags=["tracker"])


def _ensure_owner(tracked: TrackedProgram | None, user_id: int) -> TrackedProgram:
    if not tracked:
        raise HTTPException(status_code=404, detail="Tracked program not found")
    if tracked.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return tracked


@router.post("/programs", response_model=TrackedProgramRead)
def create_tracked_program(
    data: TrackedProgramCreate,
    session: SessionDep,
    current_user: CurrentUserRequired,
):
    # Must provide either a course_id (catalog) or custom fields
    if not data.course_id and not (data.custom_program_name and data.university_name and data.country):
        raise HTTPException(
            status_code=422,
            detail="Provide either course_id OR (custom_program_name + university_name + country)",
        )

    course_name = None
    university_name = data.university_name
    country = data.country

    if data.course_id:
        course = session.get(Course, data.course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

        uni = session.get(University, course.university_id)
        if not uni:
            raise HTTPException(status_code=404, detail="University not found for course")

        course_name = course.course_name
        university_name = university_name or uni.name
        country = country or uni.country

    tracked = TrackedProgram(
        user_id=current_user.id,
        course_id=data.course_id,
        custom_program_name=data.custom_program_name,
        university_name=university_name or "",
        country=country or "",
        deadline=data.deadline,
        status=data.status,
        submitted_date=data.submitted_date,
        result_date=data.result_date,
        notes=data.notes,
        priority=data.priority,
        documents_checklist=data.documents_checklist,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    session.add(tracked)
    session.commit()
    session.refresh(tracked)

    if tracked.course_id and tracked.course:
        course_name = tracked.course.course_name

    return TrackedProgramRead(**tracked.model_dump(), course_name=course_name)


@router.get("/programs", response_model=list[TrackedProgramRead])
def list_tracked_programs(
    session: SessionDep,
    current_user: CurrentUserRequired,
    status: str | None = Query(default=None),
):
    stmt = select(TrackedProgram).where(TrackedProgram.user_id == current_user.id)

    if status:
        stmt = stmt.where(TrackedProgram.status == status)

    stmt = stmt.order_by(TrackedProgram.deadline.is_(None), TrackedProgram.deadline.asc(), TrackedProgram.id.desc())
    items = session.exec(stmt).all()

    result: list[TrackedProgramRead] = []
    for p in items:
        course_name = p.course.course_name if p.course_id and p.course else None
        result.append(TrackedProgramRead(**p.model_dump(), course_name=course_name))
    return result


@router.get("/programs/{program_id}", response_model=TrackedProgramRead)
def get_tracked_program(
    program_id: int,
    session: SessionDep,
    current_user: CurrentUserRequired,
):
    tracked = _ensure_owner(session.get(TrackedProgram, program_id), current_user.id)
    course_name = tracked.course.course_name if tracked.course_id and tracked.course else None
    return TrackedProgramRead(**tracked.model_dump(), course_name=course_name)


@router.patch("/programs/{program_id}", response_model=TrackedProgramRead)
def update_tracked_program(
    program_id: int,
    patch: TrackedProgramUpdate,
    session: SessionDep,
    current_user: CurrentUserRequired,
):
    tracked = _ensure_owner(session.get(TrackedProgram, program_id), current_user.id)

    data = patch.model_dump(exclude_unset=True)

    # If switching course_id, re-infer university/country unless explicitly provided
    if "course_id" in data and data["course_id"] is not None:
        course = session.get(Course, data["course_id"])
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        uni = session.get(University, course.university_id)
        if not uni:
            raise HTTPException(status_code=404, detail="University not found for course")

        if "university_name" not in data or data.get("university_name") is None:
            data["university_name"] = uni.name
        if "country" not in data or data.get("country") is None:
            data["country"] = uni.country

        # Keep custom_program_name empty if using catalog
        if "custom_program_name" not in data:
            tracked.custom_program_name = None

    for k, v in data.items():
        setattr(tracked, k, v)

    tracked.updated_at = datetime.utcnow()
    session.add(tracked)
    session.commit()
    session.refresh(tracked)

    course_name = tracked.course.course_name if tracked.course_id and tracked.course else None
    return TrackedProgramRead(**tracked.model_dump(), course_name=course_name)


@router.delete("/programs/{program_id}", status_code=204)
def delete_tracked_program(
    program_id: int,
    session: SessionDep,
    current_user: CurrentUserRequired,
):
    tracked = _ensure_owner(session.get(TrackedProgram, program_id), current_user.id)
    session.delete(tracked)
    session.commit()
    return None


@router.get("/stats")
def tracker_stats(
    session: SessionDep,
    current_user: CurrentUserRequired,
    days: int = Query(default=30, ge=1, le=365),
):
    total = session.exec(
        select(func.count()).select_from(TrackedProgram).where(TrackedProgram.user_id == current_user.id)
    ).one()

    rows = session.exec(
        select(TrackedProgram.status, func.count())
        .where(TrackedProgram.user_id == current_user.id)
        .group_by(TrackedProgram.status)
    ).all()

    by_status = {str(status): count for status, count in rows}

    today = date.today()
    until = today + timedelta(days=days)
    upcoming = session.exec(
        select(func.count())
        .select_from(TrackedProgram)
        .where(TrackedProgram.user_id == current_user.id)
        .where(TrackedProgram.deadline.is_not(None))
        .where(TrackedProgram.deadline >= today)
        .where(TrackedProgram.deadline <= until)
    ).one()

    return {
        "total": total,
        "by_status": by_status,
        "upcoming_deadlines": upcoming,
        "window_days": days,
    }


@router.get("/deadlines", response_model=list[TrackedProgramRead])
def upcoming_deadlines(
    session: SessionDep,
    current_user: CurrentUserRequired,
    days: int = Query(default=30, ge=1, le=365),
):
    today = date.today()
    until = today + timedelta(days=days)

    stmt = (
        select(TrackedProgram)
        .where(TrackedProgram.user_id == current_user.id)
        .where(TrackedProgram.deadline.is_not(None))
        .where(TrackedProgram.deadline >= today)
        .where(TrackedProgram.deadline <= until)
        .order_by(TrackedProgram.deadline.asc())
    )

    items = session.exec(stmt).all()

    result: list[TrackedProgramRead] = []
    for p in items:
        course_name = p.course.course_name if p.course_id and p.course else None
        result.append(TrackedProgramRead(**p.model_dump(), course_name=course_name))
    return result


@router.post("/programs/{program_id}/checklist", response_model=TrackedProgramRead)
def update_checklist(
    program_id: int,
    payload: dict,
    session: SessionDep,
    current_user: CurrentUserRequired,
):
    tracked = _ensure_owner(session.get(TrackedProgram, program_id), current_user.id)
    items = payload.get("items")
    if items is None or not isinstance(items, list):
        raise HTTPException(status_code=422, detail="Payload must include 'items' as a list")

    tracked.documents_checklist = items
    tracked.updated_at = datetime.utcnow()

    session.add(tracked)
    session.commit()
    session.refresh(tracked)

    course_name = tracked.course.course_name if tracked.course_id and tracked.course else None
    return TrackedProgramRead(**tracked.model_dump(), course_name=course_name)
