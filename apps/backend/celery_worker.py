from celery import Celery
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Game, GameAnalysis
from core.lichess import LichessService
from core.chess_com import ChessComService
import json
from datetime import datetime

celery_app = Celery('pawnstaar')
celery_app.conf.broker_url = 'redis://localhost:6379/0'
celery_app.conf.result_backend = 'redis://localhost:6379/0'

@celery_app.task(bind=True)
def import_platform_games(self, user_id: str, platform: str, username: str, max_games: int = 100):
    """Import games from chess platform"""
    db = SessionLocal()
    
    try:
        # Update task progress
        self.update_state(state='PROGRESS', meta={'current': 0, 'total': max_games, 'status': 'Starting import...'})
        
        if platform == 'lichess':
            service = LichessService()
            games_data = service.import_games(user_id, username, max_games)
        elif platform == 'chess_com':
            service = ChessComService()
            games_data = asyncio.run(service.import_recent_games(username, max_games))
        else:
            raise ValueError(f"Unsupported platform: {platform}")
        
        imported_count = 0
        for i, game_data in enumerate(games_data):
            # Check if game already exists
            existing_game = db.query(Game).filter(
                Game.user_id == user_id,
                Game.platform == platform,
                Game.platform_game_id == game_data.get('platform_game_id')
            ).first()
            
            if not existing_game:
                # Create new game record
                game = Game(
                    user_id=user_id,
                    pgn=game_data['pgn'],
                    platform=platform,
                    platform_game_id=game_data.get('platform_game_id'),
                    time_control=game_data.get('time_control'),
                    rated=game_data.get('rated', True),
                    variant=game_data.get('variant', 'standard'),
                    white_player=game_data.get('white_player'),
                    black_player=game_data.get('black_player'),
                    white_rating=game_data.get('white_rating'),
                    black_rating=game_data.get('black_rating'),
                    user_color=game_data.get('user_color'),
                    result=game_data.get('result'),
                    termination=game_data.get('termination'),
                    played_at=datetime.fromisoformat(game_data.get('played_at', '')) if game_data.get('played_at') else None
                )
                db.add(game)
                imported_count += 1
            
            # Update progress
            progress = int((i + 1) / len(games_data) * 100)
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': i + 1,
                    'total': len(games_data),
                    'imported': imported_count,
                    'status': f'Imported {imported_count} new games...'
                }
            )
        
        db.commit()
        
        # Update user's last sync time
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            if platform == 'lichess':
                user.last_sync_lichess = datetime.utcnow()
            elif platform == 'chess_com':
                user.last_sync_chess_com = datetime.utcnow()
            db.commit()
        
        return {
            'status': 'completed',
            'imported': imported_count,
            'total_processed': len(games_data),
            'message': f'Successfully imported {imported_count} new games from {platform}'
        }
    
    except Exception as e:
        db.rollback()
        raise self.retry(exc=e, countdown=60, max_retries=3)
    
    finally:
        db.close()

@celery_app.task
def analyze_imported_games(user_id: str, game_ids: list):
    """Analyze newly imported games"""
    # Implementation for game analysis
    pass
