from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import json
import chess

from core.live import manager
from dependencies import get_current_user_ws
import schemas
from database import get_db

router = APIRouter()

@router.websocket("/ws/{token}")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: Session = Depends(get_db)
):
    user = await get_current_user_ws(token=token, db=db)
    if not user:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user.id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "challenge":
                await manager.create_challenge(
                    db,
                    challenger=user,
                    opponent_id=message["opponent_id"],
                    stake=message["stake"]
                )
            elif message["type"] == "accept_challenge":
                await manager.accept_challenge(
                    db,
                    game_id=message["game_id"],
                    user_id=user.id
                )
            elif message["type"] == "game_over":
                await manager.handle_game_over(
                    game_id=message["game_id"],
                    winner_id=message["winner_id"]
                )
            elif message["type"] == "make_move":
                await manager.make_move(
                    game_id=message["game_id"],
                    user_id=user.id,
                    move=message["move"]
                )
            
    except WebSocketDisconnect:
        manager.disconnect(user.id)
    except Exception as e:
        # Log the error
        print(f"An error occurred: {e}")
        await websocket.send_json({"type": "error", "message": str(e)})
