from sqlalchemy.orm import Session
from models import User, GameAnalysis
from core.coins import CoinService

def complete_daily_workout(db: Session, user: User):
    """
    Marks the daily workout as complete for a user and credits them with coins.
    """
    coin_service = CoinService(db)
    coin_service.credit(
        user_id=user.id,
        amount=150,
        description="Daily workout completed"
    )
    return {"status": "success", "message": "Daily workout completed. +150 coins."}

def generate_daily_workout(db: Session, user: User):
    # Placeholder for workout generation logic
    # In a real app, this would analyze the user's recent games
    # and generate personalized puzzles and lessons.
    return [
        {
            "type": "puzzle",
            "title": "Tactical Puzzle",
            "description": "Solve a puzzle from one of your recent games.",
        },
        {
            "type": "lesson",
            "title": "Opening Principles",
            "description": "Review the basic principles of the opening.",
        },
    ]
