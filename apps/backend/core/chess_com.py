"""
Chess.com API Service

This module provides a comprehensive interface to the Chess.com public API,
offering functionality for profile management, game import, and player search.
Designed to mirror the production-ready quality of the Lichess service.

Author: PawnStaar Development Team
Version: 1.0.0
"""

import httpx
import asyncio
import logging
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from urllib.parse import quote
import json
import re
from dataclasses import dataclass

from .config import get_settings
from .exceptions import (
    ChessComAPIError,
    ChessComPlayerNotFoundError,
    ChessComRateLimitError,
    ChessComTimeoutError,
    ChessComInvalidDataError
)

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class GameFilters:
    """Filters for game import"""
    time_control: Optional[str] = None
    rated: Optional[bool] = None
    color: Optional[str] = None  # 'white', 'black'
    min_rating: Optional[int] = None
    max_rating: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    max_games: int = 100

@dataclass
class ProfileData:
    """Standardized profile data"""
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
    verified: bool = True

@dataclass
class GameData:
    """Standardized game data"""
    platform_game_id: str
    pgn: str
    time_control: str
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

class ChessComService:
    """
    Comprehensive Chess.com API service with production-ready features.
    
    Features:
    - Profile management with avatar and rating data
    - Advanced game import with filtering capabilities
    - Rate limiting (300 requests/hour as per Chess.com limits)
    - Comprehensive error handling and logging
    - Data processing and normalization
    - Player search functionality
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://api.chess.com/pub"
        self.client = None
        self._rate_limiter = RateLimiter(max_requests=300, time_window=3600)  # 300/hour
        self._session_start = datetime.utcnow()
        
    async def __aenter__(self):
        """Async context manager entry"""
        await self._ensure_client()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
        
    async def _ensure_client(self):
        """Ensure HTTP client is initialized"""
        if self.client is None:
            timeout = httpx.Timeout(
                connect=self.settings.chess_com_connect_timeout,
                read=self.settings.chess_com_read_timeout,
                write=self.settings.chess_com_write_timeout,
                pool=self.settings.chess_com_pool_timeout
            )
            
            self.client = httpx.AsyncClient(
                timeout=timeout,
                headers={
                    "User-Agent": f"PawnStaar/{self.settings.app_version} (+{self.settings.app_url})",
                    "Accept": "application/json"
                },
                limits=httpx.Limits(
                    max_keepalive_connections=5,
                    max_connections=10
                )
            )
            
    async def close(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None
            
    async def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make rate-limited HTTP request to Chess.com API
        
        Args:
            endpoint: API endpoint (without base URL)
            params: Query parameters
            
        Returns:
            JSON response data
            
        Raises:
            ChessComAPIError: For API errors
            ChessComRateLimitError: When rate limit exceeded
            ChessComTimeoutError: On request timeout
        """
        await self._ensure_client()
        await self._rate_limiter.acquire()
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            logger.debug(f"Making Chess.com API request: {url}")
            response = await self.client.get(url, params=params)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                raise ChessComPlayerNotFoundError(f"Resource not found: {url}")
            elif response.status_code == 429:
                raise ChessComRateLimitError("Chess.com API rate limit exceeded")
            else:
                raise ChessComAPIError(
                    f"Chess.com API error: {response.status_code} - {response.text}",
                    status_code=response.status_code
                )
                
        except httpx.TimeoutException as e:
            logger.error(f"Chess.com API timeout: {url}")
            raise ChessComTimeoutError(f"Request timeout: {url}") from e
        except httpx.RequestError as e:
            logger.error(f"Chess.com API request error: {e}")
            raise ChessComAPIError(f"Request failed: {str(e)}") from e
            
    async def get_player_profile(self, username: str) -> Optional[ProfileData]:
        """
        Fetch comprehensive player profile from Chess.com
        
        Args:
            username: Chess.com username
            
        Returns:
            ProfileData object or None if not found
            
        Raises:
            ChessComAPIError: For API errors
        """
        try:
            # Normalize username
            username = username.lower().strip()
            if not self._is_valid_username(username):
                raise ChessComInvalidDataError(f"Invalid username format: {username}")
                
            # Fetch basic profile
            profile_data = await self._make_request(f"player/{username}")
            
            # Fetch stats
            stats_data = await self._make_request(f"player/{username}/stats")
            
            # Process and normalize data
            return self._process_profile_data(profile_data, stats_data)
            
        except ChessComPlayerNotFoundError:
            logger.info(f"Chess.com player not found: {username}")
            return None
        except ChessComInvalidDataError:
            # Validation errors are caller errors, not API failures — let them propagate.
            raise
        except Exception as e:
            logger.error(f"Error fetching Chess.com profile for {username}: {e}")
            raise ChessComAPIError(f"Failed to fetch profile: {str(e)}") from e
            
    async def import_games(
        self, 
        username: str, 
        filters: Optional[GameFilters] = None
    ) -> List[GameData]:
        """
        Import games from Chess.com with advanced filtering
        
        Args:
            username: Chess.com username
            filters: Game filtering options
            
        Returns:
            List of GameData objects
            
        Raises:
            ChessComAPIError: For API errors
        """
        if filters is None:
            filters = GameFilters()
            
        try:
            username = username.lower().strip()
            games = []
            
            # Get available archives
            archives = await self._get_player_archives(username)
            
            # Filter archives by date range if specified
            if filters.start_date or filters.end_date:
                archives = self._filter_archives_by_date(archives, filters)
                
            # Process archives (newest first)
            archives.reverse()
            
            for archive_url in archives:
                if len(games) >= filters.max_games:
                    break
                    
                try:
                    # Extract year/month from archive URL
                    year_month = self._extract_year_month_from_url(archive_url)
                    if not year_month:
                        continue
                        
                    # Fetch games for this month
                    month_games = await self._get_monthly_games(username, year_month)
                    
                    # Filter and process games
                    filtered_games = self._filter_games(month_games, filters, username)
                    games.extend(filtered_games)
                    
                    logger.info(f"Imported {len(filtered_games)} games from {year_month}")
                    
                except Exception as e:
                    logger.warning(f"Failed to import games from {archive_url}: {e}")
                    continue
                    
            # Sort by date (newest first) and limit
            games.sort(key=lambda g: g.played_at or datetime.min, reverse=True)
            return games[:filters.max_games]
            
        except Exception as e:
            logger.error(f"Error importing Chess.com games for {username}: {e}")
            raise ChessComAPIError(f"Failed to import games: {str(e)}") from e
            
    async def search_players(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Search for players (Chess.com doesn't have a direct search API,
        so this validates if a username exists)
        
        Args:
            query: Username to search for
            max_results: Maximum results (not used for Chess.com)
            
        Returns:
            List of player data if found
        """
        try:
            profile = await self.get_player_profile(query)
            if profile:
                return [{
                    'username': profile.username,
                    'display_name': profile.display_name,
                    'avatar_url': profile.avatar_url,
                    'country': profile.country,
                    'title': profile.title,
                    'rating': self._get_primary_rating(profile.ratings)
                }]
            return []
            
        except Exception as e:
            logger.error(f"Error searching Chess.com players: {e}")
            return []
            
    async def get_game_analysis(self, game_id: str) -> Optional[Dict[str, Any]]:
        """
        Get game analysis (Chess.com doesn't provide public analysis API)
        
        Args:
            game_id: Game identifier
            
        Returns:
            None (Chess.com doesn't provide public analysis)
        """
        logger.info("Chess.com doesn't provide public game analysis API")
        return None
        
    # Private helper methods
    
    async def _get_player_archives(self, username: str) -> List[str]:
        """Get list of available game archives for player"""
        data = await self._make_request(f"player/{username}/games/archives")
        return data.get('archives', [])
        
    async def _get_monthly_games(self, username: str, year_month: str) -> List[Dict]:
        """Get games for a specific month"""
        year, month = year_month.split('/')
        data = await self._make_request(f"player/{username}/games/{year}/{month}")
        return data.get('games', [])
        
    def _process_profile_data(self, profile_data: Dict, stats_data: Dict) -> ProfileData:
        """Process and normalize profile data"""
        # Extract ratings
        ratings = {}
        for game_type, stats in stats_data.items():
            if isinstance(stats, dict) and 'last' in stats:
                ratings[game_type] = {
                    'rating': stats['last'].get('rating'),
                    'rd': stats['last'].get('rd'),
                    'games': stats.get('record', {}).get('win', 0) + 
                            stats.get('record', {}).get('loss', 0) + 
                            stats.get('record', {}).get('draw', 0)
                }
                
        return ProfileData(
            username=profile_data.get('username', ''),
            display_name=profile_data.get('name'),
            avatar_url=profile_data.get('avatar'),
            country=profile_data.get('country', '').replace('https://api.chess.com/pub/country/', ''),
            title=profile_data.get('title'),
            followers=profile_data.get('followers'),
            is_streamer=profile_data.get('is_streamer', False),
            joined_date=self._parse_timestamp(profile_data.get('joined')),
            last_online=self._parse_timestamp(profile_data.get('last_online')),
            ratings=ratings,
            verified=True
        )
        
    def _filter_games(
        self, 
        games: List[Dict], 
        filters: GameFilters, 
        username: str
    ) -> List[GameData]:
        """Filter and process games based on criteria"""
        filtered_games = []
        
        for game in games:
            try:
                # Parse game data
                game_data = self._parse_game_data(game, username)
                if not game_data:
                    continue
                    
                # Apply filters
                if not self._game_matches_filters(game_data, filters):
                    continue
                    
                filtered_games.append(game_data)
                
            except Exception as e:
                logger.warning(f"Failed to process game: {e}")
                continue
                
        return filtered_games
        
    def _parse_game_data(self, game: Dict, username: str) -> Optional[GameData]:
        """Parse Chess.com game data into standardized format"""
        try:
            # Extract basic game info
            white_player = game.get('white', {}).get('username', '')
            black_player = game.get('black', {}).get('username', '')
            
            # Determine user color
            user_color = None
            if white_player.lower() == username.lower():
                user_color = 'white'
            elif black_player.lower() == username.lower():
                user_color = 'black'
                
            # Parse time control
            time_control = self._parse_time_control(game.get('time_control', ''))
            
            # Parse result
            result = self._parse_result(game.get('white', {}), game.get('black', {}))
            
            return GameData(
                platform_game_id=game.get('url', '').split('/')[-1],
                pgn=game.get('pgn', ''),
                time_control=time_control,
                rated=game.get('rated', True),
                variant=game.get('rules', 'chess'),
                white_player=white_player,
                black_player=black_player,
                white_rating=game.get('white', {}).get('rating'),
                black_rating=game.get('black', {}).get('rating'),
                user_color=user_color,
                result=result,
                termination=game.get('end_time') and 'Normal' or 'Unknown',
                played_at=self._parse_timestamp(game.get('end_time')),
                opening=self._extract_opening_from_pgn(game.get('pgn', '')),
                analysis_available=False
            )
            
        except Exception as e:
            logger.warning(f"Failed to parse game data: {e}")
            return None
            
    def _game_matches_filters(self, game: GameData, filters: GameFilters) -> bool:
        """Check if game matches the specified filters"""
        # Time control filter
        if filters.time_control and not self._matches_time_control(game.time_control, filters.time_control):
            return False
            
        # Rated filter
        if filters.rated is not None and game.rated != filters.rated:
            return False
            
        # Color filter
        if filters.color and game.user_color != filters.color:
            return False
            
        # Rating filters
        user_rating = None
        if game.user_color == 'white':
            user_rating = game.white_rating
        elif game.user_color == 'black':
            user_rating = game.black_rating
            
        if user_rating:
            if filters.min_rating and user_rating < filters.min_rating:
                return False
            if filters.max_rating and user_rating > filters.max_rating:
                return False
                
        # Date filters
        if filters.start_date and game.played_at and game.played_at < filters.start_date:
            return False
        if filters.end_date and game.played_at and game.played_at > filters.end_date:
            return False
            
        return True
        
    def _parse_time_control(self, time_control: str) -> str:
        """Parse Chess.com time control format"""
        if not time_control:
            return 'unknown'
            
        # Chess.com format: "300" (5 minutes), "600+5" (10+5), etc.
        if '+' in time_control:
            base, increment = time_control.split('+')
            return f"{int(base)}+{int(increment)}"
        else:
            return str(int(time_control))
            
    def _classify_time_control(self, time_control: str) -> str:
        """Classify time control into bullet/blitz/rapid/classical"""
        if not time_control or time_control == 'unknown':
            return 'unknown'
            
        try:
            # Extract base time in seconds
            base_time = int(time_control.split('+')[0])
            
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
            
    def _parse_result(self, white_data: Dict, black_data: Dict) -> str:
        """Parse game result from player data"""
        white_result = white_data.get('result', '')
        black_result = black_data.get('result', '')
        
        if white_result == 'win':
            return '1-0'
        elif black_result == 'win':
            return '0-1'
        elif white_result in ['draw', 'stalemate', 'repetition', 'insufficient']:
            return '1/2-1/2'
        else:
            return '*'
            
    def _parse_timestamp(self, timestamp: Optional[int]) -> Optional[datetime]:
        """Parse Unix timestamp to datetime"""
        if timestamp:
            try:
                return datetime.fromtimestamp(timestamp)
            except (ValueError, TypeError):
                pass
        return None
        
    def _extract_opening_from_pgn(self, pgn: str) -> Optional[str]:
        """Extract opening name from PGN"""
        if not pgn:
            return None
            
        # Look for ECO or Opening tags
        eco_match = re.search(r'\[ECO "([^"]+)"\]', pgn)
        opening_match = re.search(r'\[Opening "([^"]+)"\]', pgn)
        
        if opening_match:
            return opening_match.group(1)
        elif eco_match:
            return eco_match.group(1)
            
        return None
        
    def _is_valid_username(self, username: str) -> bool:
        """Validate Chess.com username format"""
        if not username or len(username) < 3 or len(username) > 25:
            return False
        return re.match(r'^[a-zA-Z0-9_-]+$', username) is not None
        
    def _extract_year_month_from_url(self, url: str) -> Optional[str]:
        """Extract year/month from archive URL"""
        match = re.search(r'/(\d{4})/(\d{2})$', url)
        if match:
            return f"{match.group(1)}/{match.group(2)}"
        return None
        
    def _filter_archives_by_date(self, archives: List[str], filters: GameFilters) -> List[str]:
        """Filter archive URLs by date range"""
        filtered = []
        
        for archive_url in archives:
            year_month = self._extract_year_month_from_url(archive_url)
            if not year_month:
                continue
                
            try:
                year, month = map(int, year_month.split('/'))
                archive_date = datetime(year, month, 1)
                
                # Check date filters
                if filters.start_date and archive_date < filters.start_date.replace(day=1):
                    continue
                if filters.end_date and archive_date > filters.end_date.replace(day=1):
                    continue
                    
                filtered.append(archive_url)
                
            except (ValueError, AttributeError):
                continue
                
        return filtered
        
    def _matches_time_control(self, game_tc: str, filter_tc: str) -> bool:
        """Check if game time control matches filter"""
        if filter_tc in ['bullet', 'blitz', 'rapid', 'classical']:
            return self._classify_time_control(game_tc) == filter_tc
        return game_tc == filter_tc
        
    def _get_primary_rating(self, ratings: Dict[str, Dict]) -> Optional[int]:
        """Get primary rating for display"""
        # Prefer rapid, then blitz, then bullet
        for game_type in ['chess_rapid', 'chess_blitz', 'chess_bullet']:
            if game_type in ratings and ratings[game_type].get('rating'):
                return ratings[game_type]['rating']
        return None


class RateLimiter:
    """Rate limiter for Chess.com API (300 requests per hour)"""
    
    def __init__(self, max_requests: int, time_window: int):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
        self._lock = asyncio.Lock()
        
    async def acquire(self):
        """Acquire permission to make a request"""
        async with self._lock:
            now = datetime.utcnow()
            
            # Remove old requests outside the time window
            cutoff = now - timedelta(seconds=self.time_window)
            self.requests = [req_time for req_time in self.requests if req_time > cutoff]
            
            # Check if we can make a request
            if len(self.requests) >= self.max_requests:
                # Calculate wait time
                oldest_request = min(self.requests)
                wait_time = (oldest_request + timedelta(seconds=self.time_window) - now).total_seconds()
                
                if wait_time > 0:
                    logger.info(f"Rate limit reached, waiting {wait_time:.1f} seconds")
                    await asyncio.sleep(wait_time)
                    
            # Record this request
            self.requests.append(now)
