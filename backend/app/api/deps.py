from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session

from app.database import get_session
from app.models import User
from app.services.auth import verify_token

# Type alias for session dependency
SessionDep = Annotated[Session, Depends(get_session)]

# Bearer token security
security = HTTPBearer(auto_error=False)


async def get_current_user(
    session: SessionDep,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
) -> Optional[User]:
    """Get current user from JWT token. Returns None if not authenticated."""
    if not credentials:
        return None
    
    user_id = verify_token(credentials.credentials)
    if not user_id:
        return None
    
    user = session.get(User, user_id)
    if not user or not user.is_active:
        return None
    
    return user


async def get_current_user_required(
    session: SessionDep,
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
) -> User:
    """Get current user, raise 401 if not authenticated."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = verify_token(credentials.credentials)
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
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    return user


# Type aliases for auth dependencies
CurrentUser = Annotated[Optional[User], Depends(get_current_user)]
CurrentUserRequired = Annotated[User, Depends(get_current_user_required)]
