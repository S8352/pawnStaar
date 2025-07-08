from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

import schemas
from core import lessons as lessons_core
from database import get_db
from dependencies import get_current_user

router = APIRouter(
    prefix="/lessons",
    tags=["lessons"],
    responses={404: {"description": "Not found"}},
)

class LessonCompletionRequest(schemas.BaseModel):
    lesson_id: str

@router.post("/complete")
def complete_lesson_endpoint(
    request: LessonCompletionRequest,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Endpoint to mark a lesson as complete and receive coins.
    """
    return lessons_core.complete_lesson(db, current_user, request.lesson_id)

@router.get("/recommended")
def get_recommended_lessons_endpoint(
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    """
    Endpoint to get recommended lessons for the user.
    """
    return lessons_core.get_recommended_lessons(db, current_user)
