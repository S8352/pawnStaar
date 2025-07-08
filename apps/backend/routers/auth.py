from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from sqlalchemy.orm import Session

from core.supabase import get_supabase_client
from database import get_db
from core.coins import CoinService
import models
import schemas

router = APIRouter()

class UserCredentials(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register_user(credentials: UserCredentials, supabase: Client = Depends(get_supabase_client), db: Session = Depends(get_db)):
    try:
        # 1. Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": credentials.email,
            "password": credentials.password,
        })

        # Ensure we got a user back
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="User registration failed in Supabase.")

        # 2. Create user in local database
        new_user_id = auth_response.user.id
        db_user = models.User(
            id=new_user_id,
            email=credentials.email,
            # coin_balance is set by default in the model
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # 3. Create a transaction record for the initial coin grant.
        # The user's balance is already 500 by default from the model.
        # We create a transaction to reflect this in their history.
        initial_grant_transaction = models.CoinTransaction(
            user_id=new_user_id,
            amount=500,
            description="Initial account balance"
        )
        db.add(initial_grant_transaction)
        db.commit()

        return auth_response
    except Exception as e:
        # Basic error handling, a real app should be more specific
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login_user(credentials: UserCredentials, supabase: Client = Depends(get_supabase_client)):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password,
        })
        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
