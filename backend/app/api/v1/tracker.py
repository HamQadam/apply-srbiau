"""Tracker API endpoints - user's personal application tracker."""
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, col

from app.database import get_session
from app.models import (
    TrackedProgram,
    TrackedProgramCreate,
    TrackedProgramUpdate,
    TrackedProgramRead,
    TrackerStats,
    ApplicationStatus,
    Priority,
    Course,
    University,
    User,
    DEFAULT_CHECKLIST,
    GhadamTransaction,
    TransactionType,
    FIRST_PROGRAM_BONUS,
    OnboardingStep,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/tracker", tags=["tracker"])


def enrich_tracked_program(tp: TrackedProgram, session: Session) -> TrackedProgramRead:
    """Add course/university data to tracked program response."""
    data = TrackedProgramRead.model_validate(tp)
    
    if tp.course_id and tp.course:
        course = tp.course
        data.program_name = course.name
        data.degree_level = course.degree_level.value
        data.program_deadline = course.deadline_fall
        
        if course.university:
            uni = course.university
            data.university_name = uni.name
            data.country = uni.country
            data.city = uni.city
            data.university_ranking_qs = uni.ranking_qs
    else:
        # Custom entry
        data.program_name = tp.custom_program_name
        data.university_name = tp.custom_university_name
        data.country = tp.custom_country
    
    return data


@router.post("/programs", response_model=TrackedProgramRead)
def add_program(
    data: TrackedProgramCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Add a program to user's tracker."""
    # Validate: either course_id or custom fields
    if not data.course_id and not data.custom_program_name:
        raise HTTPException(
            status_code=400,
            detail="Either course_id or custom_program_name is required"
        )
    
    # If course_id provided, verify it exists
    if data.course_id:
        course = session.get(Course, data.course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Check if already tracking this course
        existing = session.exec(
            select(TrackedProgram)
            .where(TrackedProgram.user_id == current_user.id)
            .where(TrackedProgram.course_id == data.course_id)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already tracking this program")
    
    # Check for duplicate custom entries
    if data.custom_program_name:
        existing = session.exec(
            select(TrackedProgram)
            .where(TrackedProgram.user_id == current_user.id)
            .where(TrackedProgram.custom_program_name == data.custom_program_name)
            .where(TrackedProgram.custom_university_name == data.custom_university_name)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already tracking this program")
    
    # Create tracked program
    tp = TrackedProgram(
        user_id=current_user.id,
        course_id=data.course_id,
        custom_program_name=data.custom_program_name,
        custom_university_name=data.custom_university_name,
        custom_country=data.custom_country,
        custom_deadline=data.custom_deadline,
        priority=data.priority,
        intake=data.intake,
        notes=data.notes,
        deadline=data.custom_deadline,
        document_checklist=[item.copy() for item in DEFAULT_CHECKLIST],
    )
    
    session.add(tp)
    
    # Check if this is user's first program → award bonus
    count = session.exec(
        select(func.count(TrackedProgram.id))
        .where(TrackedProgram.user_id == current_user.id)
    ).one()
    
    if count == 0:  # This is the first one
        # Award Ghadams
        current_user.ghadam_balance += FIRST_PROGRAM_BONUS
        tx = GhadamTransaction(
            user_id=current_user.id,
            transaction_type=TransactionType.FIRST_PROGRAM_BONUS,
            amount=FIRST_PROGRAM_BONUS,
            balance_after=current_user.ghadam_balance,
            description="Added first program to tracker",
        )
        session.add(tx)
        
        # Update onboarding
        if current_user.onboarding_step == OnboardingStep.GOAL_SELECTED:
            current_user.onboarding_step = OnboardingStep.FIRST_PROGRAM_ADDED
    
    session.commit()
    session.refresh(tp)
    
    return enrich_tracked_program(tp, session)


@router.get("/programs", response_model=List[TrackedProgramRead])
def list_programs(
    status: Optional[ApplicationStatus] = None,
    priority: Optional[Priority] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """List all tracked programs for current user."""
    query = (
        select(TrackedProgram)
        .where(TrackedProgram.user_id == current_user.id)
        .order_by(TrackedProgram.created_at.desc())
    )
    
    if status:
        query = query.where(TrackedProgram.status == status)
    if priority:
        query = query.where(TrackedProgram.priority == priority)
    
    programs = session.exec(query).all()
    return [enrich_tracked_program(tp, session) for tp in programs]


@router.get("/programs/{program_id}", response_model=TrackedProgramRead)
def get_program(
    program_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get a single tracked program."""
    tp = session.get(TrackedProgram, program_id)
    if not tp or tp.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Program not found")
    
    return enrich_tracked_program(tp, session)


@router.patch("/programs/{program_id}", response_model=TrackedProgramRead)
def update_program(
    program_id: int,
    data: TrackedProgramUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a tracked program."""
    tp = session.get(TrackedProgram, program_id)
    if not tp or tp.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Program not found")
    
    # Track status changes for potential rewards
    old_status = tp.status
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tp, key, value)
    
    tp.updated_at = datetime.utcnow()
    
    # If status changed to accepted/rejected, prompt to share
    if old_status != tp.status and tp.status in [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED]:
        # Set result_date if not set
        if not tp.result_date:
            tp.result_date = date.today()
    
    session.commit()
    session.refresh(tp)
    
    return enrich_tracked_program(tp, session)


@router.delete("/programs/{program_id}")
def delete_program(
    program_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a program from tracker."""
    tp = session.get(TrackedProgram, program_id)
    if not tp or tp.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Program not found")
    
    session.delete(tp)
    session.commit()
    
    return {"ok": True}


@router.get("/stats", response_model=TrackerStats)
def get_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get user's tracker statistics."""
    programs = session.exec(
        select(TrackedProgram)
        .where(TrackedProgram.user_id == current_user.id)
    ).all()
    
    stats = TrackerStats(
        total_programs=len(programs),
        by_status={},
        by_priority={},
    )
    
    # Count by status
    for status in ApplicationStatus:
        count = len([p for p in programs if p.status == status])
        if count > 0:
            stats.by_status[status.value] = count
    
    # Count by priority
    for priority in Priority:
        count = len([p for p in programs if p.priority == priority])
        if count > 0:
            stats.by_priority[priority.value] = count
    
    stats.accepted_count = len([p for p in programs if p.status == ApplicationStatus.ACCEPTED])
    stats.rejected_count = len([p for p in programs if p.status == ApplicationStatus.REJECTED])
    stats.pending_count = len([p for p in programs if p.status in [
        ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, 
        ApplicationStatus.INTERVIEW, ApplicationStatus.WAITLISTED
    ]])
    
    # Upcoming deadlines (next 30 days)
    today = date.today()
    deadline_cutoff = today + timedelta(days=30)
    stats.upcoming_deadlines = len([
        p for p in programs 
        if p.deadline and today <= p.deadline <= deadline_cutoff
    ])
    
    return stats


@router.get("/deadlines")
def get_deadlines(
    days: int = Query(default=90, ge=1, le=365),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get upcoming deadlines."""
    today = date.today()
    cutoff = today + timedelta(days=days)
    
    programs = session.exec(
        select(TrackedProgram)
        .where(TrackedProgram.user_id == current_user.id)
        .where(TrackedProgram.deadline != None)
        .where(TrackedProgram.deadline >= today)
        .where(TrackedProgram.deadline <= cutoff)
        .order_by(TrackedProgram.deadline)
    ).all()
    
    return [
        {
            "id": tp.id,
            "program_name": tp.custom_program_name or (tp.course.name if tp.course else "Unknown"),
            "university_name": tp.custom_university_name or (tp.course.university.name if tp.course and tp.course.university else "Unknown"),
            "deadline": tp.deadline,
            "days_until": (tp.deadline - today).days,
            "status": tp.status.value,
        }
        for tp in programs
    ]


@router.patch("/programs/{program_id}/checklist")
def update_checklist(
    program_id: int,
    checklist: List[dict],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update document checklist for a program."""
    tp = session.get(TrackedProgram, program_id)
    if not tp or tp.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Program not found")
    
    tp.document_checklist = checklist
    tp.updated_at = datetime.utcnow()
    
    session.commit()
    
    return {"ok": True, "checklist": tp.document_checklist}