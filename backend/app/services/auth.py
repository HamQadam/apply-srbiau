"""Authentication service - JWT tokens and OTP verification."""
import random
import string
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select

from app.database import get_session
from app.config import get_settings
from app.models import User, OTPCode

settings = get_settings()
security = HTTPBearer(auto_error=False)


def generate_otp() -> str:
    """Generate 6-digit OTP code."""
    if settings.debug_otp:
        return "000000"
    return "".join(random.choices(string.digits, k=6))


def create_otp(session: Session, phone: str) -> str:
    """Create and store OTP for phone number."""
    code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes)
    
    otp = OTPCode(
        phone=phone,
        code=code,
        expires_at=expires_at,
    )
    session.add(otp)
    session.commit()
    
    return code


def verify_otp(session: Session, phone: str, code: str) -> bool:
    """Verify OTP code for phone number."""
    otp = session.exec(
        select(OTPCode)
        .where(OTPCode.phone == phone)
        .where(OTPCode.code == code)
        .where(OTPCode.used == False)
        .where(OTPCode.expires_at > datetime.utcnow())
        .order_by(OTPCode.created_at.desc())
    ).first()
    
    if not otp:
        return False
    
    otp.used = True
    session.commit()
    return True


def create_access_token(user_id: int) -> str:
    """Create JWT token for user."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[int]:
    """Decode JWT token and return user_id."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        sub = payload.get("sub")
        if sub is None:
            return None
        return int(sub)
    except (JWTError, ValueError, TypeError):
        return None


# Alias for deps.py compatibility
verify_token = decode_token


# Alias for backward compatibility
verify_token = decode_token


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    """Dependency to get current authenticated user."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    session.commit()
    
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Dependency to optionally get current user (for public endpoints)."""
    if not credentials:
        return None
    
    user_id = decode_token(credentials.credentials)
    if not user_id:
        return None
    
    return session.get(User, user_id)
