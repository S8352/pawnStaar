from fastapi import Depends, HTTPException, status, WebSocket, Query
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import schemas
import models
from database import get_db, SessionLocal
from core.config import settings

# This is a placeholder. In a real application, you would decode a JWT token
# to get the user's ID and then fetch the user from the database.
def get_current_user(db: Session = Depends(get_db)) -> schemas.User:
    """
    A placeholder dependency to get the current user.
    In a real app, this would involve token validation.
    For now, it returns the first user in the database.
    """
    user = db.query(models.User).first()
    if user is None:
        raise HTTPException(
            status_code=404,
            detail="No users found in the database. Please create a user first.",
        )
    # Manually load transactions for the purpose of the history endpoint
    user.coin_transactions = db.query(models.CoinTransaction).filter(models.CoinTransaction.user_id == user.id).order_by(models.CoinTransaction.created_at.desc()).limit(20).all()
    return user

async def get_current_user_ws(
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.name == username).first()
    if user is None:
        raise credentials_exception
    return user
