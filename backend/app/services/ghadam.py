from typing import Optional
from sqlmodel import Session, select

from app.models import (
    User,
    UserRole,
    Transaction,
    TransactionType,
    Applicant,
    Subscription,
    SubscriptionType,
    GhadamRewards,
)


def add_transaction(
    session: Session,
    user: User,
    transaction_type: TransactionType,
    amount: int,
    description: Optional[str] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None,
) -> Transaction:
    """Add a ghadam transaction and update user balance."""
    # Update balance
    user.ghadam_balance += amount
    
    if amount > 0:
        user.total_earned += amount
    else:
        user.total_spent += abs(amount)
    
    # Create transaction record
    transaction = Transaction(
        user_id=user.id,
        transaction_type=transaction_type,
        amount=amount,
        balance_after=user.ghadam_balance,
        description=description,
        reference_type=reference_type,
        reference_id=reference_id,
    )
    
    session.add(user)
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    
    return transaction


def reward_profile_created(session: Session, user: User, applicant: Applicant) -> Transaction:
    """Reward user for creating an applicant profile."""
    # Update user role to contributor
    user.role = UserRole.CONTRIBUTOR
    session.add(user)
    
    return add_transaction(
        session,
        user,
        TransactionType.EARN_PROFILE,
        GhadamRewards.PROFILE_CREATED,
        description="پروفایل متقاضی ایجاد شد",  # Applicant profile created
        reference_type="applicant",
        reference_id=applicant.id,
    )


def reward_application_added(
    session: Session, 
    user: User, 
    application_id: int,
    has_notes: bool = False
) -> Transaction:
    """Reward user for adding an application."""
    amount = GhadamRewards.APPLICATION_WITH_NOTES if has_notes else GhadamRewards.APPLICATION_ADDED
    
    return add_transaction(
        session,
        user,
        TransactionType.EARN_APPLICATION,
        amount,
        description="اپلیکیشن جدید اضافه شد" + (" (با نکات)" if has_notes else ""),
        reference_type="application",
        reference_id=application_id,
    )


def reward_document_uploaded(session: Session, user: User, document_id: int) -> Transaction:
    """Reward user for uploading a document."""
    return add_transaction(
        session,
        user,
        TransactionType.EARN_DOCUMENT,
        GhadamRewards.DOCUMENT_UPLOADED,
        description="سند آپلود شد",  # Document uploaded
        reference_type="document",
        reference_id=document_id,
    )


def reward_language_added(session: Session, user: User, credential_id: int) -> Transaction:
    """Reward user for adding language credential."""
    return add_transaction(
        session,
        user,
        TransactionType.EARN_LANGUAGE,
        GhadamRewards.LANGUAGE_ADDED,
        description="مدرک زبان اضافه شد",  # Language credential added
        reference_type="language",
        reference_id=credential_id,
    )


def reward_activity_added(session: Session, user: User, activity_id: int) -> Transaction:
    """Reward user for adding activity."""
    return add_transaction(
        session,
        user,
        TransactionType.EARN_ACTIVITY,
        GhadamRewards.ACTIVITY_ADDED,
        description="فعالیت اضافه شد",  # Activity added
        reference_type="activity",
        reference_id=activity_id,
    )


def reward_view_earned(session: Session, applicant_owner: User, viewer: User, amount: int) -> Transaction:
    """Reward applicant owner when someone pays to view their profile."""
    return add_transaction(
        session,
        applicant_owner,
        TransactionType.EARN_VIEW,
        amount,
        description=f"بازدید از پروفایل شما",  # Profile viewed
        reference_type="user",
        reference_id=viewer.id,
    )


def spend_for_view(
    session: Session,
    viewer: User,
    applicant: Applicant,
) -> Optional[Subscription]:
    """
    Process payment for viewing an applicant's profile.
    Returns Subscription if successful, None if insufficient balance.
    """
    price = applicant.view_price
    
    # Check balance
    if viewer.ghadam_balance < price:
        return None
    
    # Deduct from viewer
    add_transaction(
        session,
        viewer,
        TransactionType.SPEND_VIEW,
        -price,
        description=f"مشاهده پروفایل {applicant.display_name}",
        reference_type="applicant",
        reference_id=applicant.id,
    )
    
    # Reward applicant owner (if has owner)
    if applicant.user_id:
        owner = session.get(User, applicant.user_id)
        if owner:
            # Owner gets 80% of view price
            owner_reward = int(price * 0.8)
            reward_view_earned(session, owner, viewer, owner_reward)
    
    # Update applicant stats
    applicant.total_views += 1
    applicant.ghadams_earned += price
    session.add(applicant)
    
    # Create subscription
    subscription = Subscription(
        subscriber_id=viewer.id,
        applicant_id=applicant.id,
        subscription_type=SubscriptionType.FULL_ACCESS,
        ghadams_paid=price,
    )
    session.add(subscription)
    session.commit()
    session.refresh(subscription)
    
    return subscription


def check_subscription(session: Session, user_id: int, applicant_id: int) -> bool:
    """Check if user has active subscription to view applicant."""
    subscription = session.exec(
        select(Subscription).where(
            Subscription.subscriber_id == user_id,
            Subscription.applicant_id == applicant_id,
        )
    ).first()
    
    return subscription is not None


def can_view_applicant(session: Session, user: Optional[User], applicant: Applicant) -> bool:
    """Check if user can view full applicant profile."""
    # If applicant is free (price = 0)
    if applicant.view_price == 0:
        return True
    
    # If not logged in
    if not user:
        return False
    
    # If user owns this applicant
    if applicant.user_id == user.id:
        return True
    
    # If user is admin
    if user.role == UserRole.ADMIN:
        return True
    
    # Check subscription
    return check_subscription(session, user.id, applicant.id)


def process_withdrawal(session: Session, user: User, amount: int) -> Optional[Transaction]:
    """
    Process ghadam withdrawal to real money.
    Returns Transaction if successful, None if insufficient balance.
    """
    if amount < GhadamRewards.MIN_WITHDRAWAL:
        return None
    
    if user.ghadam_balance < amount:
        return None
    
    # Calculate real money value
    money_value = amount * GhadamRewards.WITHDRAWAL_RATE
    
    transaction = add_transaction(
        session,
        user,
        TransactionType.WITHDRAW,
        -amount,
        description=f"برداشت {amount} قدم = {money_value:,} تومان",
    )
    
    user.total_withdrawn += amount
    session.add(user)
    session.commit()
    
    return transaction


def calculate_profile_completeness(applicant: Applicant) -> dict:
    """Calculate how complete a profile is and potential rewards."""
    rewards = {
        "profile": GhadamRewards.PROFILE_CREATED,
        "applications": len(applicant.applications) * GhadamRewards.APPLICATION_ADDED,
        "documents": len(applicant.documents) * GhadamRewards.DOCUMENT_UPLOADED,
        "languages": len(applicant.language_credentials) * GhadamRewards.LANGUAGE_ADDED,
        "activities": len(applicant.activities) * GhadamRewards.ACTIVITY_ADDED,
    }
    
    # Bonus for applications with notes
    notes_bonus = sum(
        GhadamRewards.APPLICATION_WITH_NOTES - GhadamRewards.APPLICATION_ADDED
        for app in applicant.applications
        if app.notes
    )
    rewards["notes_bonus"] = notes_bonus
    
    rewards["total"] = sum(rewards.values())
    
    return rewards
