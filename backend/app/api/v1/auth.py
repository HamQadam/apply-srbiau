from fastapi import APIRouter, HTTPException, status
from sqlmodel import SQLModel

from app.api.deps import SessionDep, CurrentUserRequired
from app.models import User, UserRead, Applicant
from app.services.auth import (
    create_otp,
    verify_otp,
    get_or_create_user,
    send_sms_otp,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["authentication"])


class SendOTPRequest(SQLModel):
    phone: str


class SendOTPResponse(SQLModel):
    message: str
    phone: str


class VerifyOTPRequest(SQLModel):
    phone: str
    code: str


class VerifyOTPResponse(SQLModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class MeResponse(SQLModel):
    user: UserRead
    applicant_id: int | None = None


@router.post("/send-otp", response_model=SendOTPResponse)
def send_otp(request: SendOTPRequest, session: SessionDep):
    """
    Send OTP code to phone number.
    
    In debug mode, all OTP codes are 000000.
    """
    # Normalize phone number
    phone = request.phone.strip().replace(" ", "")
    
    # Create OTP
    otp = create_otp(session, phone)
    
    # Send SMS (in debug mode, prints to console)
    send_sms_otp(phone, otp.code)
    
    return SendOTPResponse(
        message="کد تایید ارسال شد",  # Verification code sent
        phone=phone,
    )


@router.post("/verify-otp", response_model=VerifyOTPResponse)
def verify_otp_endpoint(request: VerifyOTPRequest, session: SessionDep):
    """
    Verify OTP code and return JWT token.
    
    Creates a new user if phone number doesn't exist.
    """
    phone = request.phone.strip().replace(" ", "")
    
    # Verify OTP
    if not verify_otp(session, phone, request.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="کد نامعتبر یا منقضی شده",  # Invalid or expired code
        )
    
    # Get or create user
    user = get_or_create_user(session, phone)
    
    # Create JWT token
    access_token = create_access_token(user.id)
    
    return VerifyOTPResponse(
        access_token=access_token,
        user=UserRead.model_validate(user),
    )


@router.get("/me", response_model=MeResponse)
def get_me(session: SessionDep, user: CurrentUserRequired):
    """Get current authenticated user's info."""
    # Check if user has an applicant profile
    applicant = session.query(Applicant).filter(Applicant.user_id == user.id).first()
    
    return MeResponse(
        user=UserRead.model_validate(user),
        applicant_id=applicant.id if applicant else None,
    )


@router.post("/logout")
def logout(user: CurrentUserRequired):
    """
    Logout user.
    
    Note: Since we use JWT tokens, we can't truly invalidate them server-side.
    The client should delete the token. This endpoint exists for API completeness.
    """
    return {"message": "خروج موفق", "detail": "Logged out successfully"}


@router.patch("/update-profile", response_model=UserRead)
def update_profile(
    session: SessionDep,
    user: CurrentUserRequired,
    display_name: str | None = None,
):
    """Update user profile."""
    if display_name:
        user.display_name = display_name
        session.add(user)
        session.commit()
        session.refresh(user)
    
    return UserRead.model_validate(user)
