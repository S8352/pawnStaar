from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    email = Column(String, unique=True, index=True)
    avatar_url = Column(String, nullable=True)
    lichess_username = Column(String, unique=True, index=True, nullable=True)
    chess_com_username = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=func.now())
    coin_balance = Column(Integer, nullable=False, default=500)
    lichess_avatar_url = Column(String, nullable=True)
    chess_com_avatar_url = Column(String, nullable=True)
    lichess_verified = Column(Boolean, default=False)
    chess_com_verified = Column(Boolean, default=False)
    lichess_rating = Column(Integer, nullable=True)
    chess_com_rating = Column(Integer, nullable=True)
    last_sync_lichess = Column(DateTime, nullable=True)
    last_sync_chess_com = Column(DateTime, nullable=True)

    games = relationship("Game", back_populates="user")
    coin_transactions = relationship("CoinTransaction", back_populates="user")

class Game(Base):
    __tablename__ = 'games'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'))
    pgn = Column(Text)
    created_at = Column(DateTime, default=func.now())
    platform = Column(String, nullable=False)  # 'lichess', 'chess_com', 'manual'
    platform_game_id = Column(String, nullable=True)
    time_control = Column(String, nullable=True)
    rated = Column(Boolean, default=True)
    variant = Column(String, default='standard')
    white_player = Column(String, nullable=True)
    black_player = Column(String, nullable=True)
    white_rating = Column(Integer, nullable=True)
    black_rating = Column(Integer, nullable=True)
    user_color = Column(String, nullable=True)  # 'white', 'black'
    result = Column(String, nullable=True)  # '1-0', '0-1', '1/2-1/2'
    termination = Column(String, nullable=True)
    played_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="games")
    analysis = relationship("GameAnalysis", back_populates="game", uselist=False)

class GameAnalysis(Base):
    __tablename__ = 'game_analysis'

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey('games.id'))
    results = Column(Text) # Store analysis as JSON string
    created_at = Column(DateTime, default=func.now())

    game = relationship("Game", back_populates="analysis")

class CoinTransaction(Base):
    __tablename__ = 'coin_transactions'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    amount = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now())

    user = relationship("User", back_populates="coin_transactions")

class Character(Base):
    __tablename__ = 'characters'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # 'hikaru_nakamura'
    display_name = Column(String(100), nullable=False)  # 'Hikaru Nakamura'
    description = Column(Text, nullable=True)
    personality_config = Column(JSON, nullable=False)  # Roasting templates
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

class BotGame(Base):
    __tablename__ = 'bot_games'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'))
    character_id = Column(Integer, ForeignKey('characters.id'))
    bot_rating = Column(Integer, nullable=False)  # 800-2500
    game_result = Column(String, nullable=True)  # 'win', 'loss', 'draw'
    pgn = Column(Text, nullable=True)
    current_position = Column(String, nullable=True)  # FEN
    move_history = Column(JSON, nullable=True)
    roast_history = Column(JSON, nullable=True)  # Real-time roasts
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
