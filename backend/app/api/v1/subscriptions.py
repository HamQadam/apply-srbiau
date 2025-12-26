from fastapi import APIRouter, HTTPException
from sqlmodel import select, SQLModel

from app.api.deps import SessionDep, CurrentUser, CurrentUserRequired
from app.models import (
    Applicant,
    ApplicantReadFull,
    ApplicantPreview,
    Subscription,
    SubscriptionRead,
)
from app.services.ghadam import spend_for_view, can_view_applicant, check_subscription

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


class AccessCheckResponse(SQLModel):
    has_access: bool
    is_owner: bool = False
    view_price: int | None = None
    user_balance: int | None = None


class PurchaseAccessResponse(SQLModel):
    success: bool
    message: str
    subscription: SubscriptionRead | None = None
    new_balance: int | None = None


@router.get("/check/{applicant_id}", response_model=AccessCheckResponse)
def check_access(
    applicant_id: int,
    session: SessionDep,
    user: CurrentUser,
):
    """Check if current user has access to view an applicant's full profile."""
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    # Not logged in
    if not user:
        return AccessCheckResponse(
            has_access=applicant.view_price == 0,
            view_price=applicant.view_price,
        )
    
    # Check if owner
    is_owner = applicant.user_id == user.id
    
    # Check access
    has_access = can_view_applicant(session, user, applicant)
    
    return AccessCheckResponse(
        has_access=has_access,
        is_owner=is_owner,
        view_price=applicant.view_price if not has_access else None,
        user_balance=user.ghadam_balance if not has_access else None,
    )


@router.post("/purchase/{applicant_id}", response_model=PurchaseAccessResponse)
def purchase_access(
    applicant_id: int,
    session: SessionDep,
    user: CurrentUserRequired,
):
    """
    Purchase access to view an applicant's full profile.
    
    Deducts ghadams from user's balance and grants full access.
    """
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    # Check if already has access
    if can_view_applicant(session, user, applicant):
        return PurchaseAccessResponse(
            success=True,
            message="شما قبلاً به این پروفایل دسترسی دارید",  # You already have access
        )
    
    # Check balance
    if user.ghadam_balance < applicant.view_price:
        raise HTTPException(
            status_code=400,
            detail=f"موجودی کافی نیست. نیاز: {applicant.view_price} قدم، موجودی: {user.ghadam_balance} قدم",
        )
    
    # Process purchase
    subscription = spend_for_view(session, user, applicant)
    
    if not subscription:
        raise HTTPException(
            status_code=400,
            detail="خطا در پردازش خرید",  # Error processing purchase
        )
    
    # Refresh user to get updated balance
    session.refresh(user)
    
    return PurchaseAccessResponse(
        success=True,
        message=f"دسترسی به پروفایل {applicant.display_name} فعال شد",
        subscription=SubscriptionRead.model_validate(subscription),
        new_balance=user.ghadam_balance,
    )


@router.get("/my-subscriptions", response_model=list[SubscriptionRead])
def get_my_subscriptions(
    session: SessionDep,
    user: CurrentUserRequired,
):
    """Get list of applicants the user has purchased access to."""
    query = (
        select(Subscription)
        .where(Subscription.subscriber_id == user.id)
        .order_by(Subscription.created_at.desc())
    )
    subscriptions = session.exec(query).all()
    return subscriptions


@router.get("/preview/{applicant_id}", response_model=ApplicantPreview)
def get_applicant_preview(
    applicant_id: int,
    session: SessionDep,
):
    """
    Get limited preview of an applicant's profile.
    
    This is free and shows basic info to encourage purchase.
    """
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    return ApplicantPreview(
        id=applicant.id,
        display_name=applicant.display_name,
        university=applicant.university,
        major=applicant.major,
        degree_level=applicant.degree_level,
        graduation_year=applicant.graduation_year,
        is_premium=applicant.is_premium,
        view_price=applicant.view_price,
        total_views=applicant.total_views,
        has_documents=len(applicant.documents) > 0,
        has_applications=len(applicant.applications) > 0,
        application_count=len(applicant.applications),
    )


@router.get("/full/{applicant_id}", response_model=ApplicantReadFull)
def get_applicant_full_with_access_check(
    applicant_id: int,
    session: SessionDep,
    user: CurrentUser,
):
    """
    Get full applicant profile if user has access.
    
    Returns 403 if user doesn't have access.
    """
    applicant = session.get(Applicant, applicant_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    # Check access
    if not can_view_applicant(session, user, applicant):
        raise HTTPException(
            status_code=403,
            detail={
                "message": "برای مشاهده این پروفایل نیاز به خرید دسترسی دارید",
                "view_price": applicant.view_price,
                "user_balance": user.ghadam_balance if user else 0,
            }
        )
    
    return applicant
