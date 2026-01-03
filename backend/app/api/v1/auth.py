"""Authentication API endpoints."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.services.google_oauth import exchange_code_for_tokens, verify_google_id_token
from app.services.google_oauth import get_or_create_user_from_google  # if you placed it there
from app.services.auth import create_access_token

from app.database import get_session
from app.models import (
    User, UserRead, UserUpdate, UserOnboarding, 
    OnboardingStep, GhadamTransaction, TransactionType,
    SIGNUP_BONUS_GHADAMS, COMPLETE_ONBOARDING_BONUS,
)
from app.services.auth import (
    create_otp, verify_otp, create_access_token, get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class RequestOTPRequest(BaseModel):
    phone: str


class RequestOTPResponse(BaseModel):
    message: str
    debug_code: str | None = None  # Only in debug mode


class VerifyOTPRequest(BaseModel):
    phone: str
    code: str


class VerifyOTPResponse(BaseModel):
    token: str
    user: UserRead
    is_new_user: bool


@router.post("/request-otp", response_model=RequestOTPResponse)
def request_otp(
    data: RequestOTPRequest,
    session: Session = Depends(get_session),
):
    """Request OTP code for phone number."""
    # Normalize phone number
    phone = data.phone.strip().replace(" ", "")
    
    # Create OTP
    code = create_otp(session, phone)
    
    # In production: send SMS via Kavenegar/Twilio
    # For now, return code in debug mode
    from app.config import get_settings
    settings = get_settings()
    
    return RequestOTPResponse(
        message="OTP sent successfully",
        debug_code=code if settings.debug_otp else None,
    )


@router.post("/verify-otp", response_model=VerifyOTPResponse)
def verify_otp_endpoint(
    data: VerifyOTPRequest,
    session: Session = Depends(get_session),
):
    """Verify OTP and return JWT token."""
    phone = data.phone.strip().replace(" ", "")
    
    if not verify_otp(session, phone, data.code):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    # Find or create user
    user = session.exec(
        select(User).where(User.phone == phone)
    ).first()
    
    is_new_user = False
    
    if not user:
        is_new_user = True
        user = User(
            phone=phone,
            ghadam_balance=SIGNUP_BONUS_GHADAMS,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        
        # Record signup bonus transaction
        tx = GhadamTransaction(
            user_id=user.id,
            transaction_type=TransactionType.SIGNUP_BONUS,
            amount=SIGNUP_BONUS_GHADAMS,
            balance_after=user.ghadam_balance,
            description="Welcome bonus!",
        )
        session.add(tx)
        session.commit()
    
    # Create token
    token = create_access_token(user.id)
    
    return VerifyOTPResponse(
        token=token,
        user=UserRead.model_validate(user),
        is_new_user=is_new_user,
    )


@router.get("/me", response_model=UserRead)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """Get current user profile."""
    return UserRead.model_validate(current_user)


@router.patch("/me", response_model=UserRead)
def update_me(
    data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update current user profile."""
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    current_user.updated_at = datetime.utcnow()
    session.commit()
    session.refresh(current_user)
    
    return UserRead.model_validate(current_user)


@router.post("/onboarding", response_model=UserRead)
def set_onboarding_goal(
    data: UserOnboarding,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Set user's goal during onboarding."""
    current_user.goal = data.goal
    current_user.onboarding_step = OnboardingStep.GOAL_SELECTED
    current_user.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(current_user)
    
    return UserRead.model_validate(current_user)


@router.post("/onboarding/complete", response_model=UserRead)
def complete_onboarding(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark onboarding as complete and award bonus."""
    if current_user.onboarding_completed:
        return UserRead.model_validate(current_user)
    
    current_user.onboarding_step = OnboardingStep.COMPLETED
    current_user.onboarding_completed = True
    current_user.ghadam_balance += COMPLETE_ONBOARDING_BONUS
    
    # Record bonus
    tx = GhadamTransaction(
        user_id=current_user.id,
        transaction_type=TransactionType.ONBOARDING_BONUS,
        amount=COMPLETE_ONBOARDING_BONUS,
        balance_after=current_user.ghadam_balance,
        description="Completed onboarding",
    )
    session.add(tx)
    
    session.commit()
    session.refresh(current_user)
    
    return UserRead.model_validate(current_user)

class GoogleExchangeRequest(BaseModel):
    code: str
    redirect_uri: str

class GoogleTokenRequest(BaseModel):
    id_token: str

@router.post("/google/exchange", response_model=VerifyOTPResponse)
async def google_exchange(
    data: GoogleExchangeRequest,
    session: Session = Depends(get_session),
):
    tokens = await exchange_code_for_tokens(data.code, data.redirect_uri)
    idt = tokens.get("id_token")
    if not idt:
        raise HTTPException(status_code=400, detail="Google did not return id_token")

    idinfo = verify_google_id_token(idt)
    user, is_new = get_or_create_user_from_google(session, idinfo)

    token = create_access_token(user.id)
    return VerifyOTPResponse(
        token=token,
        user=UserRead.model_validate(user),
        is_new_user=is_new,
    )

# Optional: useful for mobile apps
@router.post("/google/id-token", response_model=VerifyOTPResponse)
def google_id_token_login(
    data: GoogleTokenRequest,
    session: Session = Depends(get_session),
):
    idinfo = verify_google_id_token(data.id_token)
    user, is_new = get_or_create_user_from_google(session, idinfo)

    token = create_access_token(user.id)
    return VerifyOTPResponse(
        token=token,
        user=UserRead.model_validate(user),
        is_new_user=is_new,
    )