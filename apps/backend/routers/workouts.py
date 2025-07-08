from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import schemas
from core import workout as workout_core
from database import get_db
from dependencies import get_current_user

router = APIRouter(
    prefix="/workouts",
    tags=["workouts"],
    responses={404: {"description": "Not found"}},
)

@router.post("/complete")
def complete_workout_endpoint(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Endpoint to mark the daily workout as complete and receive coins.
    """
    return workout_core.complete_daily_workout(db, current_user)

@router.get("/daily")
def get_daily_workout_endpoint(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Endpoint to get the daily workout for the user.
    """
    return workout_core.generate_daily_workout(db, current_user)
