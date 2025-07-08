from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from celery.result import AsyncResult
from celery_worker import analyze_game_task, celery_app
from core.lichess import LichessService

router = APIRouter()

@router.post("/pgn/{user_id}")
async def upload_pgn(user_id: str, file: UploadFile = File(...)):
    if not file.filename.endswith(".pgn"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .pgn file.")
    
    pgn_content = await file.read()
    pgn_string = pgn_content.decode("utf-8")
    
    # Queue the analysis task
    task = analyze_game_task.delay(user_id, pgn_string)
    
    return {"message": "PGN file uploaded and queued for analysis.", "task_id": task.id}

def get_lichess_service():
    return LichessService()

@router.post("/lichess/{user_id}")
async def import_lichess(user_id: str, username: str, lichess_service: LichessService = Depends(get_lichess_service)):
    try:
        task_ids = lichess_service.import_games(user_id, username)
        return {"message": f"Successfully queued {len(task_ids)} games for import and analysis.", "task_ids": task_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while importing from Lichess: {e}")

@router.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
    task_result = AsyncResult(task_id, app=celery_app)
    result = {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result
    }
    return result

@router.post("/chesscom")
async def import_chesscom(username: str):
    # Placeholder for Chess.com import logic
    return {"message": f"Importing games for Chess.com user {username} is not yet implemented."}
