"""
Unified Platform Service

This module provides a unified interface for interacting with multiple chess platforms
(Lichess and Chess.com), abstracting platform-specific differences and providing
consistent data formats and error handling.

Author: PawnStaar Development Team
Version: 1.0.0
"""

import asyncio
import logging
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

from .lichess import LichessService
from .chess_com import ChessComService, GameFilters as ChessComGameFilters
from .exceptions import (
    PlatformAPIError,
    LichessAPIError,
    ChessComAPIError,
    PlayerNotFoundError,
    GameImportError
)

# Configure logging
logger = logging.getLogger(__name__)

class Platform(Enum):
    """Supported chess platforms"""
    LICHESS = "lichess"
    CHESS_COM = "chess_com"

@dataclass
class UnifiedProfileData:
    """Unified profile data across platforms"""
    platform: str
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    country: Optional[str]
    title: Optional[str]
    followers: Optional[int]
    is_streamer: bool
    joined_date: Optional[datetime]
    last_online: Optional[datetime]
    ratings: Dict[str, Dict[str, Any]]
    verified: bool
    platform_url: Optional[str] = None

@dataclass
class UnifiedGameData:
    """Unified game data across platforms"""
    platform: str
    platform_game_id: str
    pgn: str
    time_control: str
    time_control_category: str  # bullet, blitz, rapid, classical
    rated: bool
    variant: str
    white_player: str
    black_player: str
    white_rating: Optional[int]
    black_rating: Optional[int]
    user_color: Optional[str]
    result: str
    termination: str
    played_at: datetime
    opening: Optional[str] = None
    analysis_available: bool = False
    platform_url: Optional[str] = None

@dataclass
class UnifiedGameFilters:
    """Unified game filters across platforms"""
    time_control: Optional[str] = None
    time_control_category: Optional[str] = None  # bullet, blitz, rapid, classical
    rated: Optional[bool] = None
    color: Optional[str] = None  # 'white', 'black'
    min_rating: Optional[int] = None
    max_rating: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_games: int = 100
    platforms: Optional[List[str]] = None  # Filter by specific platforms

@dataclass
class ImportProgress:
    """Progress tracking for game imports"""
    platform: str
    username: str
    total_games: int
    imported_games: int
    failed_games: int
    status: str  # 'running', 'completed', 'failed'
    error_message: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class PlatformService:
    """
    Unified service for interacting with multiple chess platforms.
    
    Features:
    - Unified interface for profile management
    - Cross-platform game import with filtering
    - Data normalization and standardization
    - Comprehensive error handling
    - Performance optimization with caching
    - Progress tracking for long-running operations
    """
    
    def __init__(self):
        self._lichess_service = None
        self._chess_com_service = None
        self._profile_cache = {}  # Simple in-memory cache
        self._cache_ttl = 300  # 5 minutes
        
    async def __aenter__(self):
        """Async context manager entry"""
        await self._ensure_services()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
        
    async def _ensure_services(self):
        """Ensure platform services are initialized"""
        if self._lichess_service is None:
            self._lichess_service = LichessService()
            
        if self._chess_com_service is None:
            self._chess_com_service = ChessComService()
            await self._chess_com_service._ensure_client()
            
    async def close(self):
        """Close all platform services"""
        if self._lichess_service:
            await self._lichess_service.close()
            self._lichess_service = None
            
        if self._chess_com_service:
            await self._chess_com_service.close()
            self._chess_com_service = None
            
    async def validate_username(self, platform: str, username: str) -> bool:
        """
        Validate if username exists on platform
        
        Args:
            platform: Platform name ('lichess' or 'chess_com')
            username: Username to validate
            
        Returns:
            True if username exists, False otherwise
            
        Raises:
            PlatformAPIError: For API errors
        """
        try:
            await self._ensure_services()
            
            if platform == Platform.LICHESS.value:
                profile = await self._lichess_service.get_player_profile(username)
                return profile is not None
            elif platform == Platform.CHESS_COM.value:
                profile = await self._chess_com_service.get_player_profile(username)
                return profile is not None
            else:
                raise PlatformAPIError(f"Unsupported platform: {platform}")
                
        except (LichessAPIError, ChessComAPIError) as e:
            logger.error(f"Error validating username {username} on {platform}: {e}")
            raise PlatformAPIError(f"Failed to validate username: {str(e)}", platform=platform) from e
        except Exception as e:
            logger.error(f"Unexpected error validating username {username} on {platform}: {e}")
            raise PlatformAPIError(f"Validation failed: {str(e)}", platform=platform) from e
            
    async def get_profile_data(
        self, 
        platform: str, 
        username: str,
        use_cache: bool = True
    ) -> Optional[UnifiedProfileData]:
        """
        Get unified profile data from platform
        
        Args:
            platform: Platform name ('lichess' or 'chess_com')
            username: Username to fetch
            use_cache: Whether to use cached data
            
        Returns:
            UnifiedProfileData object or None if not found
            
        Raises:
            PlatformAPIError: For API errors
        """
        try:
            # Check cache first
            cache_key = f"{platform}:{username.lower()}"
            if use_cache and cache_key in self._profile_cache:
                cached_data, timestamp = self._profile_cache[cache_key]
                if (datetime.utcnow() - timestamp).total_seconds() < self._cache_ttl:
                    logger.debug(f"Using cached profile data for {username} on {platform}")
                    return cached_data
                    
            await self._ensure_services()
            
            profile_data = None
            
            if platform == Platform.LICHESS.value:
                lichess_profile = await self._lichess_service.get_player_profile(username)
                if lichess_profile:
                    profile_data = self._normalize_lichess_profile(lichess_profile, username)
                    
            elif platform == Platform.CHESS_COM.value:
                chess_com_profile = await self._chess_com_service.get_player_profile(username)
                if chess_com_profile:
                    profile_data = self._normalize_chess_com_profile(chess_com_profile, username)
                    
            else:
                raise PlatformAPIError(f"Unsupported platform: {platform}")
                
            # Cache the result
            if profile_data and use_cache:
                self._profile_cache[cache_key] = (profile_data, datetime.utcnow())
                
            return profile_data
            
        except (LichessAPIError, ChessComAPIError) as e:
            logger.error(f"Error fetching profile {username} on {platform}: {e}")
            if "not found" in str(e).lower():
                return None
            raise PlatformAPIError(f"Failed to fetch profile: {str(e)}", platform=platform) from e
        except Exception as e:
            logger.error(f"Unexpected error fetching profile {username} on {platform}: {e}")
            raise PlatformAPIError(f"Profile fetch failed: {str(e)}", platform=platform) from e
            
    async def import_games(
        self,
        platform: str,
        username: str,
        filters: Optional[UnifiedGameFilters] = None
    ) -> List[UnifiedGameData]:
        """
        Import games from platform with unified filtering
        
        Args:
            platform: Platform name ('lichess' or 'chess_com')
            username: Username to import games for
            filters: Game filtering options
            
        Returns:
            List of UnifiedGameData objects
            
        Raises:
            GameImportError: For import errors
        """
        if filters is None:
            filters = UnifiedGameFilters()
            
        try:
            await self._ensure_services()
            
            games = []
            
            if platform == Platform.LICHESS.value:
                # Convert unified filters to Lichess format
                lichess_filters = self._convert_to_lichess_filters(filters)
                lichess_games = await self._lichess_service.import_games(username, lichess_filters)
                games = [self._normalize_lichess_game(game, username) for game in lichess_games]
                
            elif platform == Platform.CHESS_COM.value:
                # Convert unified filters to Chess.com format
                chess_com_filters = self._convert_to_chess_com_filters(filters)
                chess_com_games = await self._chess_com_service.import_games(username, chess_com_filters)
                games = [self._normalize_chess_com_game(game, username) for game in chess_com_games]
                
            else:
                raise GameImportError(f"Unsupported platform: {platform}", platform=platform, username=username)
                
            logger.info(f"Successfully imported {len(games)} games from {platform} for {username}")
            return games
            
        except (LichessAPIError, ChessComAPIError) as e:
            logger.error(f"Error importing games from {platform} for {username}: {e}")
            raise GameImportError(f"Failed to import games: {str(e)}", platform=platform, username=username) from e
        except Exception as e:
            logger.error(f"Unexpected error importing games from {platform} for {username}: {e}")
            raise GameImportError(f"Game import failed: {str(e)}", platform=platform, username=username) from e
            
    async def import_games_from_multiple_platforms(
        self,
        platforms_usernames: Dict[str, str],
        filters: Optional[UnifiedGameFilters] = None
    ) -> Dict[str, List[UnifiedGameData]]:
        """
        Import games from multiple platforms concurrently
        
        Args:
            platforms_usernames: Dict mapping platform names to usernames
            filters: Game filtering options
            
        Returns:
            Dict mapping platform names to lists of games
            
        Raises:
            GameImportError: For import errors
        """
        if filters is None:
            filters = UnifiedGameFilters()
            
        try:
            # Create import tasks for each platform
            tasks = []
            platform_names = []
            
            for platform, username in platforms_usernames.items():
                if platform in [Platform.LICHESS.value, Platform.CHESS_COM.value]:
                    task = self.import_games(platform, username, filters)
                    tasks.append(task)
                    platform_names.append(platform)
                    
            # Execute imports concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            games_by_platform = {}
            for platform, result in zip(platform_names, results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to import games from {platform}: {result}")
                    games_by_platform[platform] = []
                else:
                    games_by_platform[platform] = result
                    
            return games_by_platform
            
        except Exception as e:
            logger.error(f"Error in multi-platform import: {e}")
            raise GameImportError(f"Multi-platform import failed: {str(e)}") from e
            
    async def search_players(
        self,
        query: str,
        platforms: Optional[List[str]] = None,
        max_results: int = 10
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Search for players across platforms
        
        Args:
            query: Search query (username)
            platforms: List of platforms to search (default: all)
            max_results: Maximum results per platform
            
        Returns:
            Dict mapping platform names to lists of player data
        """
        if platforms is None:
            platforms = [Platform.LICHESS.value, Platform.CHESS_COM.value]
            
        try:
            await self._ensure_services()
            
            # Create search tasks
            tasks = []
            platform_names = []
            
            for platform in platforms:
                if platform == Platform.LICHESS.value:
                    task = self._lichess_service.search_players(query, max_results)
                elif platform == Platform.CHESS_COM.value:
                    task = self._chess_com_service.search_players(query, max_results)
                else:
                    continue
                    
                tasks.append(task)
                platform_names.append(platform)
                
            # Execute searches concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            players_by_platform = {}
            for platform, result in zip(platform_names, results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to search players on {platform}: {result}")
                    players_by_platform[platform] = []
                else:
                    players_by_platform[platform] = result
                    
            return players_by_platform
            
        except Exception as e:
            logger.error(f"Error searching players: {e}")
            return {platform: [] for platform in platforms}
            
    async def get_game_analysis(
        self,
        platform: str,
        game_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get game analysis from platform
        
        Args:
            platform: Platform name
            game_id: Game identifier
            
        Returns:
            Analysis data or None if not available
        """
        try:
            await self._ensure_services()
            
            if platform == Platform.LICHESS.value:
                return await self._lichess_service.get_game_analysis(game_id)
            elif platform == Platform.CHESS_COM.value:
                return await self._chess_com_service.get_game_analysis(game_id)
            else:
                logger.warning(f"Unsupported platform for analysis: {platform}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting analysis for game {game_id} on {platform}: {e}")
            return None
            
    # Private helper methods for data normalization
    
    def _normalize_lichess_profile(self, profile: Dict[str, Any], username: str) -> UnifiedProfileData:
        """Normalize Lichess profile data to unified format"""
        return UnifiedProfileData(
            platform=Platform.LICHESS.value,
            username=profile.get('username', username),
            display_name=profile.get('profile', {}).get('realName'),
            avatar_url=self._get_lichess_avatar_url(username),
            country=profile.get('profile', {}).get('country'),
            title=profile.get('title'),
            followers=profile.get('nbFollowers'),
            is_streamer=profile.get('streamer', False),
            joined_date=self._parse_lichess_timestamp(profile.get('createdAt')),
            last_online=self._parse_lichess_timestamp(profile.get('seenAt')),
            ratings=self._normalize_lichess_ratings(profile.get('perfs', {})),
            verified=True,
            platform_url=f"https://lichess.org/@/{username}"
        )
        
    def _normalize_chess_com_profile(self, profile, username: str) -> UnifiedProfileData:
        """Normalize Chess.com profile data to unified format"""
        return UnifiedProfileData(
            platform=Platform.CHESS_COM.value,
            username=profile.username,
            display_name=profile.display_name,
            avatar_url=profile.avatar_url,
            country=profile.country,
            title=profile.title,
            followers=profile.followers,
            is_streamer=profile.is_streamer,
            joined_date=profile.joined_date,
            last_online=profile.last_online,
            ratings=self._normalize_chess_com_ratings(profile.ratings),
            verified=profile.verified,
            platform_url=f"https://www.chess.com/member/{username}"
        )
        
    def _normalize_lichess_game(self, game: Dict[str, Any], username: str) -> UnifiedGameData:
        """Normalize Lichess game data to unified format"""
        # This would need to be implemented based on the actual Lichess game data structure
        # For now, returning a placeholder
        return UnifiedGameData(
            platform=Platform.LICHESS.value,
            platform_game_id=game.get('id', ''),
            pgn=game.get('pgn', ''),
            time_control=game.get('time_control', ''),
            time_control_category=self._classify_time_control(game.get('time_control', '')),
            rated=game.get('rated', True),
            variant=game.get('variant', 'standard'),
            white_player=game.get('white_player', ''),
            black_player=game.get('black_player', ''),
            white_rating=game.get('white_rating'),
            black_rating=game.get('black_rating'),
            user_color=game.get('user_color'),
            result=game.get('result', ''),
            termination=game.get('termination', ''),
            played_at=game.get('played_at', datetime.utcnow()),
            opening=game.get('opening'),
            analysis_available=game.get('analysis_available', False),
            platform_url=f"https://lichess.org/{game.get('id', '')}"
        )
        
    def _normalize_chess_com_game(self, game, username: str) -> UnifiedGameData:
        """Normalize Chess.com game data to unified format"""
        return UnifiedGameData(
            platform=Platform.CHESS_COM.value,
            platform_game_id=game.platform_game_id,
            pgn=game.pgn,
            time_control=game.time_control,
            time_control_category=self._classify_time_control(game.time_control),
            rated=game.rated,
            variant=game.variant,
            white_player=game.white_player,
            black_player=game.black_player,
            white_rating=game.white_rating,
            black_rating=game.black_rating,
            user_color=game.user_color,
            result=game.result,
            termination=game.termination,
            played_at=game.played_at,
            opening=game.opening,
            analysis_available=game.analysis_available,
            platform_url=f"https://www.chess.com/game/live/{game.platform_game_id}"
        )
        
    def _convert_to_lichess_filters(self, filters: UnifiedGameFilters) -> Dict[str, Any]:
        """Convert unified filters to Lichess format"""
        # This would need to be implemented based on the actual Lichess service interface
        return {
            'max_games': filters.max_games,
            'rated': filters.rated,
            'time_control': filters.time_control,
            'color': filters.color,
            'min_rating': filters.min_rating,
            'max_rating': filters.max_rating,
            'start_date': filters.start_date,
            'end_date': filters.end_date
        }
        
    def _convert_to_chess_com_filters(self, filters: UnifiedGameFilters) -> ChessComGameFilters:
        """Convert unified filters to Chess.com format"""
        return ChessComGameFilters(
            time_control=filters.time_control,
            rated=filters.rated,
            color=filters.color,
            min_rating=filters.min_rating,
            max_rating=filters.max_rating,
            start_date=filters.start_date,
            end_date=filters.end_date,
            max_games=filters.max_games
        )
        
    def _normalize_lichess_ratings(self, perfs: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Normalize Lichess ratings to unified format"""
        normalized = {}
        for perf_type, perf_data in perfs.items():
            if isinstance(perf_data, dict) and 'rating' in perf_data:
                normalized[perf_type] = {
                    'rating': perf_data.get('rating'),
                    'rd': perf_data.get('rd'),
                    'games': perf_data.get('games', 0)
                }
        return normalized
        
    def _normalize_chess_com_ratings(self, ratings: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Normalize Chess.com ratings to unified format"""
        # Chess.com ratings are already in a good format
        return ratings
        
    def _classify_time_control(self, time_control: str) -> str:
        """Classify time control into bullet/blitz/rapid/classical"""
        if not time_control or time_control == 'unknown':
            return 'unknown'
            
        try:
            # Extract base time in seconds
            if '+' in time_control:
                base_time = int(time_control.split('+')[0])
            else:
                base_time = int(time_control)
                
            if base_time < 180:  # < 3 minutes
                return 'bullet'
            elif base_time < 600:  # < 10 minutes
                return 'blitz'
            elif base_time < 1800:  # < 30 minutes
                return 'rapid'
            else:
                return 'classical'
                
        except (ValueError, IndexError):
            return 'unknown'
            
    def _get_lichess_avatar_url(self, username: str) -> str:
        """Generate Lichess avatar URL"""
        return f"https://lichess1.org/assets/images/icons/{username[0].lower()}.png"
        
    def _parse_lichess_timestamp(self, timestamp: Optional[int]) -> Optional[datetime]:
        """Parse Lichess timestamp to datetime"""
        if timestamp:
            try:
                return datetime.fromtimestamp(timestamp / 1000)  # Lichess uses milliseconds
            except (ValueError, TypeError):
                pass
        return None
        
    def get_supported_platforms(self) -> List[str]:
        """Get list of supported platforms"""
        return [Platform.LICHESS.value, Platform.CHESS_COM.value]
        
    def clear_cache(self):
        """Clear profile cache"""
        self._profile_cache.clear()
        logger.info("Profile cache cleared")
        
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'cached_profiles': len(self._profile_cache),
            'cache_ttl': self._cache_ttl
        }
