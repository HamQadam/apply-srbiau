from datetime import datetime, timedelta
from typing import Optional
import secrets

from jose import JWTError, jwt
from sqlmodel import Session, select

from app.config import get_settings
from app.models import User, OTP

settings = get_settings()

# JWT Configuration
SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Debug mode - all OTPs are 000000
DEBUG_MODE = True


def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[int]:
    """Verify JWT token and return user_id."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return int(user_id)
    except JWTError:
        return None


def generate_otp() -> str:
    """Generate 6-digit OTP code."""
    if DEBUG_MODE:
        return "000000"
    return "".join([str(secrets.randbelow(10)) for _ in range(6)])


def create_otp(session: Session, phone: str) -> OTP:
    """Create and store OTP for phone number."""
    # Invalidate old OTPs
    old_otps = session.exec(
        select(OTP).where(OTP.phone == phone, OTP.is_used == False)
    ).all()
    for otp in old_otps:
        otp.is_used = True
        session.add(otp)
    
    # Create new OTP
    code = generate_otp()
    otp = OTP(
        phone=phone,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    session.add(otp)
    session.commit()
    session.refresh(otp)
    
    return otp


def verify_otp(session: Session, phone: str, code: str) -> bool:
    """Verify OTP code for phone number."""
    otp = session.exec(
        select(OTP).where(
            OTP.phone == phone,
            OTP.code == code,
            OTP.is_used == False,
            OTP.expires_at > datetime.utcnow(),
        )
    ).first()
    
    if not otp:
        return False
    
    # Mark as used
    otp.is_used = True
    session.add(otp)
    session.commit()
    
    return True


def get_or_create_user(session: Session, phone: str) -> User:
    """Get existing user or create new one."""
    user = session.exec(select(User).where(User.phone == phone)).first()
    
    if not user:
        user = User(phone=phone)
        session.add(user)
        session.commit()
        session.refresh(user)
    
    # Update last login
    user.last_login = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return user


def send_sms_otp(phone: str, code: str) -> bool:
    """
    Send OTP via SMS.
    
    TODO: Integrate with actual SMS provider (Kavenegar, etc.)
    For now, just print to console in debug mode.
    """
    if DEBUG_MODE:
        print(f"[DEBUG] OTP for {phone}: {code}")
        return True
    
    # TODO: Implement real SMS sending
    # Example with Kavenegar:
    # api = KavenegarAPI(settings.kavenegar_api_key)
    # api.verify_lookup(phone, code, template="verify")
    
    return True
