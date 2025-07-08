from typing import Optional, Dict, List
from .lichess import LichessService
from .chess_com import ChessComService
import asyncio

class PlatformService:
    def __init__(self):
        self.lichess = LichessService()
        self.chess_com = ChessComService()
    
    async def validate_username(self, platform: str, username: str) -> bool:
        """Validate if username exists on platform"""
        if platform == 'lichess':
            profile = await self.lichess.get_player_profile(username)
            return profile is not None
        elif platform == 'chess_com':
            profile = await self.chess_com.get_player_profile(username)
            return profile is not None
        return False
    
    async def get_profile_data(self, platform: str, username: str) -> Optional[Dict]:
        """Get unified profile data from platform"""
        if platform == 'lichess':
            profile = await self.lichess.get_player_profile(username)
            if profile:
                return {
                    'username': username,
                    'avatar_url': profile.get('profile', {}).get('avatar'),
                    'rating': profile.get('perfs', {}).get('blitz', {}).get('rating'),
                    'verified': True
                }
        elif platform == 'chess_com':
            profile = await self.chess_com.get_player_profile(username)
            if profile:
                return {
                    'username': username,
                    'avatar_url': profile.get('avatar'),
                    'rating': profile.get('stats', {}).get('chess_blitz', {}).get('last', {}).get('rating'),
                    'verified': True
                }
        return None
