from sqlalchemy.orm import Session
from models import User
from core.coins import CoinService

def complete_lesson(db: Session, user: User, lesson_id: str):
    """
    Marks a lesson as complete for a user and credits them with coins.
    """
    # In a real app, you would look up the lesson and mark it complete.
    # For now, we just credit the user.
    coin_service = CoinService(db)
    coin_service.credit(
        user_id=user.id,
        amount=100,
        description=f"Completed lesson: {lesson_id}"
    )
    return {"status": "success", "message": f"Lesson {lesson_id} completed. +100 coins."}

def get_recommended_lessons(db: Session, user: User):
    # Placeholder for lesson recommendation logic
    # In a real app, this would recommend lessons based on user weaknesses
    return [
        {
            "title": "Tactical Patterns: Pins and Skewers",
            "description": "Master the fundamental tactical motifs that appear in your games",
            "duration": "15 min",
            "difficulty": "Beginner",
            "rating": 4.8,
            "recommended": True,
        },
        {
            "title": "Sicilian Defense: Dragon Variation",
            "description": "Improve your opening play based on your recent games",
            "duration": "25 min",
            "difficulty": "Intermediate",
            "rating": 4.9,
            "recommended": True,
        },
    ]
