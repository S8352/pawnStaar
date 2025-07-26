"""
Comprehensive test suite for Lichess service
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from datetime import datetime
import chess.pgn
import io
import httpx

from core.lichess import LichessService
from core.exceptions import LichessAPIError, PlayerNotFoundError

@pytest.mark.unit
class TestLichessService:
    
    @pytest.fixture
    def lichess_service(self):
        """Create LichessService instance for testing"""
        return LichessService()

    @pytest.fixture
    def lichess_service_with_token(self):
        """Create LichessService instance with token for testing"""
        return LichessService(token="test_token")

    @pytest.mark.asyncio
    async def test_get_player_profile_success(self, lichess_service, mock_lichess_profile):
        """Test successful profile retrieval"""
        with patch.object(lichess_service.client.users, 'get_public_data') as mock_get:
            mock_get.return_value = mock_lichess_profile
            
            result = await lichess_service.get_player_profile("testuser")
            
            assert result is not None
            assert result['username'] == 'TestUser'
            assert result['title'] == 'FM'
            assert result['verified'] is True
            assert result['perfs']['blitz']['rating'] == 1500
            assert 'avatar_url' in result
            assert result['avatar_url'] == "https://lichess1.org/image/avatar123"
            mock_get.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    async def test_get_player_profile_not_found(self, lichess_service):
        """Test profile not found"""
        with patch.object(lichess_service.client.users, 'get_public_data') as mock_get:
            mock_get.return_value = None
            
            result = await lichess_service.get_player_profile("nonexistent")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_player_profile_404_error(self, lichess_service):
        """Test handling of 404 error"""
        with patch.object(lichess_service.client.users, 'get_public_data') as mock_get:
            mock_get.side_effect = Exception("404 not found")
            
            result = await lichess_service.get_player_profile("nonexistent")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_player_profile_api_error(self, lichess_service):
        """Test handling of API errors"""
        with patch.object(lichess_service.client.users, 'get_public_data') as mock_get:
            mock_get.side_effect = Exception("API Error")
            
            with pytest.raises(LichessAPIError):
                await lichess_service.get_player_profile("testuser")

    @pytest.mark.asyncio
    async def test_get_player_rating_success(self, lichess_service, mock_lichess_profile):
        """Test getting player rating for specific performance type"""
        with patch.object(lichess_service, 'get_player_profile') as mock_profile:
            mock_profile.return_value = mock_lichess_profile
            
            rating = await lichess_service.get_player_rating("testuser", "blitz")
            
            assert rating == 1500

    @pytest.mark.asyncio
    async def test_get_player_rating_different_perf_types(self, lichess_service, mock_lichess_profile):
        """Test getting ratings for different performance types"""
        with patch.object(lichess_service, 'get_player_profile') as mock_profile:
            mock_profile.return_value = mock_lichess_profile
            
            blitz_rating = await lichess_service.get_player_rating("testuser", "blitz")
            rapid_rating = await lichess_service.get_player_rating("testuser", "rapid")
            bullet_rating = await lichess_service.get_player_rating("testuser", "bullet")
            
            assert blitz_rating == 1500
            assert rapid_rating == 1450
            assert bullet_rating == 1600

    @pytest.mark.asyncio
    async def test_get_player_rating_not_found(self, lichess_service):
        """Test getting rating when player not found"""
        with patch.object(lichess_service, 'get_player_profile') as mock_profile:
            mock_profile.return_value = None
            
            rating = await lichess_service.get_player_rating("nonexistent", "blitz")
            
            assert rating is None

    @pytest.mark.asyncio
    async def test_get_player_rating_perf_not_found(self, lichess_service, mock_lichess_profile):
        """Test getting rating for non-existent performance type"""
        with patch.object(lichess_service, 'get_player_profile') as mock_profile:
            mock_profile.return_value = mock_lichess_profile
            
            rating = await lichess_service.get_player_rating("testuser", "correspondence")
            
            assert rating is None

    def test_import_games_success(self, lichess_service, mock_chess_pgn_game):
        """Test successful game import"""
        with patch.object(lichess_service.client.games, 'export_by_user') as mock_export:
            mock_export.return_value = [mock_chess_pgn_game]
            
            result = lichess_service.import_games("testuser", max_games=10)
            
            assert len(result) == 1
            assert result[0]['platform'] == 'lichess'
            assert result[0]['platform_game_id'] == 'abc123'
            assert result[0]['user_color'] == 'white'
            assert result[0]['user_rating'] == 1500
            assert result[0]['opponent_rating'] == 1450
            assert result[0]['time_class'] == 'blitz'
            assert result[0]['opening'] == 'Sicilian Defense'
            assert result[0]['eco'] == 'B20'

    def test_import_games_with_filters(self, lichess_service):
        """Test game import with filters"""
        with patch.object(lichess_service.client.games, 'export_by_user') as mock_export:
            mock_export.return_value = []
            
            lichess_service.import_games(
                "testuser", 
                max_games=50,
                rated=True,
                perf_types=['blitz', 'rapid'],
                color='white',
                since=1234567890,
                until=1234567900
            )
            
            # Verify export_by_user was called with correct parameters
            call_args = mock_export.call_args
            assert call_args[0][0] == "testuser"  # username
            assert call_args[1]['max'] == 50
            assert call_args[1]['rated'] is True
            assert call_args[1]['perfType'] == ['blitz', 'rapid']
            assert call_args[1]['color'] == 'white'
            assert call_args[1]['since'] == 1234567890
            assert call_args[1]['until'] == 1234567900

    def test_import_games_max_limit_enforced(self, lichess_service):
        """Test that max games limit is enforced from settings"""
        with patch.object(lichess_service.client.games, 'export_by_user') as mock_export:
            mock_export.return_value = []
            
            # Request more than settings allow
            lichess_service.import_games("testuser", max_games=500)
            
            call_args = mock_export.call_args
            # Should be limited by settings.lichess_max_games_per_import (200)
            assert call_args[1]['max'] == 200

    def test_process_lichess_game_user_as_white(self, lichess_service, mock_chess_pgn_game):
        """Test game processing when user plays as white"""
        result = lichess_service._process_lichess_game(mock_chess_pgn_game, "TestUser")
        
        assert result['user_color'] == 'white'
        assert result['user_rating'] == 1500
        assert result['opponent_rating'] == 1450
        assert result['opponent_username'] == 'opponent'
        assert result['time_class'] == 'blitz'
        assert result['opening'] == 'Sicilian Defense'
        assert result['eco'] == 'B20'
        assert result['platform'] == 'lichess'
        assert result['rated'] is True
        assert result['result'] == '1-0'

    def test_process_lichess_game_user_as_black(self, lichess_service):
        """Test game processing when user plays as black"""
        pgn_string = """[Event "Rated Blitz game"]
[Site "https://lichess.org/def456"]
[Date "2024.01.15"]
[White "Opponent"]
[Black "TestUser"]
[Result "0-1"]
[UTCDate "2024.01.15"]
[UTCTime "14:30:00"]
[WhiteElo "1450"]
[BlackElo "1500"]
[TimeControl "300+3"]
[ECO "C20"]
[Opening "King's Pawn Game"]
[Termination "Normal"]

1. e4 e5 0-1"""
        
        game = chess.pgn.read_game(io.StringIO(pgn_string))
        result = lichess_service._process_lichess_game(game, "TestUser")
        
        assert result['user_color'] == 'black'
        assert result['user_rating'] == 1500
        assert result['opponent_rating'] == 1450
        assert result['opponent_username'] == 'opponent'
        assert result['platform_game_id'] == 'def456'

    def test_process_lichess_game_user_not_in_game(self, lichess_service, mock_chess_pgn_game):
        """Test game processing when user is not a player in the game"""
        result = lichess_service._process_lichess_game(mock_chess_pgn_game, "DifferentUser")
        
        assert result is None

    def test_process_lichess_game_casual_game(self, lichess_service):
        """Test processing of casual (unrated) game"""
        pgn_string = """[Event "Casual game"]
[Site "https://lichess.org/casual123"]
[Date "2024.01.15"]
[White "TestUser"]
[Black "Opponent"]
[Result "1-0"]
[TimeControl "300+3"]

1. e4 e5 1-0"""
        
        game = chess.pgn.read_game(io.StringIO(pgn_string))
        result = lichess_service._process_lichess_game(game, "TestUser")
        
        assert result['rated'] is False

    def test_classify_time_control_bullet(self, lichess_service):
        """Test bullet time control classification"""
        assert lichess_service._classify_time_control("60+0") == 'bullet'
        assert lichess_service._classify_time_control("120+1") == 'bullet'

    def test_classify_time_control_blitz(self, lichess_service):
        """Test blitz time control classification"""
        assert lichess_service._classify_time_control("300+0") == 'blitz'
        assert lichess_service._classify_time_control("300+3") == 'blitz'
        assert lichess_service._classify_time_control("180+2") == 'blitz'

    def test_classify_time_control_rapid(self, lichess_service):
        """Test rapid time control classification"""
        assert lichess_service._classify_time_control("600+0") == 'rapid'
        assert lichess_service._classify_time_control("900+10") == 'rapid'

    def test_classify_time_control_classical(self, lichess_service):
        """Test classical time control classification"""
        assert lichess_service._classify_time_control("1800+30") == 'classical'
        assert lichess_service._classify_time_control("3600+0") == 'classical'

    def test_classify_time_control_unknown(self, lichess_service):
        """Test unknown time control classification"""
        assert lichess_service._classify_time_control("-") == 'unknown'
        assert lichess_service._classify_time_control("") == 'unknown'
        assert lichess_service._classify_time_control("invalid") == 'unknown'
        assert lichess_service._classify_time_control("abc+def") == 'unknown'

    def test_extract_rating_valid(self, lichess_service):
        """Test rating extraction from valid strings"""
        assert lichess_service._extract_rating("1500") == 1500
        assert lichess_service._extract_rating("2000") == 2000
        assert lichess_service._extract_rating("800") == 800

    def test_extract_rating_invalid(self, lichess_service):
        """Test rating extraction from invalid strings"""
        assert lichess_service._extract_rating("?") is None
        assert lichess_service._extract_rating("") is None
        assert lichess_service._extract_rating("invalid") is None
        assert lichess_service._extract_rating("N/A") is None

    @pytest.mark.asyncio
    async def test_get_game_analysis_success(self, lichess_service):
        """Test getting game analysis"""
        mock_analysis = {
            'moves': [
                {'eval': 0.2, 'best': 'e4'},
                {'eval': -0.1, 'best': 'c5'}
            ]
        }
        
        with patch.object(lichess_service, '_rate_limited_request') as mock_request:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {'analysis': mock_analysis}
            mock_request.return_value = mock_response
            
            result = await lichess_service.get_game_analysis("abc123")
            
            assert result == mock_analysis
            mock_request.assert_called_once_with(
                "https://lichess.org/api/game/abc123",
                {'Accept': 'application/json'}
            )

    @pytest.mark.asyncio
    async def test_get_game_analysis_not_found(self, lichess_service):
        """Test getting analysis for non-existent game"""
        with patch.object(lichess_service, '_rate_limited_request') as mock_request:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_request.return_value = mock_response
            
            result = await lichess_service.get_game_analysis("nonexistent")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_get_game_analysis_no_analysis(self, lichess_service):
        """Test getting analysis when game has no analysis"""
        with patch.object(lichess_service, '_rate_limited_request') as mock_request:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {}  # No analysis field
            mock_request.return_value = mock_response
            
            result = await lichess_service.get_game_analysis("abc123")
            
            assert result is None

    @pytest.mark.asyncio
    async def test_search_players_success(self, lichess_service):
        """Test player search functionality"""
        mock_players = [
            {'id': 'player1', 'username': 'Player1'},
            {'id': 'player2', 'username': 'Player2'}
        ]
        
        with patch.object(lichess_service.http_client, 'get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_players
            mock_get.return_value = mock_response
            
            result = await lichess_service.search_players("player", limit=5)
            
            assert result == mock_players
            mock_get.assert_called_once_with(
                "https://lichess.org/api/player/autocomplete",
                params={'term': 'player', 'limit': 5}
            )

    @pytest.mark.asyncio
    async def test_search_players_no_results(self, lichess_service):
        """Test player search with no results"""
        with patch.object(lichess_service.http_client, 'get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = []
            mock_get.return_value = mock_response
            
            result = await lichess_service.search_players("nonexistent")
            
            assert result == []

    @pytest.mark.asyncio
    async def test_search_players_api_error(self, lichess_service):
        """Test player search API error handling"""
        with patch.object(lichess_service.http_client, 'get') as mock_get:
            mock_get.side_effect = Exception("API Error")
            
            result = await lichess_service.search_players("player")
            
            assert result == []

    @pytest.mark.asyncio
    async def test_rate_limiting(self, lichess_service):
        """Test rate limiting implementation"""
        with patch.object(lichess_service.http_client, 'get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response
            
            start_time = asyncio.get_event_loop().time()
            
            # Make two requests
            await lichess_service._rate_limited_request("http://test1.com")
            await lichess_service._rate_limited_request("http://test2.com")
            
            end_time = asyncio.get_event_loop().time()
            
            # Should take at least the rate limit delay
            assert end_time - start_time >= lichess_service.rate_limit_delay

    @pytest.mark.asyncio
    async def test_rate_limited_request_http_error(self, lichess_service):
        """Test rate limited request with HTTP error"""
        with patch.object(lichess_service.http_client, 'get') as mock_get:
            mock_get.side_effect = httpx.RequestError("Connection failed")
            
            with pytest.raises(LichessAPIError):
                await lichess_service._rate_limited_request("http://test.com")

    def test_import_games_error_handling(self, lichess_service):
        """Test error handling during game import"""
        with patch.object(lichess_service.client.games, 'export_by_user') as mock_export:
            mock_export.side_effect = Exception("API Error")
            
            with pytest.raises(LichessAPIError):
                lichess_service.import_games("testuser")

    def test_import_games_partial_failure(self, lichess_service, mock_chess_pgn_game):
        """Test game import with some games failing to process"""
        # Create a mock game that will fail processing
        bad_game = Mock()
        bad_game.headers = {}  # Missing required headers
        
        with patch.object(lichess_service.client.games, 'export_by_user') as mock_export:
            mock_export.return_value = [mock_chess_pgn_game, bad_game]
            
            result = lichess_service.import_games("testuser")
            
            # Should return only the successfully processed game
            assert len(result) == 1
            assert result[0]['platform_game_id'] == 'abc123'

    def test_process_lichess_game_missing_headers(self, lichess_service):
        """Test game processing with missing headers"""
        game = Mock()
        game.headers = {}  # No headers
        
        result = lichess_service._process_lichess_game(game, "testuser")
        
        assert result is None

    def test_process_lichess_game_invalid_date(self, lichess_service):
        """Test game processing with invalid date format"""
        game = Mock()
        game.headers = {
            'White': 'TestUser',
            'Black': 'Opponent',
            'Site': 'https://lichess.org/test123',
            'UTCDate': 'invalid-date',
            'UTCTime': 'invalid-time',
            'WhiteElo': '1500',
            'BlackElo': '1450',
            'TimeControl': '300+3',
            'Result': '1-0'
        }
        
        result = lichess_service._process_lichess_game(game, "TestUser")
        
        # Should still process the game, just with None for played_at
        assert result is not None
        assert result['played_at'] is None

    @pytest.mark.asyncio
    async def test_close_client(self, lichess_service):
        """Test closing HTTP client"""
        with patch.object(lichess_service.http_client, 'aclose') as mock_close:
            await lichess_service.close()
            mock_close.assert_called_once()

    def test_initialization_with_token(self):
        """Test service initialization with authentication token"""
        with patch('berserk.TokenSession') as mock_token_session, \
             patch('berserk.Client') as mock_client:
            
            service = LichessService(token="test_token")
            
            mock_token_session.assert_called_once_with("test_token")
            mock_client.assert_called_once_with(mock_token_session.return_value)

    def test_initialization_without_token(self):
        """Test service initialization without authentication token"""
        with patch('berserk.Client') as mock_client:
            
            service = LichessService()
            
            mock_client.assert_called_once_with()

    @pytest.mark.asyncio
    async def test_get_game_analysis_request_error(self, lichess_service):
        """Test game analysis with request error"""
        with patch.object(lichess_service, '_rate_limited_request') as mock_request:
            mock_request.side_effect = Exception("Request failed")
            
            result = await lichess_service.get_game_analysis("abc123")
            
            assert result is None

    def test_import_games_empty_result(self, lichess_service):
        """Test game import with no games returned"""
        with patch.object(lichess_service.client.games, 'export_by_user') as mock_export:
            mock_export.return_value = []
            
            result = lichess_service.import_games("testuser")
            
            assert result == []

    @pytest.mark.slow
    @pytest.mark.asyncio
    async def test_multiple_rate_limited_requests(self, lichess_service):
        """Test multiple rate limited requests in sequence"""
        with patch.object(lichess_service.http_client, 'get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_get.return_value = mock_response
            
            start_time = asyncio.get_event_loop().time()
            
            # Make multiple requests
            for i in range(5):
                await lichess_service._rate_limited_request(f"http://test{i}.com")
            
            end_time = asyncio.get_event_loop().time()
            
            # Should take at least 4 * rate_limit_delay (5 requests = 4 delays)
            expected_min_time = 4 * lichess_service.rate_limit_delay
            assert end_time - start_time >= expected_min_time
