"""Matching API - profile wizard and recommendations."""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..deps import get_session, get_current_user
from ...models.ghadam import GhadamTransaction, TransactionType
from ...models.matching_profile import MatchingProfileModel
from ...models.tracked_program import DEFAULT_CHECKLIST, IntakePeriod, Priority, TrackedProgram
from ...models.user import PROFILE_COMPLETION_BONUS, User
from ...services.matching import MatchingService, get_matching_options, normalize_profile

router = APIRouter(prefix="/matching", tags=["matching"])


class MatchingProfileUpdate(MatchingProfileModel):
    """Request body for updating matching profile."""


class QuickProfileRequest(MatchingProfileModel):
    """Lightweight profile for quick recommendations."""


class TrackRecommendationRequest(MatchingProfileModel):
    """Request to add a recommendation to tracker."""
    priority: Priority = Priority.TARGET
    intake: Optional[IntakePeriod] = None


@router.get("/options")
def get_wizard_options():
    """Get all available options for the profile wizard."""
    return get_matching_options()


@router.get("/profile")
def get_matching_profile(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Get the current user's validated matching profile."""
    profile = normalize_profile(current_user.matching_profile).to_storage_dict() if current_user.matching_profile else {}
    return {
        "profile": profile,
        "completed": current_user.matching_profile_completed,
    }


@router.post("/profile")
def save_matching_profile(
    profile_data: MatchingProfileUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Save or update the user's typed matching profile."""
    profile_dict = profile_data.to_storage_dict()
    is_first_completion = not current_user.matching_profile_completed

    current_user.matching_profile = profile_dict
    profile_complete = profile_data.is_complete

    if profile_complete:
        current_user.matching_profile_completed = True
        if is_first_completion:
            current_user.ghadam_balance += PROFILE_COMPLETION_BONUS
            transaction = GhadamTransaction(
                user_id=current_user.id,
                transaction_type=TransactionType.PROFILE_COMPLETED,
                amount=PROFILE_COMPLETION_BONUS,
                balance_after=current_user.ghadam_balance,
                description="Bonus for completing matching profile",
            )
            session.add(transaction)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return {
        "profile": current_user.matching_profile,
        "completed": current_user.matching_profile_completed,
        "bonus_awarded": PROFILE_COMPLETION_BONUS if (is_first_completion and profile_complete) else 0,
        "new_balance": current_user.ghadam_balance,
    }


@router.get("/recommendations")
def get_recommendations(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    min_score: int = Query(default=40, ge=0, le=100),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Get personalized program recommendations based on user profile."""
    if not current_user.matching_profile:
        raise HTTPException(status_code=400, detail="Please complete your profile first to get recommendations")

    profile = normalize_profile(current_user.matching_profile)
    matching_service = MatchingService(session)
    recommendations, total, refinements, result_threshold = matching_service.get_recommendations(
        user=current_user,
        limit=limit,
        offset=offset,
        min_score=min_score,
    )

    return {
        "recommendations": recommendations,
        "total": total,
        "limit": limit,
        "offset": offset,
        "profile_summary": {
            "fields": profile.preferred_fields,
            "countries": profile.preferred_countries,
            "degree_level": profile.preferred_degree_level,
            "budget_max": profile.budget_max,
            "budget_currency": profile.budget_currency,
            "budget_max_eur": profile.budget_max_eur,
            "language_preference": profile.language_preference,
            "gpa": profile.gpa,
            "gpa_scale": profile.gpa_scale,
        },
        "refinement_prompts": refinements,
        "result_threshold": result_threshold,
    }


@router.post("/quick-recommendations")
def get_quick_recommendations(
    profile: QuickProfileRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get quick recommendations without authentication."""
    matching_service = MatchingService(session)
    recommendations = matching_service.get_quick_recommendations(profile=profile.to_storage_dict(), limit=5)
    return {
        "recommendations": recommendations,
        "message": "Sign up to see more personalized recommendations!",
    }


@router.post("/recommendations/{course_id}/track")
def track_recommendation(
    course_id: int,
    request: TrackRecommendationRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Add a recommended program to user's tracker and persist recommendation context."""
    existing = session.exec(
        select(TrackedProgram)
        .where(TrackedProgram.user_id == current_user.id)
        .where(TrackedProgram.course_id == course_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This program is already in your tracker")

    from ...models.course import Course

    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    profile = normalize_profile(current_user.matching_profile) if current_user.matching_profile else request
    matching_service = MatchingService(session)
    match_details = matching_service.calculate_match_details(course, profile)
    profile_snapshot = profile.to_storage_dict()
    recommendation_snapshot = {
        "course_id": course_id,
        "match_score": match_details["score"],
        "match_reasons": match_details["match_reasons"],
        "warnings": match_details["warnings"],
        "match_explanations": match_details["match_explanations"],
        "profile": profile_snapshot,
    }

    tracked = TrackedProgram(
        user_id=current_user.id,
        course_id=course_id,
        priority=request.priority,
        intake=request.intake,
        document_checklist=[item.copy() for item in DEFAULT_CHECKLIST],
        match_score=match_details["score"],
        match_reasons=match_details["match_reasons"],
        match_warnings=match_details["warnings"],
        matching_profile_snapshot=profile_snapshot,
        recommendation_snapshot=recommendation_snapshot,
    )

    session.add(tracked)
    session.commit()
    session.refresh(tracked)

    return {
        "id": tracked.id,
        "course_id": course_id,
        "match_score": tracked.match_score,
        "match_reasons": tracked.match_reasons,
        "warnings": tracked.match_warnings,
        "recommendation_snapshot": tracked.recommendation_snapshot,
        "message": "Program added to your tracker!",
    }
