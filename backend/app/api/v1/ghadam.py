"""Ghadam coin API endpoints."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import (
    User, GhadamTransaction, GhadamTransactionRead,
    TransactionType, GHADAM_REWARDS, GHADAM_COSTS,
    PROFILE_VIEW_COST, CONTRIBUTOR_SHARE,
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/ghadam", tags=["ghadam"])


@router.get("/balance")
def get_balance(
    current_user: User = Depends(get_current_user),
):
    """Get current Ghadam balance."""
    return {
        "balance": current_user.ghadam_balance,
        "user_id": current_user.id,
    }


@router.get("/transactions", response_model=List[GhadamTransactionRead])
def get_transactions(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get transaction history."""
    transactions = session.exec(
        select(GhadamTransaction)
        .where(GhadamTransaction.user_id == current_user.id)
        .order_by(GhadamTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    
    return [GhadamTransactionRead.model_validate(t) for t in transactions]


@router.get("/pricing")
def get_pricing():
    """Get current Ghadam pricing and rewards."""
    return {
        "profile_view_cost": PROFILE_VIEW_COST,
        "contributor_share": CONTRIBUTOR_SHARE,
        "rewards": {k.value: v for k, v in GHADAM_REWARDS.items()},
        "costs": {k.value: abs(v) for k, v in GHADAM_COSTS.items()},
        "withdrawal": {
            "minimum": 1000,
            "rate_example": "1000 Ghadam = 10,000 Toman",
        },
    }


@router.post("/purchase-view/{profile_id}")
def purchase_profile_view(
    profile_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Purchase access to view a profile."""
    # Check balance
    if current_user.ghadam_balance < PROFILE_VIEW_COST:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Need {PROFILE_VIEW_COST}, have {current_user.ghadam_balance}",
        )
    
    # In a full implementation, you'd:
    # 1. Check if user already has access
    # 2. Deduct from buyer
    # 3. Credit profile owner (70%)
    # 4. Record both transactions
    # 5. Create ProfileAccess record
    
    # For now, just deduct
    current_user.ghadam_balance -= PROFILE_VIEW_COST
    
    tx = GhadamTransaction(
        user_id=current_user.id,
        transaction_type=TransactionType.PROFILE_VIEW_COST,
        amount=-PROFILE_VIEW_COST,
        balance_after=current_user.ghadam_balance,
        related_entity_type="profile",
        related_entity_id=profile_id,
        description=f"Viewed profile #{profile_id}",
    )
    session.add(tx)
    session.commit()
    
    return {
        "ok": True,
        "new_balance": current_user.ghadam_balance,
        "profile_id": profile_id,
    }