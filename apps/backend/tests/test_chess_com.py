"""
Comprehensive test suite for Chess.com API service

This module provides extensive testing for the ChessComService class,
covering all methods, edge cases, error conditions, and performance scenarios.
Mirrors the testing quality established for the Lichess service.

Author: PawnStaar Development Team
Version: 1.0.0
"""

import pytest
import asyncio
import httpx
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from typing import Dict, List, Any

from core.chess_com import (
    ChessComService, 
    GameFilters, 
    ProfileData, 
    GameData,
    RateLimiter
)
from core.exceptions import (
    ChessComAPIError,
    ChessComPlayerNotFoundError,
    ChessComRateLimitError,
    ChessComTimeoutError,
    ChessComInvalidDataError
)


# --- Module-scoped fixtures (shared across all test classes) ---
@pytest.fixture
def service():
    """Create ChessComService instance for testing"""
    return ChessComService()

@pytest.fixture
def mock_profile_response():
    """Mock Chess.com profile API response"""
    return {
        "username": "testuser",
        "name": "Test User",
        "avatar": "https://images.chess.com/uploads_v1/user/123456.jpg",
        "country": "https://api.chess.com/pub/country/US",
        "title": "GM",
        "followers": 1500,
        "is_streamer": True,
        "joined": 1609459200,  # 2021-01-01
        "last_online": 1640995200  # 2022-01-01
    }

@pytest.fixture
def mock_stats_response():
    """Mock Chess.com stats API response"""
    return {
        "chess_rapid": {
            "last": {
                "rating": 2100,
                "rd": 50,
                "date": 1640995200
            },
            "record": {
                "win": 150,
                "loss": 100,
                "draw": 50
            }
        },
        "chess_blitz": {
            "last": {
                "rating": 2050,
                "rd": 45,
                "date": 1640995200
            },
            "record": {
                "win": 200,
                "loss": 150,
                "draw": 25
            }
        },
        "chess_bullet": {
            "last": {
                "rating": 1950,
                "rd": 60,
                "date": 1640995200
            },
            "record": {
                "win": 300,
                "loss": 250,
                "draw": 10
            }
        }
    }

@pytest.fixture
def mock_archives_response():
    """Mock Chess.com archives API response"""
    return {
        "archives": [
            "https://api.chess.com/pub/player/testuser/games/2023/01",
            "https://api.chess.com/pub/player/testuser/games/2023/02",
            "https://api.chess.com/pub/player/testuser/games/2023/03"
        ]
    }

@pytest.fixture
def mock_games_response():
    """Mock Chess.com monthly games API response"""
    return {
        "games": [
            {
                "url": "https://www.chess.com/game/live/12345678",
                "pgn": '[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2023.01.15"]\n[Round "-"]\n[White "testuser"]\n[Black "opponent"]\n[Result "1-0"]\n[WhiteElo "2100"]\n[BlackElo "2050"]\n[TimeControl "600+5"]\n[EndTime "1673798400"]\n[Termination "testuser won by checkmate"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 1-0',
                "time_control": "600+5",
                "rated": True,
                "rules": "chess",
                "white": {
                    "username": "testuser",
                    "rating": 2100,
                    "result": "win"
                },
                "black": {
                    "username": "opponent",
                    "rating": 2050,
                    "result": "checkmated"
                },
                "end_time": 1673798400
            },
            {
                "url": "https://www.chess.com/game/live/12345679",
                "pgn": '[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2023.01.14"]\n[Round "-"]\n[White "opponent2"]\n[Black "testuser"]\n[Result "0-1"]\n[WhiteElo "2080"]\n[BlackElo "2100"]\n[TimeControl "300"]\n[EndTime "1673712000"]\n[Termination "testuser won on time"]\n\n1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7 0-1',
                "time_control": "300",
                "rated": True,
                "rules": "chess",
                "white": {
                    "username": "opponent2",
                    "rating": 2080,
                    "result": "timeout"
                },
                "black": {
                    "username": "testuser",
                    "rating": 2100,
                    "result": "win"
                },
                "end_time": 1673712000
            }
        ]
    }


class TestProfileManagement:
    """Test profile-related functionality"""
    
    @pytest.mark.asyncio
    async def test_get_player_profile_success(self, service, mock_profile_response, mock_stats_response):
        """Test successful profile retrieval"""
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = [mock_profile_response, mock_stats_response]
            
            profile = await service.get_player_profile("testuser")
            
            assert profile is not None
            assert isinstance(profile, ProfileData)
            assert profile.username == "testuser"
            assert profile.display_name == "Test User"
            assert profile.avatar_url == "https://images.chess.com/uploads_v1/user/123456.jpg"
            assert profile.country == "US"
            assert profile.title == "GM"
            assert profile.followers == 1500
            assert profile.is_streamer is True
            assert profile.verified is True
            
            # Check ratings
            assert "chess_rapid" in profile.ratings
            assert profile.ratings["chess_rapid"]["rating"] == 2100
            assert profile.ratings["chess_rapid"]["games"] == 300
            
            # Verify API calls
            assert mock_request.call_count == 2
            mock_request.assert_any_call("player/testuser")
            mock_request.assert_any_call("player/testuser/stats")
    
    @pytest.mark.asyncio
    async def test_get_player_profile_not_found(self, service):
        """Test profile retrieval for non-existent player"""
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = ChessComPlayerNotFoundError("Player not found")
            
            profile = await service.get_player_profile("nonexistent")
            
            assert profile is None
    
    @pytest.mark.asyncio
    async def test_get_player_profile_invalid_username(self, service):
        """Test profile retrieval with invalid username"""
        with pytest.raises(ChessComInvalidDataError):
            await service.get_player_profile("ab")  # Too short
        
        with pytest.raises(ChessComInvalidDataError):
            await service.get_player_profile("a" * 30)  # Too long
        
        with pytest.raises(ChessComInvalidDataError):
            await service.get_player_profile("user@invalid")  # Invalid characters
    
    @pytest.mark.asyncio
    async def test_get_player_profile_api_error(self, service):
        """Test profile retrieval with API error"""
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = ChessComAPIError("API Error", status_code=500)
            
            with pytest.raises(ChessComAPIError):
                await service.get_player_profile("testuser")
    
    @pytest.mark.asyncio
    async def test_get_player_profile_partial_data(self, service):
        """Test profile retrieval with missing optional fields"""
        minimal_profile = {
            "username": "testuser"
        }
        minimal_stats = {}
        
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = [minimal_profile, minimal_stats]
            
            profile = await service.get_player_profile("testuser")
            
            assert profile is not None
            assert profile.username == "testuser"
            assert profile.display_name is None
            assert profile.avatar_url is None
            assert profile.country == ""
            assert profile.title is None
            assert profile.followers is None
            assert profile.is_streamer is False
            assert profile.ratings == {}


class TestGameImport:
    """Test game import functionality"""
    
    @pytest.mark.asyncio
    async def test_import_games_success(self, service, mock_archives_response, mock_games_response):
        """Test successful game import"""
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = [
                mock_archives_response,
                mock_games_response,
                mock_games_response,
                mock_games_response
            ]
            
            games = await service.import_games("testuser")
            
            assert len(games) > 0
            assert all(isinstance(game, GameData) for game in games)
            
            # Check first game
            game = games[0]
            assert game.platform_game_id == "12345678"
            assert game.time_control == "600+5"
            assert game.rated is True
            assert game.variant == "chess"
            assert game.white_player == "testuser"
            assert game.black_player == "opponent"
            assert game.white_rating == 2100
            assert game.black_rating == 2050
            assert game.user_color == "white"
            assert game.result == "1-0"
            assert game.analysis_available is False
    
    @pytest.mark.asyncio
    async def test_import_games_with_filters(self, service, mock_archives_response, mock_games_response):
        """Test game import with various filters"""
        filters = GameFilters(
            time_control="blitz",
            rated=True,
            color="white",
            min_rating=2000,
            max_rating=2200,
            max_games=50
        )
        
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = [mock_archives_response, mock_games_response]
            
            games = await service.import_games("testuser", filters)
            
            # Verify filtering logic is applied
            for game in games:
                if game.user_color:
                    assert game.user_color == "white"
                assert game.rated is True
    
    @pytest.mark.asyncio
    async def test_import_games_date_filtering(self, service, mock_archives_response, mock_games_response):
        """Test game import with date range filtering"""
        start_date = datetime(2023, 2, 1)
        end_date = datetime(2023, 2, 28)
        
        filters = GameFilters(
            start_date=start_date,
            end_date=end_date,
            max_games=100
        )
        
        with patch.object(service, '_make_request') as mock_request:
            # Only February archive should be processed
            filtered_archives = {
                "archives": ["https://api.chess.com/pub/player/testuser/games/2023/02"]
            }
            mock_request.side_effect = [filtered_archives, mock_games_response]
            
            games = await service.import_games("testuser", filters)
            
            # Verify only February archive was requested
            assert mock_request.call_count == 2
    
    @pytest.mark.asyncio
    async def test_import_games_empty_result(self, service):
        """Test game import with no games available"""
        empty_archives = {"archives": []}
        
        with patch.object(service, '_make_request') as mock_request:
            mock_request.return_value = empty_archives
            
            games = await service.import_games("testuser")
            
            assert games == []
    
    @pytest.mark.asyncio
    async def test_import_games_partial_failure(self, service, mock_archives_response, mock_games_response):
        """Test game import with some months failing"""
        with patch.object(service, '_make_request') as mock_request:
            # First call returns archives, subsequent calls have mixed success
            mock_request.side_effect = [
                mock_archives_response,
                mock_games_response,  # January succeeds
                ChessComAPIError("Server error"),  # February fails
                mock_games_response   # March succeeds
            ]
            
            games = await service.import_games("testuser")
            
            # Should still return games from successful months
            assert len(games) > 0
    
    @pytest.mark.asyncio
    async def test_import_games_malformed_data(self, service, mock_archives_response):
        """Test game import with malformed game data"""
        malformed_games = {
            "games": [
                {
                    "url": "https://www.chess.com/game/live/12345678",
                    # Missing required fields
                },
                {
                    "url": "https://www.chess.com/game/live/12345679",
                    "pgn": "invalid pgn",
                    "white": {"username": "testuser"},
                    "black": {"username": "opponent"}
                    # Missing other fields
                }
            ]
        }
        
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = [mock_archives_response, malformed_games]
            
            games = await service.import_games("testuser")
            
            # Should handle malformed data gracefully
            assert isinstance(games, list)


class TestPlayerSearch:
    """Test player search functionality"""
    
    @pytest.mark.asyncio
    async def test_search_players_found(self, service, mock_profile_response, mock_stats_response):
        """Test successful player search"""
        with patch.object(service, 'get_player_profile') as mock_profile:
            profile_data = ProfileData(
                username="testuser",
                display_name="Test User",
                avatar_url="https://images.chess.com/uploads_v1/user/123456.jpg",
                country="US",
                title="GM",
                followers=1500,
                is_streamer=True,
                joined_date=datetime.fromtimestamp(1609459200),
                last_online=datetime.fromtimestamp(1640995200),
                ratings={"chess_rapid": {"rating": 2100}},
                verified=True
            )
            mock_profile.return_value = profile_data
            
            results = await service.search_players("testuser")
            
            assert len(results) == 1
            result = results[0]
            assert result["username"] == "testuser"
            assert result["display_name"] == "Test User"
            assert result["avatar_url"] == "https://images.chess.com/uploads_v1/user/123456.jpg"
            assert result["country"] == "US"
            assert result["title"] == "GM"
            assert result["rating"] == 2100
    
    @pytest.mark.asyncio
    async def test_search_players_not_found(self, service):
        """Test player search with no results"""
        with patch.object(service, 'get_player_profile') as mock_profile:
            mock_profile.return_value = None
            
            results = await service.search_players("nonexistent")
            
            assert results == []
    
    @pytest.mark.asyncio
    async def test_search_players_error(self, service):
        """Test player search with API error"""
        with patch.object(service, 'get_player_profile') as mock_profile:
            mock_profile.side_effect = ChessComAPIError("API Error")
            
            results = await service.search_players("testuser")
            
            assert results == []


class TestGameAnalysis:
    """Test game analysis functionality"""
    
    @pytest.mark.asyncio
    async def test_get_game_analysis_not_available(self, service):
        """Test game analysis (not available for Chess.com)"""
        analysis = await service.get_game_analysis("12345678")
        
        assert analysis is None


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_basic(self):
        """Test basic rate limiter functionality"""
        limiter = RateLimiter(max_requests=2, time_window=1)
        
        # First two requests should be immediate
        start_time = datetime.utcnow()
        await limiter.acquire()
        await limiter.acquire()
        elapsed = (datetime.utcnow() - start_time).total_seconds()
        
        assert elapsed < 0.1  # Should be nearly instant
    
    @pytest.mark.asyncio
    async def test_rate_limiter_blocking(self):
        """Test rate limiter blocking behavior"""
        limiter = RateLimiter(max_requests=1, time_window=1)
        
        # First request should be immediate
        await limiter.acquire()
        
        # Second request should be delayed
        start_time = datetime.utcnow()
        await limiter.acquire()
        elapsed = (datetime.utcnow() - start_time).total_seconds()
        
        assert elapsed >= 0.9  # Should wait close to 1 second
    
    @pytest.mark.asyncio
    async def test_service_rate_limiting(self, service):
        """Test service-level rate limiting"""
        with patch.object(service._rate_limiter, 'acquire', new_callable=AsyncMock) as mock_acquire:
            with patch.object(service, '_ensure_client', new_callable=AsyncMock):
                service.client = AsyncMock()
                mock_response = MagicMock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"test": "data"}
                service.client.get.return_value = mock_response

                await service._make_request("test/endpoint")

                mock_acquire.assert_called_once()


class TestErrorHandling:
    """Test error handling scenarios"""
    
    @pytest.mark.asyncio
    async def test_http_timeout_error(self, service):
        """Test HTTP timeout handling"""
        with patch.object(service, '_ensure_client', new_callable=AsyncMock):
            service.client = AsyncMock()
            service.client.get.side_effect = httpx.TimeoutException("Timeout")

            with pytest.raises(ChessComTimeoutError):
                await service._make_request("test/endpoint")
    
    @pytest.mark.asyncio
    async def test_http_request_error(self, service):
        """Test HTTP request error handling"""
        with patch.object(service, '_ensure_client', new_callable=AsyncMock):
            service.client = AsyncMock()
            service.client.get.side_effect = httpx.RequestError("Connection failed")

            with pytest.raises(ChessComAPIError):
                await service._make_request("test/endpoint")
    
    @pytest.mark.asyncio
    async def test_api_error_responses(self, service):
        """Test various API error response codes"""
        with patch.object(service, '_ensure_client', new_callable=AsyncMock):
            service.client = AsyncMock()
            # Test 404 Not Found
            mock_response = MagicMock()
            mock_response.status_code = 404
            service.client.get.return_value = mock_response

            with pytest.raises(ChessComPlayerNotFoundError):
                await service._make_request("player/nonexistent")

            # Test 429 Rate Limit
            mock_response.status_code = 429
            with pytest.raises(ChessComRateLimitError):
                await service._make_request("test/endpoint")

            # Test 500 Server Error
            mock_response.status_code = 500
            mock_response.text = "Internal Server Error"
            with pytest.raises(ChessComAPIError):
                await service._make_request("test/endpoint")


class TestDataProcessing:
    """Test data processing and normalization"""
    
    def test_parse_time_control(self, service):
        """Test time control parsing"""
        assert service._parse_time_control("600") == "600"
        assert service._parse_time_control("600+5") == "600+5"
        assert service._parse_time_control("") == "unknown"
        assert service._parse_time_control("300") == "300"
    
    def test_classify_time_control(self, service):
        """Test time control classification"""
        assert service._classify_time_control("120") == "bullet"
        assert service._classify_time_control("300") == "blitz"
        assert service._classify_time_control("600") == "rapid"
        assert service._classify_time_control("1800") == "classical"
        assert service._classify_time_control("unknown") == "unknown"
    
    def test_parse_result(self, service):
        """Test game result parsing"""
        white_win = {"result": "win"}
        black_loss = {"result": "checkmated"}
        assert service._parse_result(white_win, black_loss) == "1-0"
        
        white_loss = {"result": "timeout"}
        black_win = {"result": "win"}
        assert service._parse_result(white_loss, black_win) == "0-1"
        
        white_draw = {"result": "draw"}
        black_draw = {"result": "draw"}
        assert service._parse_result(white_draw, black_draw) == "1/2-1/2"
    
    def test_parse_timestamp(self, service):
        """Test timestamp parsing"""
        timestamp = 1673798400  # 2023-01-15 12:00:00 UTC
        result = service._parse_timestamp(timestamp)
        assert isinstance(result, datetime)
        assert result.year == 2023
        assert result.month == 1
        assert result.day == 15
        
        assert service._parse_timestamp(None) is None
        assert service._parse_timestamp("invalid") is None
    
    def test_extract_opening_from_pgn(self, service):
        """Test opening extraction from PGN"""
        pgn_with_opening = '[Opening "Ruy Lopez"]\n[ECO "C96"]\n1. e4 e5'
        assert service._extract_opening_from_pgn(pgn_with_opening) == "Ruy Lopez"
        
        pgn_with_eco = '[ECO "C96"]\n1. e4 e5'
        assert service._extract_opening_from_pgn(pgn_with_eco) == "C96"
        
        pgn_without_opening = '1. e4 e5 2. Nf3'
        assert service._extract_opening_from_pgn(pgn_without_opening) is None
    
    def test_is_valid_username(self, service):
        """Test username validation"""
        assert service._is_valid_username("validuser") is True
        assert service._is_valid_username("valid_user") is True
        assert service._is_valid_username("valid-user") is True
        assert service._is_valid_username("user123") is True
        
        assert service._is_valid_username("ab") is False  # Too short
        assert service._is_valid_username("a" * 30) is False  # Too long
        assert service._is_valid_username("user@invalid") is False  # Invalid chars
        assert service._is_valid_username("") is False  # Empty
    
    def test_extract_year_month_from_url(self, service):
        """Test year/month extraction from archive URLs"""
        url = "https://api.chess.com/pub/player/testuser/games/2023/01"
        assert service._extract_year_month_from_url(url) == "2023/01"
        
        invalid_url = "https://api.chess.com/pub/player/testuser"
        assert service._extract_year_month_from_url(invalid_url) is None
    
    def test_get_primary_rating(self, service):
        """Test primary rating selection"""
        ratings = {
            "chess_rapid": {"rating": 2100},
            "chess_blitz": {"rating": 2050},
            "chess_bullet": {"rating": 1950}
        }
        assert service._get_primary_rating(ratings) == 2100  # Prefers rapid
        
        ratings_no_rapid = {
            "chess_blitz": {"rating": 2050},
            "chess_bullet": {"rating": 1950}
        }
        assert service._get_primary_rating(ratings_no_rapid) == 2050  # Falls back to blitz
        
        empty_ratings = {}
        assert service._get_primary_rating(empty_ratings) is None


class TestAsyncContextManager:
    """Test async context manager functionality"""
    
    @pytest.mark.asyncio
    async def test_context_manager_usage(self):
        """Test service as async context manager"""
        async with ChessComService() as service:
            assert service.client is not None
        
        # Client should be closed after context exit
        assert service.client is None
    
    @pytest.mark.asyncio
    async def test_context_manager_exception_handling(self):
        """Test context manager with exceptions"""
        try:
            async with ChessComService() as service:
                assert service.client is not None
                raise ValueError("Test exception")
        except ValueError:
            pass
        
        # Client should still be closed after exception
        assert service.client is None


class TestPerformanceAndIntegration:
    """Test performance characteristics and integration scenarios"""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_requests(self, service):
        """Test handling of concurrent requests"""
        with patch.object(service, '_make_request') as mock_request:
            mock_request.return_value = {"test": "data"}
            
            # Make multiple concurrent requests
            tasks = [service._make_request("test/endpoint") for _ in range(5)]
            results = await asyncio.gather(*tasks)
            
            assert len(results) == 5
            assert all(result == {"test": "data"} for result in results)
            assert mock_request.call_count == 5
    
    @pytest.mark.asyncio
    async def test_large_game_import(self, service, mock_archives_response):
        """Test importing large number of games"""
        # Create mock response with many games
        large_games_response = {
            "games": [
                {
                    "url": f"https://www.chess.com/game/live/{i}",
                    "pgn": f'[Event "Live Chess"]\n[Result "1-0"]\n1. e4 e5 {i}',
                    "time_control": "600",
                    "rated": True,
                    "rules": "chess",
                    "white": {"username": "testuser", "rating": 2000, "result": "win"},
                    "black": {"username": f"opponent{i}", "rating": 1900, "result": "checkmated"},
                    "end_time": 1673798400 + i
                }
                for i in range(200)
            ]
        }
        
        with patch.object(service, '_make_request') as mock_request:
            mock_request.side_effect = [mock_archives_response, large_games_response]
            
            filters = GameFilters(max_games=150)
            games = await service.import_games("testuser", filters)
            
            assert len(games) <= 150  # Should respect max_games limit
    
    @pytest.mark.asyncio
    async def test_memory_usage_with_large_dataset(self, service):
        """Test memory efficiency with large datasets"""
        # This test ensures we don't hold onto large amounts of data unnecessarily
        import gc
        
        with patch.object(service, '_make_request') as mock_request:
            # Simulate large response
            large_response = {"games": [{"url": f"game{i}"} for i in range(1000)]}
            mock_request.return_value = large_response
            
            initial_objects = len(gc.get_objects())
            
            # Process large dataset
            await service._get_monthly_games("testuser", "2023/01")
            
            # Force garbage collection
            gc.collect()
            
            final_objects = len(gc.get_objects())
            
            # Memory usage shouldn't grow significantly
            assert final_objects - initial_objects < 100


# Pytest configuration for this module
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.chess_com
]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
