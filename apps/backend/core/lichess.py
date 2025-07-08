import berserk
import httpx
from typing import Optional, Dict

class LichessService:
    def __init__(self, token: str = None):
        if token:
            session = berserk.TokenSession(token)
            self.client = berserk.Client(session)
        else:
            self.client = berserk.Client()
        self.http_client = httpx.AsyncClient()

    async def get_player_profile(self, username: str) -> Optional[Dict]:
        """Fetch player profile from Lichess"""
        try:
            profile = self.client.users.get_public_data(username)
            return profile
        except Exception as e:
            print(f"Error fetching Lichess profile: {e}")
            return None

    def import_games(self, user_id: str, username: str, max_games: int = 50):
        """Enhanced game import with metadata"""
        try:
            games_stream = self.client.games.export_by_user(
                username, 
                max=max_games,
                rated=True,
                perfType=['blitz', 'rapid', 'classical', 'bullet']
            )
            
            games = []
            for game in games_stream:
                game_data = {
                    'pgn': str(game),
                    'platform': 'lichess',
                    'platform_game_id': game.headers.get('Site', '').split('/')[-1],
                    'time_control': game.headers.get('TimeControl', ''),
                    'rated': True,
                    'white_player': game.headers.get('White', ''),
                    'black_player': game.headers.get('Black', ''),
                    'result': game.headers.get('Result', ''),
                    'termination': game.headers.get('Termination', ''),
                    'played_at': game.headers.get('UTCDate', '') + ' ' + game.headers.get('UTCTime', '')
                }
                games.append(game_data)
            
            return games
        except Exception as e:
            print(f"Error importing Lichess games: {e}")
            return []
