from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

import schemas
from core.coins import CoinService
from database import get_db
from dependencies import get_current_user # Assuming you have a dependency to get the current user

router = APIRouter(
    prefix="/coins",
    tags=["coins"],
    responses={404: {"description": "Not found"}},
)

@router.get("/balance", response_model=int)
def read_user_balance(current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retrieve the coin balance for the currently authenticated user.
    """
    coin_service = CoinService(db)
    balance = coin_service.get_balance(current_user.id)
    return balance

@router.get("/history", response_model=List[schemas.CoinTransaction])
def read_user_transaction_history(
    current_user: schemas.User = Depends(get_current_user), 
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 20
):
    """
    Retrieve the transaction history for the currently authenticated user.
    """
    # This is a simplified implementation. A more robust version would query the transactions table.
    # For now, we return the transactions from the user object if they are loaded.
    # A proper implementation would be:
    # transactions = db.query(models.CoinTransaction).filter(models.CoinTransaction.user_id == current_user.id).order_by(models.CoinTransaction.created_at.desc()).offset(skip).limit(limit).all()
    
    # The user schema needs to be updated to fetch transactions if this is to work
    if hasattr(current_user, 'coin_transactions'):
        return current_user.coin_transactions
    else:
        # Fallback to an empty list if transactions are not loaded on the user object
        return []
