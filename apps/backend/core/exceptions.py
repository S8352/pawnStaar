"""
Custom exceptions for PawnStaar platform integrations
"""

class PlatformAPIError(Exception):
    """Base exception for platform API errors"""
    def __init__(self, message: str, platform: str = None, status_code: int = None):
        self.message = message
        self.platform = platform
        self.status_code = status_code
        super().__init__(self.message)

class LichessAPIError(PlatformAPIError):
    """Lichess specific API errors"""
    def __init__(self, message: str, status_code: int = None):
        super().__init__(message, platform="lichess", status_code=status_code)

class ChessComAPIError(PlatformAPIError):
    """Chess.com specific API errors"""
    def __init__(self, message: str, status_code: int = None):
        super().__init__(message, platform="chess_com", status_code=status_code)

class RateLimitExceededError(PlatformAPIError):
    """Rate limit exceeded error"""
    def __init__(self, message: str = "Rate limit exceeded", platform: str = None):
        super().__init__(message, platform=platform, status_code=429)

class PlayerNotFoundError(PlatformAPIError):
    """Player not found on platform"""
    def __init__(self, username: str, platform: str = None):
        message = f"Player '{username}' not found"
        if platform:
            message += f" on {platform}"
        super().__init__(message, platform=platform, status_code=404)

class GameImportError(PlatformAPIError):
    """Error during game import process"""
    def __init__(self, message: str, platform: str = None, username: str = None):
        if username:
            message = f"Game import failed for user '{username}': {message}"
        super().__init__(message, platform=platform)

class AnalysisError(Exception):
    """Error during game analysis"""
    def __init__(self, message: str, game_id: str = None):
        self.game_id = game_id
        if game_id:
            message = f"Analysis failed for game '{game_id}': {message}"
        super().__init__(message)

# Chess.com specific exceptions
class ChessComPlayerNotFoundError(ChessComAPIError):
    """Chess.com player not found"""
    def __init__(self, message: str):
        super().__init__(message, status_code=404)

class ChessComRateLimitError(ChessComAPIError):
    """Chess.com rate limit exceeded"""
    def __init__(self, message: str = "Chess.com API rate limit exceeded"):
        super().__init__(message, status_code=429)

class ChessComTimeoutError(ChessComAPIError):
    """Chess.com API timeout"""
    def __init__(self, message: str):
        super().__init__(message, status_code=408)

class ChessComInvalidDataError(ChessComAPIError):
    """Chess.com invalid data error"""
    def __init__(self, message: str):
        super().__init__(message, status_code=400)
