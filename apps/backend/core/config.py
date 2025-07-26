from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    SECRET_KEY: str = "a_very_secret_key"
    ALGORITHM: str = "HS256"
    chess_com_api_base: str = "https://api.chess.com/pub"
    lichess_api_base: str = "https://lichess.org/api"
    profile_image_cache_ttl: int = 86400  # 24 hours
    max_games_import: int = 100
    rate_limit_per_minute: int = 30
    
    # Lichess API Configuration
    lichess_rate_limit_delay: float = 0.5  # 2 requests per second
    lichess_request_timeout: int = 30
    lichess_max_games_per_import: int = 200
    lichess_max_months_lookback: int = 12
    
    # Chess.com API Configuration
    chess_com_rate_limit: int = 300  # requests per hour
    chess_com_connect_timeout: int = 10
    chess_com_read_timeout: int = 30
    chess_com_write_timeout: int = 10
    chess_com_pool_timeout: int = 10
    chess_com_max_games_per_import: int = 200
    chess_com_max_months_lookback: int = 12
    
    # Application settings
    app_version: str = "1.0.0"
    app_url: str = "https://pawnstaar.com"
    
    # Database and external services
    database_url: str = "postgresql://user:password@localhost/pawnstaar"
    supabase_url: str = ""
    supabase_service_key: str = ""
    SENTRY_DSN: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()

def get_settings() -> Settings:
    """Get application settings"""
    return settings
