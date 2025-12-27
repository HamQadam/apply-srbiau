"""Rate limiting service for course viewing."""
from typing import Optional
from sqlmodel import Session
from datetime import datetime, timedelta
from app.models import User


class CourseViewTracker:
    """Track course views for rate limiting unauthenticated users."""

    # In-memory store for unauthenticated users (IP-based)
    # Format: {ip_address: {"count": int, "reset_at": datetime}}
    _anonymous_views: dict = {}

    MAX_FREE_VIEWS = 5  # Configure this value
    RESET_HOURS = 24

    @classmethod
    def can_view_course(
        cls, session: Session, user: Optional[User], ip_address: str
    ) -> tuple[bool, int]:
        """
        Check if user/IP can view course details.

        Args:
            session: Database session (for future use if needed)
            user: Authenticated user or None
            ip_address: Client IP address

        Returns:
            Tuple of (can_view: bool, remaining_views: int)
            remaining_views is -1 for unlimited (authenticated users)
        """
        if user:
            # Authenticated users have unlimited views
            return True, -1

        # Check anonymous IP-based limiting
        now = datetime.utcnow()

        if ip_address not in cls._anonymous_views:
            cls._anonymous_views[ip_address] = {
                "count": 0,
                "reset_at": now + timedelta(hours=cls.RESET_HOURS),
            }

        tracker = cls._anonymous_views[ip_address]

        # Reset if time expired
        if now > tracker["reset_at"]:
            tracker["count"] = 0
            tracker["reset_at"] = now + timedelta(hours=cls.RESET_HOURS)

        remaining = cls.MAX_FREE_VIEWS - tracker["count"]
        can_view = remaining > 0

        return can_view, remaining

    @classmethod
    def record_view(cls, ip_address: str):
        """Record a course view for anonymous user."""
        if ip_address in cls._anonymous_views:
            cls._anonymous_views[ip_address]["count"] += 1

    @classmethod
    def cleanup_old_entries(cls):
        """
        Cleanup expired entries (call periodically).

        This method can be called from a background task to prevent
        memory buildup from old IP addresses.
        """
        now = datetime.utcnow()
        cls._anonymous_views = {
            ip: data
            for ip, data in cls._anonymous_views.items()
            if now <= data["reset_at"]
        }
