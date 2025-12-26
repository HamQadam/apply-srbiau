from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.applicant import Applicant


class SubscriptionType(str, Enum):
    SINGLE_VIEW = "single_view"     # One-time view
    FULL_ACCESS = "full_access"     # Full access to applicant's content


class Subscription(SQLModel, table=True):
    """User subscription to view an applicant's content."""
    __tablename__ = "subscriptions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    subscriber_id: int = Field(foreign_key="users.id", index=True)
    applicant_id: int = Field(foreign_key="applicants.id", index=True)
    
    subscription_type: SubscriptionType = Field(default=SubscriptionType.FULL_ACCESS)
    ghadams_paid: int = Field(description="How many ghadams were paid")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(default=None, description="Null = never expires")
    
    # Relationships
    subscriber: Optional["User"] = Relationship(
        back_populates="subscriptions",
        sa_relationship_kwargs={"foreign_keys": "[Subscription.subscriber_id]"}
    )
    applicant: Optional["Applicant"] = Relationship(back_populates="subscribers")


class SubscriptionRead(SQLModel):
    id: int
    applicant_id: int
    subscription_type: SubscriptionType
    ghadams_paid: int
    created_at: datetime
    expires_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SubscriptionCreate(SQLModel):
    applicant_id: int


# Ghadam reward configuration
class GhadamRewards:
    """Ghadam reward amounts for different actions."""
    PROFILE_CREATED = 50          # Creating an applicant profile
    APPLICATION_ADDED = 30        # Adding an application
    APPLICATION_WITH_NOTES = 50   # Application with tips/notes
    DOCUMENT_UPLOADED = 20        # Uploading a document
    LANGUAGE_ADDED = 15           # Adding language credential
    ACTIVITY_ADDED = 10           # Adding an activity
    
    # Earning from views
    VIEW_EARNED = 5               # When someone pays to view you
    
    # Pricing for readers
    VIEW_PRICE_DEFAULT = 20       # Default price to view an applicant
    VIEW_PRICE_PREMIUM = 50       # Premium applicant view price
    
    # Withdrawal rate (ghadams to Toman)
    WITHDRAWAL_RATE = 100         # 1 ghadam = 100 Toman
    MIN_WITHDRAWAL = 500          # Minimum ghadams to withdraw
