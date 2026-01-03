"""Matching API - profile wizard and recommendations."""
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from pydantic import BaseModel

from ..deps import get_session, get_current_user
from ...models.user import User, PROFILE_COMPLETION_BONUS
from ...models.ghadam import GhadamTransaction, TransactionType
from ...models.tracked_program import TrackedProgram, DEFAULT_CHECKLIST, Priority
from ...services.matching import MatchingService, get_matching_options

router = APIRouter(prefix="/matching", tags=["matching"])


class MatchingProfileUpdate(BaseModel):
    """Request body for updating matching profile."""
    preferred_fields: List[str] = []
    preferred_countries: List[str] = []
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_degree_level: Optional[str] = None
    target_intake: Optional[str] = None
    language_preference: Optional[str] = None
    gre_score: Optional[int] = None
    gmat_score: Optional[int] = None
    gpa: Optional[float] = None
    gpa_scale: Optional[str] = "4.0"
    prefer_scholarships: bool = False


class QuickProfileRequest(BaseModel):
    """Lightweight profile for quick recommendations."""
    preferred_fields: List[str] = []
    preferred_countries: List[str] = []
    preferred_degree_level: Optional[str] = None
    budget_max: Optional[int] = None


class TrackRecommendationRequest(BaseModel):
    """Request to add a recommendation to tracker."""
    priority: Priority = Priority.TARGET
    intake: Optional[str] = None


@router.get("/options")
def get_wizard_options():
    """Get all available options for the profile wizard."""
    return get_matching_options()


@router.get("/profile")
def get_matching_profile(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get the current user's matching profile."""
    return {
        "profile": current_user.matching_profile or {},
        "completed": current_user.matching_profile_completed
    }


@router.post("/profile")
def save_matching_profile(
    profile_data: MatchingProfileUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Save or update the user's matching profile."""
    # Convert to dict
    profile_dict = profile_data.model_dump(exclude_none=True)
    if "preferred_degree_level" in profile_dict and profile_dict["preferred_degree_level"]:
        profile_dict["preferred_degree_level"] = profile_dict["preferred_degree_level"].strip().upper()

    allowed = {"BACHELOR", "MASTER", "PHD", "DIPLOMA", "CERTIFICATE"}
    lvl = profile_dict.get("preferred_degree_level")
    if lvl and lvl not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid degree level: {lvl}")
    
    # Check if this is first time completing profile
    is_first_completion = not current_user.matching_profile_completed
    
    # Update user
    current_user.matching_profile = profile_dict
    
    # Check if profile is complete enough
    has_fields = len(profile_data.preferred_fields) > 0
    has_countries = len(profile_data.preferred_countries) > 0
    has_level = profile_data.preferred_degree_level is not None
    
    profile_complete = has_fields and has_countries and has_level
    
    if profile_complete:
        current_user.matching_profile_completed = True
        
        # Award bonus coins for first completion
        if is_first_completion:
            current_user.ghadam_balance += PROFILE_COMPLETION_BONUS
            
            # Create transaction record
            transaction = GhadamTransaction(
                user_id=current_user.id,
                transaction_type=TransactionType.PROFILE_COMPLETED,
                amount=PROFILE_COMPLETION_BONUS,
                balance_after=current_user.ghadam_balance,
                description="Bonus for completing matching profile"
            )
            session.add(transaction)
    
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    return {
        "profile": current_user.matching_profile,
        "completed": current_user.matching_profile_completed,
        "bonus_awarded": PROFILE_COMPLETION_BONUS if (is_first_completion and profile_complete) else 0,
        "new_balance": current_user.ghadam_balance
    }


@router.get("/recommendations")
def get_recommendations(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    min_score: int = Query(default=40, ge=0, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get personalized program recommendations based on user profile."""
    if not current_user.matching_profile:
        raise HTTPException(
            status_code=400,
            detail="Please complete your profile first to get recommendations"
        )
    
    matching_service = MatchingService(session)
    recommendations, total = matching_service.get_recommendations(
        user=current_user,
        limit=limit,
        offset=offset,
        min_score=min_score
    )
    
    return {
        "recommendations": recommendations,
        "total": total,
        "limit": limit,
        "offset": offset,
        "profile_summary": {
            "fields": current_user.matching_profile.get("preferred_fields", []),
            "countries": current_user.matching_profile.get("preferred_countries", []),
            "degree_level": current_user.matching_profile.get("preferred_degree_level"),
            "budget_max": current_user.matching_profile.get("budget_max")
        }
    }


@router.post("/quick-recommendations")
def get_quick_recommendations(
    profile: QuickProfileRequest,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Get quick recommendations without authentication.
    Used for preview/demo on landing page.
    """
    matching_service = MatchingService(session)
    recommendations = matching_service.get_quick_recommendations(
        profile=profile.model_dump(),
        limit=5
    )
    
    return {
        "recommendations": recommendations,
        "message": "Sign up to see more personalized recommendations!"
    }


@router.post("/recommendations/{course_id}/track")
def track_recommendation(
    course_id: int,
    request: TrackRecommendationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Add a recommended program to user's tracker."""
    # Check if already tracked
    from sqlmodel import select
    existing = session.exec(
        select(TrackedProgram)
        .where(TrackedProgram.user_id == current_user.id)
        .where(TrackedProgram.course_id == course_id)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This program is already in your tracker"
        )
    
    # Get the course and calculate match score
    from ...models.course import Course
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Calculate match score
    match_score = None
    if current_user.matching_profile:
        matching_service = MatchingService(session)
        match_score, _, _ = matching_service.calculate_match_score(
            course, current_user.matching_profile
        )
    
    # Create tracked program
    tracked = TrackedProgram(
        user_id=current_user.id,
        course_id=course_id,
        priority=request.priority,
        document_checklist=DEFAULT_CHECKLIST,
        match_score=match_score
    )
    
    session.add(tracked)
    session.commit()
    session.refresh(tracked)
    
    return {
        "id": tracked.id,
        "course_id": course_id,
        "match_score": match_score,
        "message": "Program added to your tracker!"
    }
