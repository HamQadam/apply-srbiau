"""User model with authentication, onboarding, matching profile, and tracker integration."""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Enum as SAEnum, JSON

if TYPE_CHECKING:
    from .tracked_program import TrackedProgram
    from .ghadam import GhadamTransaction

class AuthProvider(str, Enum):
    PHONE = "phone"
    GOOGLE = "google"



class UserGoal(str, Enum):
    """What brought the user here - determines their flow."""
    APPLYING = "applying"        # Actively applying → Tracker focus
    APPLIED = "applied"          # Already applied/accepted → Contribute focus
    BROWSING = "browsing"        # Just looking around


class OnboardingStep(str, Enum):
    """Track user's onboarding progress."""
    SIGNED_UP = "signed_up"
    GOAL_SELECTED = "goal_selected"
    FIRST_PROGRAM_ADDED = "first_program_added"
    PROFILE_STARTED = "profile_started"
    PROFILE_COMPLETED = "profile_completed"  # New step for matching profile
    COMPLETED = "completed"


class UserBase(SQLModel):
    phone: Optional[str] = Field(default=None, unique=True, index=True, max_length=20)
    display_name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[str] = Field(default=None, max_length=200)
    
    # Profile info (optional, for matching)
    origin_country: Optional[str] = Field(default=None, max_length=100)
    origin_university: Optional[str] = Field(default=None, max_length=200)
    field_of_study: Optional[str] = Field(default=None, max_length=200)
    graduation_year: Optional[int] = Field(default=None)
    

    auth_provider: AuthProvider = Field(
        default=AuthProvider.PHONE,
        sa_column=Column(SAEnum(AuthProvider))
    )

    google_sub: Optional[str] = Field(default=None, unique=True, index=True, max_length=50)
    picture_url: Optional[str] = Field(default=None, max_length=500)
    email_verified: Optional[bool] = Field(default=None)

    # Onboarding
    goal: Optional[UserGoal] = Field(default=None, sa_column=Column(SAEnum(UserGoal)))
    onboarding_step: OnboardingStep = Field(
        default=OnboardingStep.SIGNED_UP,
        sa_column=Column(SAEnum(OnboardingStep))
    )
    onboarding_completed: bool = Field(default=False)
    
    # Matching Profile - stored as JSON for flexibility
    # Structure: {preferred_fields: [], preferred_countries: [], budget_min: int, budget_max: int,
    #             preferred_degree_level: str, target_intake: str, language_preference: str,
    #             gre_score: int, gmat_score: int, gpa: float, gpa_scale: str}
    matching_profile: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    matching_profile_completed: bool = Field(default=False)
    
    # Ghadam balance
    ghadam_balance: int = Field(default=0)
    
    # Settings
    email_notifications: bool = Field(default=True)
    deadline_reminders: bool = Field(default=True)
    is_active: bool = Field(default=True)  # Account status


class User(UserBase, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)
    
    # Relationships
    tracked_programs: List["TrackedProgram"] = Relationship(back_populates="user")
    ghadam_transactions: List["GhadamTransaction"] = Relationship(back_populates="user")


class UserCreate(SQLModel):
    phone: str


class UserRead(UserBase):
    id: int
    created_at: datetime
    tracked_programs_count: Optional[int] = None


class UserUpdate(SQLModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    origin_country: Optional[str] = None
    origin_university: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[int] = None
    goal: Optional[UserGoal] = None
    email_notifications: Optional[bool] = None
    deadline_reminders: Optional[bool] = None


class UserOnboarding(SQLModel):
    """Onboarding request - setting user's goal."""
    goal: UserGoal


# OTP for authentication
class OTPCode(SQLModel, table=True):
    __tablename__ = "otp_codes"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(index=True, max_length=20)
    code: str = Field(max_length=6)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    used: bool = Field(default=False)


# Signup bonus
SIGNUP_BONUS_GHADAMS = 30  # Enough to view ~1 profile
FIRST_PROGRAM_BONUS = 10
COMPLETE_ONBOARDING_BONUS = 10
PROFILE_COMPLETION_BONUS = 20  # Bonus for completing matching profile