from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum

if TYPE_CHECKING:
    from app.models.applicant import Applicant


class UserRole(str, Enum):
    READER = "reader"           # Can only read (needs to pay)
    CONTRIBUTOR = "contributor" # Has shared their journey
    ADMIN = "admin"


class TransactionType(str, Enum):
    EARN_PROFILE = "earn_profile"           # Created profile
    EARN_APPLICATION = "earn_application"   # Added application
    EARN_DOCUMENT = "earn_document"         # Uploaded document
    EARN_LANGUAGE = "earn_language"         # Added language score
    EARN_ACTIVITY = "earn_activity"         # Added activity
    EARN_VIEW = "earn_view"                 # Someone viewed your profile
    SPEND_VIEW = "spend_view"               # Paid to view someone
    SPEND_SUBSCRIBE = "spend_subscribe"     # Subscribed to someone
    WITHDRAW = "withdraw"                   # Withdrew to real money
    BONUS = "bonus"                         # Admin bonus


class UserBase(SQLModel):
    phone: str = Field(max_length=20, unique=True, index=True)
    display_name: Optional[str] = Field(default=None, max_length=100)
    role: UserRole = Field(default=UserRole.READER)
    is_active: bool = Field(default=True)


class User(UserBase, table=True):
    """User account for authentication and wallet."""
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Ghadam wallet
    ghadam_balance: int = Field(default=0, description="Current ghadam balance")
    total_earned: int = Field(default=0, description="Total ghadams ever earned")
    total_spent: int = Field(default=0, description="Total ghadams spent")
    total_withdrawn: int = Field(default=0, description="Total withdrawn to real money")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    # Relationships
    applicant: Optional["Applicant"] = Relationship(back_populates="user")
    transactions: list["Transaction"] = Relationship(back_populates="user")
    subscriptions: list["Subscription"] = Relationship(
        back_populates="subscriber",
        sa_relationship_kwargs={"foreign_keys": "[Subscription.subscriber_id]"}
    )


class UserCreate(SQLModel):
    phone: str
    display_name: Optional[str] = None


class UserRead(SQLModel):
    id: int
    phone: str
    display_name: Optional[str]
    role: UserRole
    ghadam_balance: int
    total_earned: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserPublic(SQLModel):
    """Public user info (no phone)."""
    id: int
    display_name: Optional[str]
    role: UserRole


# OTP Model
class OTP(SQLModel, table=True):
    """One-time password for SMS verification."""
    __tablename__ = "otps"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(max_length=20, index=True)
    code: str = Field(max_length=6)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    is_used: bool = Field(default=False)


# Transaction Model
class Transaction(SQLModel, table=True):
    """Ghadam transaction history."""
    __tablename__ = "transactions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    
    transaction_type: TransactionType
    amount: int = Field(description="Positive for earn, negative for spend")
    balance_after: int = Field(description="Balance after transaction")
    
    # Optional reference to what triggered this
    reference_type: Optional[str] = Field(default=None, max_length=50)
    reference_id: Optional[int] = None
    
    description: Optional[str] = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    user: Optional[User] = Relationship(back_populates="transactions")


class TransactionRead(SQLModel):
    id: int
    transaction_type: TransactionType
    amount: int
    balance_after: int
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Import for relationship
from app.models.subscription import Subscription
