from fastapi import APIRouter, HTTPException, Query
from sqlmodel import select, SQLModel

from app.api.deps import SessionDep, CurrentUserRequired
from app.models import Transaction, TransactionRead, GhadamRewards
from app.services.ghadam import process_withdrawal

router = APIRouter(prefix="/wallet", tags=["wallet"])


class WalletBalance(SQLModel):
    ghadam_balance: int
    total_earned: int
    total_spent: int
    total_withdrawn: int
    withdrawal_rate: int = GhadamRewards.WITHDRAWAL_RATE
    min_withdrawal: int = GhadamRewards.MIN_WITHDRAWAL


class WithdrawRequest(SQLModel):
    amount: int


class WithdrawResponse(SQLModel):
    success: bool
    message: str
    transaction: TransactionRead | None = None
    money_value: int | None = None


class RewardRates(SQLModel):
    """Current ghadam reward rates for various actions."""
    profile_created: int = GhadamRewards.PROFILE_CREATED
    application_added: int = GhadamRewards.APPLICATION_ADDED
    application_with_notes: int = GhadamRewards.APPLICATION_WITH_NOTES
    document_uploaded: int = GhadamRewards.DOCUMENT_UPLOADED
    language_added: int = GhadamRewards.LANGUAGE_ADDED
    activity_added: int = GhadamRewards.ACTIVITY_ADDED
    view_earned: int = GhadamRewards.VIEW_EARNED
    view_price_default: int = GhadamRewards.VIEW_PRICE_DEFAULT
    view_price_premium: int = GhadamRewards.VIEW_PRICE_PREMIUM
    withdrawal_rate: int = GhadamRewards.WITHDRAWAL_RATE
    min_withdrawal: int = GhadamRewards.MIN_WITHDRAWAL


@router.get("/balance", response_model=WalletBalance)
def get_balance(user: CurrentUserRequired):
    """Get current user's ghadam wallet balance."""
    return WalletBalance(
        ghadam_balance=user.ghadam_balance,
        total_earned=user.total_earned,
        total_spent=user.total_spent,
        total_withdrawn=user.total_withdrawn,
    )


@router.get("/transactions", response_model=list[TransactionRead])
def get_transactions(
    session: SessionDep,
    user: CurrentUserRequired,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Get user's transaction history."""
    query = (
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    transactions = session.exec(query).all()
    return transactions


@router.post("/withdraw", response_model=WithdrawResponse)
def withdraw(
    session: SessionDep,
    user: CurrentUserRequired,
    request: WithdrawRequest,
):
    """
    Request withdrawal of ghadams to real money.
    
    Minimum withdrawal: 500 ghadams
    Rate: 1 ghadam = 100 Toman
    """
    if request.amount < GhadamRewards.MIN_WITHDRAWAL:
        raise HTTPException(
            status_code=400,
            detail=f"حداقل مقدار برداشت {GhadamRewards.MIN_WITHDRAWAL} قدم است",
        )
    
    if user.ghadam_balance < request.amount:
        raise HTTPException(
            status_code=400,
            detail="موجودی کافی نیست",  # Insufficient balance
        )
    
    transaction = process_withdrawal(session, user, request.amount)
    
    if not transaction:
        raise HTTPException(
            status_code=400,
            detail="خطا در پردازش برداشت",  # Error processing withdrawal
        )
    
    money_value = request.amount * GhadamRewards.WITHDRAWAL_RATE
    
    return WithdrawResponse(
        success=True,
        message=f"درخواست برداشت {request.amount} قدم = {money_value:,} تومان ثبت شد",
        transaction=TransactionRead.model_validate(transaction),
        money_value=money_value,
    )


@router.get("/reward-rates", response_model=RewardRates)
def get_reward_rates():
    """Get current ghadam reward rates for all actions."""
    return RewardRates()
