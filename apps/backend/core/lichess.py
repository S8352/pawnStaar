import berserk
import httpx
import asyncio
from typing import Optional, List, Dict, Any, AsyncGenerator
from datetime import datetime, timedelta
import logging
from core.config import settings
from core.exceptions import LichessAPIError, PlayerNotFoundError, RateLimitExceededError

logger = logging.getLogger(__name__)

class LichessService:
    def __init__(self, token: Optional[str] = None):
        """Initialize Lichess service with optional authentication token"""
        self.token = token
        self.base_url = settings.lichess_api_base
        
        # Initialize berserk client
        if token:
            session = berserk.TokenSession(token)
            self.client = berserk.Client(session)
        else:
            self.client = berserk.Client()
        
        # HTTP client for additional API calls not covered by berserk
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.lichess_request_timeout),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
        )
        
        self.rate_limit_delay = settings.lichess_rate_limit_delay
        self.last_request_time = 0
    
    async def _rate_limited_request(self, url: str, headers: Optional[Dict] = None) -> Optional[httpx.Response]:
        """Make rate-limited HTTP request"""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - time_since_last)
        
        try:
            response = await self.http_client.get(url, headers=headers or {})
            self.last_request_time = asyncio.get_event_loop().time()
            return response
        except httpx.RequestError as e:
            logger.error(f"Request error for {url}: {e}")
            raise LichessAPIError(f"Request failed: {e}")
    
    async def get_player_profile(self, username: str) -> Optional[Dict[str, Any]]:
        """Fetch player profile from Lichess"""
        try:
            # Use berserk for profile data
            profile = self.client.users.get_public_data(username)
            
            if not profile:
                return None
            
            # Get additional profile image if available
            avatar_url = None
            if profile.get('profile', {}).get('avatar'):
                avatar_url = f"https://lichess1.org/image/{profile['profile']['avatar']}"
            
            return {
                'id': profile.get('id'),
                'username': profile.get('username'),
                'title': profile.get('title'),
                'avatar_url': avatar_url,
                'online': profile.get('online'),
                'playing': profile.get('playing'),
                'streaming': profile.get('streaming'),
                'patron': profile.get('patron'),
                'verified': profile.get('verified', False),
                'profile': {
                    'country': profile.get('profile', {}).get('country'),
                    'location': profile.get('profile', {}).get('location'),
                    'bio': profile.get('profile', {}).get('bio'),
                    'firstName': profile.get('profile', {}).get('firstName'),
                    'lastName': profile.get('profile', {}).get('lastName'),
                    'links': profile.get('profile', {}).get('links')
                },
                'perfs': profile.get('perfs', {}),
                'created_at': datetime.fromtimestamp(profile.get('createdAt', 0) / 1000) if profile.get('createdAt') else None,
                'seen_at': datetime.fromtimestamp(profile.get('seenAt', 0) / 1000) if profile.get('seenAt') else None,
                'play_time': profile.get('playTime', {}),
                'count': profile.get('count', {})
            }
        except Exception as e:
            if "404" in str(e) or "not found" in str(e).lower():
                logger.info(f"Player {username} not found on Lichess")
                return None
            logger.error(f"Error fetching Lichess profile for {username}: {e}")
            raise LichessAPIError(f"Failed to fetch profile: {e}")
    
    async def get_player_rating(self, username: str, perf_type: str = 'blitz') -> Optional[int]:
        """Get player rating for specific performance type"""
        profile = await self.get_player_profile(username)
        if profile and profile.get('perfs', {}).get(perf_type):
            return profile['perfs'][perf_type].get('rating')
        return None
    
    def import_games(self, username: str, max_games: int = 100, **kwargs) -> List[Dict[str, Any]]:
        """Import games from Lichess with enhanced metadata"""
        try:
            # Default parameters for game export
            export_params = {
                'max': min(max_games, settings.lichess_max_games_per_import),
                'rated': kwargs.get('rated', True),
                'perf_type': kwargs.get('perf_types', ['blitz', 'rapid', 'classical', 'bullet']),
                'since': kwargs.get('since'),
                'until': kwargs.get('until'),
                'color': kwargs.get('color'),  # 'white', 'black', or None for both
                'analysed': kwargs.get('analysed'),
                'moves': True,  # Include moves in PGN
                'pgn_in_json': False,  # Get PGN as string
                'tags': True,  # Include PGN tags
                'clocks': True,  # Include clock times
                'evals': kwargs.get('evals', False),  # Include evaluations if available
                'opening': True  # Include opening information
            }
            
            # Remove None values
            export_params = {k: v for k, v in export_params.items() if v is not None}
            
            games_stream = self.client.games.export_by_player(username, **export_params)
            
            games = []
            for game in games_stream:
                try:
                    game_data = self._process_lichess_game(game, username)
                    if game_data:
                        games.append(game_data)
                except Exception as e:
                    logger.warning(f"Error processing game: {e}")
                    continue
            
            logger.info(f"Successfully imported {len(games)} games for {username} from Lichess")
            return games
            
        except Exception as e:
            logger.error(f"Error importing Lichess games for {username}: {e}")
            raise LichessAPIError(f"Game import failed: {e}")
    
    def _process_lichess_game(self, game, username: str) -> Optional[Dict[str, Any]]:
        """Process and normalize Lichess game data"""
        try:
            headers = game.headers
            
            # Extract player information
            white_player = headers.get('White', '').lower()
            black_player = headers.get('Black', '').lower()
            username_lower = username.lower()
            
            # Determine user color and ratings
            if white_player == username_lower:
                user_color = 'white'
                user_rating = self._extract_rating(headers.get('WhiteElo', ''))
                opponent_rating = self._extract_rating(headers.get('BlackElo', ''))
                opponent_username = black_player
            elif black_player == username_lower:
                user_color = 'black'
                user_rating = self._extract_rating(headers.get('BlackElo', ''))
                opponent_rating = self._extract_rating(headers.get('WhiteElo', ''))
                opponent_username = white_player
            else:
                logger.warning(f"User {username} not found in game players")
                return None
            
            # Extract game metadata
            site_url = headers.get('Site', '')
            game_id = site_url.split('/')[-1] if site_url else None
            
            # Parse date and time
            date_str = headers.get('UTCDate', '')
            time_str = headers.get('UTCTime', '')
            played_at = None
            if date_str and time_str:
                try:
                    played_at = datetime.strptime(f"{date_str} {time_str}", "%Y.%m.%d %H:%M:%S")
                except ValueError:
                    logger.warning(f"Could not parse game date: {date_str} {time_str}")
            
            # Extract time control
            time_control = headers.get('TimeControl', '')
            time_class = self._classify_time_control(time_control)
            
            return {
                'platform': 'lichess',
                'platform_game_id': game_id,
                'pgn': str(game),
                'url': site_url,
                'time_control': time_control,
                'time_class': time_class,
                'variant': headers.get('Variant', 'standard').lower(),
                'rated': headers.get('Event', '').lower() != 'casual game',
                'white_player': white_player,
                'black_player': black_player,
                'white_rating': self._extract_rating(headers.get('WhiteElo', '')),
                'black_rating': self._extract_rating(headers.get('BlackElo', '')),
                'user_color': user_color,
                'user_rating': user_rating,
                'opponent_rating': opponent_rating,
                'opponent_username': opponent_username,
                'result': headers.get('Result', ''),
                'termination': headers.get('Termination', ''),
                'opening': headers.get('Opening', ''),
                'eco': headers.get('ECO', ''),
                'played_at': played_at,
                'event': headers.get('Event', ''),
                'round': headers.get('Round', ''),
                'annotator': headers.get('Annotator', '')
            }
            
        except Exception as e:
            logger.error(f"Error processing Lichess game: {e}")
            return None
    
    def _extract_rating(self, rating_str: str) -> Optional[int]:
        """Extract numeric rating from string"""
        if not rating_str or rating_str == '?':
            return None
        try:
            return int(rating_str)
        except ValueError:
            return None
    
    def _classify_time_control(self, time_control: str) -> str:
        """Classify time control into standard categories"""
        if not time_control or time_control == '-':
            return 'unknown'
        
        try:
            # Parse time control format like "600+0" or "180+2"
            if '+' in time_control:
                base_time, increment = time_control.split('+')
                total_time = int(base_time) + int(increment) * 40  # Estimate for 40 moves
            else:
                total_time = int(time_control)
            
            if total_time < 180:  # Less than 3 minutes
                return 'bullet'
            elif total_time < 480:  # Less than 8 minutes
                return 'blitz'
            elif total_time < 1500:  # Less than 25 minutes
                return 'rapid'
            else:
                return 'classical'
                
        except (ValueError, IndexError):
            return 'unknown'
    
    async def get_game_analysis(self, game_id: str) -> Optional[Dict[str, Any]]:
        """Get computer analysis for a specific game if available"""
        try:
            url = f"{self.base_url}/game/{game_id}"
            headers = {'Accept': 'application/json'}
            
            response = await self._rate_limited_request(url, headers)
            if response and response.status_code == 200:
                game_data = response.json()
                return game_data.get('analysis')
            return None
            
        except Exception as e:
            logger.error(f"Error fetching game analysis for {game_id}: {e}")
            return None
    
    async def search_players(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for players by username"""
        try:
            url = f"{self.base_url}/player/autocomplete"
            params = {'term': query, 'limit': limit}
            
            response = await self.http_client.get(url, params=params)
            if response.status_code == 200:
                return response.json()
            return []
            
        except Exception as e:
            logger.error(f"Error searching players: {e}")
            return []
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()
