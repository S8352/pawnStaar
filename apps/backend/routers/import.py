from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from celery.result import AsyncResult
from celery_worker import import_platform_games
from core.supabase import get_supabase_client
from supabase import Client

router = APIRouter()

class ImportRequest(BaseModel):
    platform: str
    username: str
    max_games: int = 100

@router.post("/start-import")
async def start_import(
    request: ImportRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """Start game import from chess platform"""
    try:
        user_response = supabase.auth.get_user()
        user_id = user_response.user.id
        
        # Start background task
        task = import_platform_games.delay(
            user_id, 
            request.platform, 
            request.username, 
            request.max_games
        )
        
        return {"task_id": task.id, "status": "started"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/import-status/{task_id}")
async def get_import_status(task_id: str):
    """Get import task status"""
    try:
        result = AsyncResult(task_id)
        
        if result.state == 'PENDING':
            response = {
                'state': result.state,
                'status': 'Task is waiting to be processed'
            }
        elif result.state == 'PROGRESS':
            response = {
                'state': result.state,
                'current': result.info.get('current', 0),
                'total': result.info.get('total', 1),
                'imported': result.info.get('imported', 0),
                'status': result.info.get('status', '')
            }
        elif result.state == 'SUCCESS':
            response = {
                'state': result.state,
                'result': result.info
            }
        else:  # FAILURE
            response = {
                'state': result.state,
                'error': str(result.info)
            }
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
