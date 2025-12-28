"""Ghadam coin system - transactions and rewards."""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Enum as SAEnum

if TYPE_CHECKING:
    from .user import User


class TransactionType(str, Enum):
    """Types of Ghadam transactions."""
    # Earning
    SIGNUP_BONUS = "signup_bonus"
    ONBOARDING_BONUS = "onboarding_bonus"
    FIRST_PROGRAM_BONUS = "first_program_bonus"
    PROFILE_CREATED = "profile_created"
    PROFILE_COMPLETED = "profile_completed"
    DOCUMENT_UPLOADED = "document_uploaded"
    APPLICATION_SHARED = "application_shared"
    RESULT_SHARED = "result_shared"
    PROFILE_VIEWED = "profile_viewed"  # Someone viewed your profile
    VERIFICATION_REWARD = "verification_reward"  # Verified program data
    REFERRAL_BONUS = "referral_bonus"
    
    # Spending
    PROFILE_VIEW_COST = "profile_view_cost"
    DOCUMENT_DOWNLOAD = "document_download"
    
    # Admin
    ADMIN_ADJUSTMENT = "admin_adjustment"
    WITHDRAWAL = "withdrawal"


class GhadamTransaction(SQLModel, table=True):
    __tablename__ = "ghadam_transactions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    
    transaction_type: TransactionType = Field(sa_column=Column(SAEnum(TransactionType)))
    amount: int  # Positive for earning, negative for spending
    balance_after: int
    
    # Context
    related_user_id: Optional[int] = Field(default=None)  # e.g., whose profile was viewed
    related_entity_type: Optional[str] = Field(default=None, max_length=50)  # "profile", "document"
    related_entity_id: Optional[int] = Field(default=None)
    
    description: Optional[str] = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship
    user: "User" = Relationship(back_populates="ghadam_transactions")


class GhadamTransactionRead(SQLModel):
    id: int
    transaction_type: TransactionType
    amount: int
    balance_after: int
    description: Optional[str]
    created_at: datetime


# Reward configuration
GHADAM_REWARDS = {
    TransactionType.SIGNUP_BONUS: 30,
    TransactionType.ONBOARDING_BONUS: 10,
    TransactionType.FIRST_PROGRAM_BONUS: 10,
    TransactionType.PROFILE_CREATED: 50,
    TransactionType.PROFILE_COMPLETED: 100,  # When profile is 100% complete
    TransactionType.DOCUMENT_UPLOADED: 20,
    TransactionType.APPLICATION_SHARED: 25,
    TransactionType.RESULT_SHARED: 30,
    TransactionType.PROFILE_VIEWED: 35,  # 70% of view cost
    TransactionType.VERIFICATION_REWARD: 15,
    TransactionType.REFERRAL_BONUS: 50,
}

GHADAM_COSTS = {
    TransactionType.PROFILE_VIEW_COST: -50,
    TransactionType.DOCUMENT_DOWNLOAD: -20,
}

PROFILE_VIEW_COST = 50
CONTRIBUTOR_SHARE = 0.70  # 70% goes to profile owner