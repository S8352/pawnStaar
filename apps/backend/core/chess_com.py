import httpx
import asyncio
from typing import Optional, List, Dict
from datetime import datetime

class ChessComService:
    def __init__(self):
        self.base_url = "https://api.chess.com/pub"
        self.client = httpx.AsyncClient()
    
    async def get_player_profile(self, username: str) -> Optional[Dict]:
        """Fetch player profile from Chess.com"""
        try:
            response = await self.client.get(f"{self.base_url}/player/{username}")
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error fetching Chess.com profile: {e}")
            return None
    
    async def get_player_games(self, username: str, year: int, month: int) -> List[Dict]:
        """Fetch games for a specific month"""
        try:
            url = f"{self.base_url}/player/{username}/games/{year}/{month:02d}"
            response = await self.client.get(url)
            if response.status_code == 200:
                data = response.json()
                return data.get('games', [])
            return []
        except Exception as e:
            print(f"Error fetching Chess.com games: {e}")
            return []
    
    async def import_recent_games(self, username: str, max_games: int = 50) -> List[Dict]:
        """Import recent games from Chess.com"""
        games = []
        current_date = datetime.now()
        
        # Try last 3 months
        for month_offset in range(3):
            year = current_date.year
            month = current_date.month - month_offset
            if month <= 0:
                month += 12
                year -= 1
            
            month_games = await self.get_player_games(username, year, month)
            games.extend(month_games)
            
            if len(games) >= max_games:
                break
            
            # Rate limiting
            await asyncio.sleep(0.1)
        
        return games[:max_games]
