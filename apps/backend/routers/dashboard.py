from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from core.workout import generate_daily_workout
from core.progress import get_user_progress
from core.lessons import get_recommended_lessons
from core.supabase import get_supabase_client
from supabase import Client

router = APIRouter()

@router.get("/workout")
async def get_daily_workout(db: Session = Depends(get_db), supabase: Client = Depends(get_supabase_client)):
    user_response = supabase.auth.get_user()
    user_id = user_response.user.id
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return generate_daily_workout(db, user)

@router.get("/progress")
async def get_progress(db: Session = Depends(get_db), supabase: Client = Depends(get_supabase_client)):
    user_response = supabase.auth.get_user()
    user_id = user_response.user.id
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return get_user_progress(db, user)

@router.get("/lessons")
async def get_lessons(db: Session = Depends(get_db), supabase: Client = Depends(get_supabase_client)):
    user_response = supabase.auth.get_user()
    user_id = user_response.user.id
    user = db.query(models.User).filter(models.User.id == user_id).first()
    return get_recommended_lessons(db, user)

@router.get("/games", response_model=List[schemas.Game])
async def get_games(db: Session = Depends(get_db), supabase: Client = Depends(get_supabase_client)):
    user_response = supabase.auth.get_user()
    user_id = user_response.user.id
    games = db.query(models.Game).filter(models.Game.user_id == user_id).all()
    return games
