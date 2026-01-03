from typing import Any, Dict
import httpx
from fastapi import HTTPException
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from datetime import datetime
from sqlmodel import Session, select
from app.models import User
from app.models.user import AuthProvider  # adjust import to where you placed it
from app.config import get_settings

settings = get_settings()

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

async def exchange_code_for_tokens(code: str, redirect_uri: str) -> Dict[str, Any]:
    if not settings.google_client_id or not settings.google_client_secret:
        raise RuntimeError("Google OAuth is not configured (missing client id/secret).")

    data = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(GOOGLE_TOKEN_URL, data=data)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=400, detail="Failed to exchange Google code for tokens")


def verify_google_id_token(id_token: str) -> Dict[str, Any]:
    try:
        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            settings.google_client_id,
        )

        iss = idinfo.get("iss")
        if iss not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("Invalid issuer")

        # Optional hardening:
        # if not idinfo.get("email_verified"):
        #     raise ValueError("Email not verified")

        return idinfo
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Google token")

def get_or_create_user_from_google(session: Session, idinfo: dict) -> tuple[User, bool]:
    sub = idinfo.get("sub")
    email = idinfo.get("email")
    name = idinfo.get("name")
    picture = idinfo.get("picture")
    email_verified = idinfo.get("email_verified")

    if not sub:
        raise HTTPException(status_code=400, detail="Google token missing sub")

    user = session.exec(select(User).where(User.google_sub == sub)).first()
    is_new = False

    if not user:
        is_new = True

        # Optional linking strategy:
        # If you want to auto-link by verified email:
        # if email and email_verified:
        #     existing = session.exec(select(User).where(User.email == email)).first()
        #     if existing and not existing.google_sub:
        #         user = existing
        #         user.google_sub = sub
        #         user.auth_provider = AuthProvider.GOOGLE
        #     else:
        #         user = User(...)
        # else:

        user = User(
            phone=None,
            email=email,
            display_name=name,
            picture_url=picture,
            email_verified=email_verified,
            google_sub=sub,
            auth_provider=AuthProvider.GOOGLE,
        )
        session.add(user)

    # Always refresh profile on login
    user.email = email or user.email
    user.display_name = name or user.display_name
    user.picture_url = picture or user.picture_url
    user.email_verified = email_verified if email_verified is not None else user.email_verified
    user.last_login_at = datetime.utcnow()

    session.commit()
    session.refresh(user)
    return user, is_new