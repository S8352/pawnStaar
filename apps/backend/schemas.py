from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any

# CoinTransaction Schemas
class CoinTransactionBase(BaseModel):
    amount: int
    description: str

class CoinTransactionCreate(CoinTransactionBase):
    user_id: str

class CoinTransaction(CoinTransactionBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

# User Schemas
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    id: str

class User(UserBase):
    id: str
    created_at: datetime
    coin_balance: int
    coin_transactions: List[CoinTransaction] = []

    class Config:
        orm_mode = True

# Game Schemas
class GameBase(BaseModel):
    pgn: str

class GameCreate(GameBase):
    pass

class Game(GameBase):
    id: int
    user_id: str
    created_at: datetime
    analysis: Optional["GameAnalysis"] = None

    class Config:
        orm_mode = True

# GameAnalysis Schemas
class GameAnalysisBase(BaseModel):
    results: str # Storing as JSON string

class GameAnalysisCreate(GameAnalysisBase):
    pass

class GameAnalysis(GameAnalysisBase):
    id: int
    game_id: int
    created_at: datetime

    class Config:
        orm_mode = True

# This is needed to handle the circular dependency between Game and GameAnalysis
Game.update_forward_refs()
