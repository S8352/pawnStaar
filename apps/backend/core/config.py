from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "a_very_secret_key"
    ALGORITHM: str = "HS256"
    chess_com_api_base: str = "https://api.chess.com/pub"
    lichess_api_base: str = "https://lichess.org/api"
    profile_image_cache_ttl: int = 86400  # 24 hours
    max_games_import: int = 100
    rate_limit_per_minute: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
