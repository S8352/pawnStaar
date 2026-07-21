from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Annotated
from core.analysis import StockfishService, GameAnalysis
from core.roasting_engine import RoastingEngine

router = APIRouter()

def get_stockfish_service():
    service = StockfishService()
    try:
        yield service
    finally:
        service.close()

@router.post("/analysis/", response_model=GameAnalysis)
async def analyze_game(
    pgn: Annotated[str, Body(embed=True)], 
    character_id: Annotated[int, Body(embed=True)] = 2,  # Default to Ben Finegold
    stockfish_service: StockfishService = Depends(get_stockfish_service)
):
    try:
        analysis = stockfish_service.analyze_pgn(pgn, character_id)
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@router.get("/characters")
async def get_characters():
    """Get list of available roasting characters"""
    roasting_engine = RoastingEngine()
    characters = roasting_engine.get_all_characters()
    return characters
