"""User model with authentication, onboarding, and tracker integration."""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Enum as SAEnum

if TYPE_CHECKING:
    from .tracked_program import TrackedProgram
    from .ghadam import GhadamTransaction


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
    COMPLETED = "completed"


class UserBase(SQLModel):
    phone: str = Field(unique=True, index=True, max_length=20)
    display_name: Optional[str] = Field(default=None, max_length=100)
    email: Optional[str] = Field(default=None, max_length=200)
    
    # Profile info (optional, for matching)
    origin_country: Optional[str] = Field(default=None, max_length=100)
    origin_university: Optional[str] = Field(default=None, max_length=200)
    field_of_study: Optional[str] = Field(default=None, max_length=200)
    graduation_year: Optional[int] = Field(default=None)
    
    # Onboarding
    goal: Optional[UserGoal] = Field(default=None, sa_column=Column(SAEnum(UserGoal)))
    onboarding_step: OnboardingStep = Field(
        default=OnboardingStep.SIGNED_UP,
        sa_column=Column(SAEnum(OnboardingStep))
    )
    onboarding_completed: bool = Field(default=False)
    
    # Ghadam balance
    ghadam_balance: int = Field(default=0)
    
    # Settings
    email_notifications: bool = Field(default=True)
    deadline_reminders: bool = Field(default=True)


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