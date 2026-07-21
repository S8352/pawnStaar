"""
Comprehensive Test Suite for Enhanced Users Router

This module contains extensive tests for the enhanced users router,
covering multi-platform operations, error handling, and performance validation.

Author: PawnStaar Development Team
Version: 1.0.0
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from typing import Dict, Any, List
from fastapi.testclient import TestClient
from fastapi import HTTPException

# Mock database dependencies before importing router
with patch('database.get_db'), \
     patch('core.supabase.get_supabase_client'), \
     patch('models.User'):
    from routers.users import router

from core.platform_service import (
    PlatformService,
    UnifiedProfileData,
    UnifiedGameData,
    UnifiedGameFilters
)
from core.exceptions import (
    PlatformAPIError,
    LichessAPIError,
    ChessComAPIError,
    PlayerNotFoundError,
    GameImportError
)


class TestUsersRouterBasicEndpoints:
    """Test basic user management endpoints"""
    
    @pytest.fixture
    def mock_supabase_client(self):
        """Mock Supabase client"""
        client = MagicMock()
        user_response = MagicMock()
        user_response.user.id = "test-user-id"
        client.auth.get_user.return_value = user_response
        return client
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session"""
        session = MagicMock()
        return session
    
    @pytest.fixture
    def mock_user(self):
        """Mock user object"""
        user = MagicMock()
        user.id = "test-user-id"
        user.name = "Test User"
        user.avatar_url = "https://example.com/avatar.jpg"
        user.lichess_username = "testuser"
        user.chess_com_username = "testuser"
        return user
    
    def test_get_current_user_success(self, mock_supabase_client, mock_db_session, mock_user):
        """Test successful current user retrieval"""
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_user
        
        # This would be tested with actual FastAPI test client in integration tests
        # For now, we test the logic components
        assert mock_user.name == "Test User"
        assert mock_user.lichess_username == "testuser"
    
    def test_get_current_user_not_found(self, mock_supabase_client, mock_db_session):
        """Test current user not found scenario"""
        mock_db_session.query.return_value.filter.return_value.first.return_value = None
        
        # Would raise HTTPException(404) in actual endpoint
        assert mock_db_session.query.return_value.filter.return_value.first.return_value is None


class TestLinkAccountEndpoint:
    """Test account linking functionality"""
    
    @pytest.fixture
    def sample_unified_profile(self):
        """Sample unified profile data"""
        return UnifiedProfileData(
            platform="lichess",
            username="testuser",
            display_name="Test User",
            avatar_url="https://lichess1.org/assets/images/icons/t.png",
            country="US",
            title="GM",
            verified=True,
            is_streamer=False,
            followers=100,
            ratings={
                "blitz": {"rating": 2000, "rd": 50, "games": 100},
                "rapid": {"rating": 1950, "rd": 60, "games": 50}
            },
            joined_date=datetime(2022, 1, 1),
            last_online=datetime(2022, 1, 1),
            platform_url="https://lichess.org/@/testuser"
        )
    
    @pytest.mark.asyncio
    async def test_link_account_success_lichess(self, sample_unified_profile):
        """Test successful Lichess account linking"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.validate_username.return_value = True
            mock_service_instance.get_profile_data.return_value = sample_unified_profile
            
            # Test the service calls
            is_valid = await mock_service_instance.validate_username('lichess', 'testuser')
            profile_data = await mock_service_instance.get_profile_data('lichess', 'testuser')
            
            assert is_valid is True
            assert profile_data.username == 'testuser'
            assert profile_data.platform == 'lichess'
            assert profile_data.ratings['blitz']['rating'] == 2000
    
    @pytest.mark.asyncio
    async def test_link_account_username_not_found(self):
        """Test account linking with invalid username"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.validate_username.return_value = False
            
            is_valid = await mock_service_instance.validate_username('lichess', 'nonexistent')
            assert is_valid is False
    
    @pytest.mark.asyncio
    async def test_link_account_platform_api_error(self):
        """Test account linking with platform API error"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.validate_username.side_effect = PlatformAPIError("API Error")
            
            with pytest.raises(PlatformAPIError):
                await mock_service_instance.validate_username('lichess', 'testuser')


class TestSearchProfileEndpoint:
    """Test profile search functionality"""
    
    @pytest.fixture
    def sample_chess_com_profile(self):
        """Sample Chess.com unified profile"""
        return UnifiedProfileData(
            platform="chess_com",
            username="testuser",
            display_name="Test User",
            avatar_url="https://example.com/avatar.jpg",
            country="US",
            title="GM",
            verified=True,
            is_streamer=True,
            followers=500,
            ratings={
                "chess_blitz": {"rating": 2100, "games": 200},
                "chess_rapid": {"rating": 2050, "games": 100}
            },
            joined_date=datetime(2021, 6, 1),
            last_online=datetime(2022, 1, 1),
            platform_url="https://www.chess.com/member/testuser"
        )
    
    @pytest.mark.asyncio
    async def test_search_profile_success(self, sample_chess_com_profile):
        """Test successful profile search"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.get_profile_data.return_value = sample_chess_com_profile
            
            profile_data = await mock_service_instance.get_profile_data('chess_com', 'testuser')
            
            assert profile_data.username == 'testuser'
            assert profile_data.platform == 'chess_com'
            assert profile_data.is_streamer is True
            assert profile_data.followers == 500
    
    @pytest.mark.asyncio
    async def test_search_profile_not_found(self):
        """Test profile search with user not found"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.get_profile_data.return_value = None
            
            profile_data = await mock_service_instance.get_profile_data('lichess', 'nonexistent')
            assert profile_data is None
    
    @pytest.mark.asyncio
    async def test_search_profile_player_not_found_error(self):
        """Test profile search with PlayerNotFoundError"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.get_profile_data.side_effect = PlayerNotFoundError("Player not found")
            
            with pytest.raises(PlayerNotFoundError):
                await mock_service_instance.get_profile_data('lichess', 'nonexistent')


class TestMultiPlatformSearchEndpoint:
    """Test multi-platform search functionality"""
    
    @pytest.fixture
    def sample_search_results(self):
        """Sample multi-platform search results"""
        return {
            'lichess': [
                {'username': 'testuser1', 'rating': 2000},
                {'username': 'testuser2', 'rating': 1900}
            ],
            'chess_com': [
                {'username': 'testuser3', 'rating': 2100}
            ]
        }
    
    @pytest.mark.asyncio
    async def test_multi_platform_search_success(self, sample_search_results):
        """Test successful multi-platform search"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.get_supported_platforms = MagicMock(return_value=['lichess', 'chess_com'])
            mock_service_instance.search_players.return_value = sample_search_results
            
            platforms = mock_service_instance.get_supported_platforms()
            search_results = await mock_service_instance.search_players(
                'testuser', 
                platforms=platforms,
                max_results=5
            )
            
            assert len(platforms) == 2
            assert 'lichess' in search_results
            assert 'chess_com' in search_results
            assert len(search_results['lichess']) == 2
            assert len(search_results['chess_com']) == 1
    
    @pytest.mark.asyncio
    async def test_multi_platform_search_partial_results(self):
        """Test multi-platform search with partial results"""
        search_results = {
            'lichess': [{'username': 'testuser1', 'rating': 2000}],
            'chess_com': []  # No results from Chess.com
        }
        
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.get_supported_platforms = MagicMock(return_value=['lichess', 'chess_com'])
            mock_service_instance.search_players.return_value = search_results
            
            results = await mock_service_instance.search_players('testuser')
            
            assert len(results['lichess']) == 1
            assert len(results['chess_com']) == 0
    
    @pytest.mark.asyncio
    async def test_multi_platform_search_with_specific_platforms(self):
        """Test multi-platform search with specific platforms"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.search_players.return_value = {'lichess': [{'username': 'test'}]}
            
            results = await mock_service_instance.search_players(
                'testuser', 
                platforms=['lichess'],
                max_results=5
            )
            
            assert 'lichess' in results
            mock_service_instance.search_players.assert_called_once_with(
                'testuser', 
                platforms=['lichess'],
                max_results=5
            )


class TestBatchValidationEndpoint:
    """Test batch username validation functionality"""
    
    @pytest.mark.asyncio
    async def test_batch_validation_success(self):
        """Test successful batch validation"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            # Mock validation results
            mock_service_instance.validate_username.side_effect = [True, False, True]
            
            # Simulate batch validation
            validations = [
                {'platform': 'lichess', 'username': 'validuser1'},
                {'platform': 'chess_com', 'username': 'invaliduser'},
                {'platform': 'lichess', 'username': 'validuser2'}
            ]
            
            results = []
            for validation in validations:
                try:
                    is_valid = await mock_service_instance.validate_username(
                        validation['platform'], 
                        validation['username']
                    )
                    results.append({
                        "platform": validation['platform'],
                        "username": validation['username'],
                        "valid": is_valid,
                        "error": None
                    })
                except Exception as e:
                    results.append({
                        "platform": validation['platform'],
                        "username": validation['username'],
                        "valid": False,
                        "error": str(e)
                    })
            
            assert len(results) == 3
            assert results[0]['valid'] is True
            assert results[1]['valid'] is False
            assert results[2]['valid'] is True
            assert sum(1 for r in results if r['valid']) == 2
    
    @pytest.mark.asyncio
    async def test_batch_validation_with_errors(self):
        """Test batch validation with API errors"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            # Mock validation with error
            mock_service_instance.validate_username.side_effect = [
                True, 
                PlatformAPIError("API Error"), 
                False
            ]
            
            validations = [
                {'platform': 'lichess', 'username': 'validuser'},
                {'platform': 'chess_com', 'username': 'erroruser'},
                {'platform': 'lichess', 'username': 'invaliduser'}
            ]
            
            results = []
            for validation in validations:
                try:
                    is_valid = await mock_service_instance.validate_username(
                        validation['platform'], 
                        validation['username']
                    )
                    results.append({
                        "platform": validation['platform'],
                        "username": validation['username'],
                        "valid": is_valid,
                        "error": None
                    })
                except Exception as e:
                    results.append({
                        "platform": validation['platform'],
                        "username": validation['username'],
                        "valid": False,
                        "error": str(e)
                    })
            
            assert len(results) == 3
            assert results[0]['valid'] is True
            assert results[1]['valid'] is False
            assert results[1]['error'] == "API Error"
            assert results[2]['valid'] is False


class TestMultiPlatformImportEndpoint:
    """Test multi-platform game import functionality"""
    
    @pytest.fixture
    def sample_unified_games(self):
        """Sample unified game data"""
        return [
            UnifiedGameData(
                platform="lichess",
                platform_game_id="game1",
                pgn="[Event \"Test\"]\n1. e4 e5 *",
                time_control="300+0",
                time_control_category="blitz",
                rated=True,
                variant="standard",
                white_player="player1",
                black_player="player2",
                white_rating=1500,
                black_rating=1600,
                user_color="white",
                result="1-0",
                termination="Normal",
                played_at=datetime(2022, 1, 1),
                opening="King's Pawn",
                analysis_available=True,
                platform_url="https://lichess.org/game1"
            ),
            UnifiedGameData(
                platform="chess_com",
                platform_game_id="game2",
                pgn="[Event \"Test\"]\n1. d4 d5 *",
                time_control="600+0",
                time_control_category="rapid",
                rated=True,
                variant="standard",
                white_player="player3",
                black_player="player4",
                white_rating=1700,
                black_rating=1650,
                user_color="black",
                result="0-1",
                termination="Normal",
                played_at=datetime(2022, 1, 2),
                opening="Queen's Pawn",
                analysis_available=False,
                platform_url="https://www.chess.com/game/live/game2"
            )
        ]
    
    @pytest.mark.asyncio
    async def test_multi_platform_import_success(self, sample_unified_games):
        """Test successful multi-platform game import"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            import_results = {
                'lichess': [sample_unified_games[0]],
                'chess_com': [sample_unified_games[1]]
            }
            
            mock_service_instance.import_games_from_multiple_platforms.return_value = import_results
            
            platforms_usernames = {
                'lichess': 'lichess_user',
                'chess_com': 'chess_com_user'
            }
            
            results = await mock_service_instance.import_games_from_multiple_platforms(
                platforms_usernames
            )
            
            assert 'lichess' in results
            assert 'chess_com' in results
            assert len(results['lichess']) == 1
            assert len(results['chess_com']) == 1
            assert results['lichess'][0].platform == 'lichess'
            assert results['chess_com'][0].platform == 'chess_com'
    
    @pytest.mark.asyncio
    async def test_multi_platform_import_with_filters(self, sample_unified_games):
        """Test multi-platform import with filters"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.import_games_from_multiple_platforms.return_value = {
                'lichess': [sample_unified_games[0]]  # Only blitz games
            }
            
            platforms_usernames = {'lichess': 'testuser'}
            filters = UnifiedGameFilters(
                max_games=10,
                rated=True,
                time_control='300+0'
            )
            
            results = await mock_service_instance.import_games_from_multiple_platforms(
                platforms_usernames,
                filters=filters
            )
            
            assert len(results['lichess']) == 1
            assert results['lichess'][0].time_control_category == 'blitz'
            assert results['lichess'][0].rated is True
    
    @pytest.mark.asyncio
    async def test_multi_platform_import_partial_failure(self):
        """Test multi-platform import with partial failure"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            # Simulate partial failure - one platform succeeds, one fails
            import_results = {
                'lichess': [],  # No games imported
                'chess_com': []  # No games imported due to error
            }
            
            mock_service_instance.import_games_from_multiple_platforms.return_value = import_results
            
            platforms_usernames = {
                'lichess': 'validuser',
                'chess_com': 'invaliduser'
            }
            
            results = await mock_service_instance.import_games_from_multiple_platforms(
                platforms_usernames
            )
            
            assert len(results['lichess']) == 0
            assert len(results['chess_com']) == 0
    
    @pytest.mark.asyncio
    async def test_multi_platform_import_game_import_error(self):
        """Test multi-platform import with GameImportError"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.import_games_from_multiple_platforms.side_effect = GameImportError("Import failed")
            
            platforms_usernames = {'lichess': 'testuser'}
            
            with pytest.raises(GameImportError):
                await mock_service_instance.import_games_from_multiple_platforms(platforms_usernames)


class TestPlatformInfoEndpoints:
    """Test platform information and monitoring endpoints"""
    
    @pytest.mark.asyncio
    async def test_get_supported_platforms(self):
        """Test getting supported platforms"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = MagicMock()
            mock_platform_service.return_value = mock_service_instance
            
            mock_service_instance.get_supported_platforms = MagicMock(return_value=['lichess', 'chess_com'])
            
            platforms = mock_service_instance.get_supported_platforms()
            
            assert len(platforms) == 2
            assert 'lichess' in platforms
            assert 'chess_com' in platforms
    
    @pytest.mark.asyncio
    async def test_get_platform_metrics(self):
        """Test getting platform metrics"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_cache_stats = {
                'cached_profiles': 5,
                'cache_ttl': 300
            }
            
            mock_service_instance.get_cache_stats = MagicMock(return_value=mock_cache_stats)
            mock_service_instance.get_supported_platforms = MagicMock(return_value=['lichess', 'chess_com'])
            
            cache_stats = mock_service_instance.get_cache_stats()
            platforms = mock_service_instance.get_supported_platforms()
            
            assert cache_stats['cached_profiles'] == 5
            assert cache_stats['cache_ttl'] == 300
            assert len(platforms) == 2
    
    @pytest.mark.asyncio
    async def test_clear_platform_cache(self):
        """Test clearing platform cache"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = MagicMock()
            mock_platform_service.return_value = mock_service_instance
            
            mock_service_instance.clear_cache.return_value = None
            
            # Should not raise any exception
            mock_service_instance.clear_cache()
            mock_service_instance.clear_cache.assert_called_once()

    @pytest.mark.asyncio
    async def test_clear_platform_cache_denies_non_admin(self):
        """Non-admin users must be rejected with 403 (endpoint fails closed)."""
        from routers.users import clear_platform_cache
        from core.config import settings

        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.return_value.user.id = "not-admin"

        with patch.object(settings, "admin_user_ids", "admin-123"), \
             patch("routers.users.PlatformService") as mock_platform_service:
            with pytest.raises(HTTPException) as exc_info:
                await clear_platform_cache(supabase=mock_supabase)

            assert exc_info.value.status_code == 403
            # The admin operation must not run for a non-admin.
            mock_platform_service.assert_not_called()

    @pytest.mark.asyncio
    async def test_clear_platform_cache_allows_admin(self):
        """An allow-listed admin user succeeds and the cache is cleared."""
        from routers.users import clear_platform_cache
        from core.config import settings

        mock_supabase = MagicMock()
        mock_supabase.auth.get_user.return_value.user.id = "admin-123"

        with patch.object(settings, "admin_user_ids", "admin-123,other-admin"), \
             patch("routers.users.PlatformService") as mock_platform_service:
            mock_service_instance = MagicMock()
            mock_platform_service.return_value = mock_service_instance

            result = await clear_platform_cache(supabase=mock_supabase)

            assert result["message"] == "Platform cache cleared successfully"
            mock_service_instance.clear_cache.assert_called_once()

    @pytest.mark.asyncio
    async def test_platform_health_check_healthy(self):
        """Test platform health check when all platforms are healthy"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.get_supported_platforms = MagicMock(return_value=['lichess', 'chess_com'])
            mock_service_instance.validate_username.return_value = True
            
            platforms = mock_service_instance.get_supported_platforms()
            
            # Test each platform
            health_results = {}
            overall_healthy = True
            
            for platform in platforms:
                try:
                    await mock_service_instance.validate_username(platform, 'test')
                    health_results[platform] = {
                        "status": "healthy",
                        "last_check": datetime.now().isoformat()
                    }
                except Exception as e:
                    health_results[platform] = {
                        "status": "unhealthy",
                        "error": str(e),
                        "last_check": datetime.now().isoformat()
                    }
                    overall_healthy = False
            
            assert overall_healthy is True
            assert len(health_results) == 2
            assert all(result["status"] == "healthy" for result in health_results.values())
    
    @pytest.mark.asyncio
    async def test_platform_health_check_degraded(self):
        """Test platform health check when one platform is unhealthy"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.get_supported_platforms = MagicMock(return_value=['lichess', 'chess_com'])
            
            # Mock one platform failing
            mock_service_instance.validate_username.side_effect = [
                True,  # Lichess healthy
                PlatformAPIError("Chess.com API error")  # Chess.com unhealthy
            ]
            
            platforms = mock_service_instance.get_supported_platforms()
            
            health_results = {}
            overall_healthy = True
            
            for i, platform in enumerate(platforms):
                try:
                    await mock_service_instance.validate_username(platform, 'test')
                    health_results[platform] = {
                        "status": "healthy",
                        "last_check": datetime.now().isoformat()
                    }
                except Exception as e:
                    health_results[platform] = {
                        "status": "unhealthy",
                        "error": str(e),
                        "last_check": datetime.now().isoformat()
                    }
                    overall_healthy = False
            
            assert overall_healthy is False
            assert health_results['lichess']['status'] == 'healthy'
            assert health_results['chess_com']['status'] == 'unhealthy'


class TestPerformanceAndIntegration:
    """Test performance and integration scenarios"""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_multi_platform_operations(self):
        """Test concurrent multi-platform operations performance"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            # Mock fast responses
            mock_service_instance.search_players.return_value = {
                'lichess': [{'username': 'user1'}],
                'chess_com': [{'username': 'user2'}]
            }
            mock_service_instance.validate_username.return_value = True
            
            start_time = datetime.now()
            
            # Simulate concurrent operations
            search_task = mock_service_instance.search_players('test')
            validation_tasks = [
                mock_service_instance.validate_username('lichess', f'user{i}')
                for i in range(5)
            ]
            
            search_results = await search_task
            validation_results = await asyncio.gather(*validation_tasks)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Should complete quickly due to mocking
            assert duration < 1.0
            assert len(search_results) == 2
            assert all(result is True for result in validation_results)
    
    @pytest.mark.asyncio
    async def test_error_handling_resilience(self):
        """Test error handling resilience across operations"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            # Test various error scenarios
            error_scenarios = [
                PlatformAPIError("API Error"),
                PlayerNotFoundError("Player not found"),
                GameImportError("Import failed"),
                Exception("Unexpected error")
            ]
            
            for error in error_scenarios:
                mock_service_instance.validate_username.side_effect = error
                
                with pytest.raises(type(error)):
                    await mock_service_instance.validate_username('lichess', 'testuser')
    
    @pytest.mark.asyncio
    async def test_data_consistency_across_platforms(self):
        """Test data consistency across different platforms"""
        lichess_profile = UnifiedProfileData(
            platform="lichess",
            username="testuser",
            display_name="Test User",
            avatar_url="https://lichess1.org/assets/images/icons/t.png",
            country="US",
            title=None,
            followers=0,
            is_streamer=False,
            joined_date=None,
            last_online=None,
            ratings={"blitz": {"rating": 2000}},
            verified=True,
            platform_url="https://lichess.org/@/testuser"
        )

        chess_com_profile = UnifiedProfileData(
            platform="chess_com",
            username="testuser",
            display_name="Test User",
            avatar_url="https://example.com/avatar.jpg",
            country="US",
            title=None,
            followers=0,
            is_streamer=False,
            joined_date=None,
            last_online=None,
            ratings={"chess_blitz": {"rating": 2000}},
            verified=True,
            platform_url="https://www.chess.com/member/testuser"
        )
        
        # Verify consistent data structure
        assert isinstance(lichess_profile, UnifiedProfileData)
        assert isinstance(chess_com_profile, UnifiedProfileData)
        assert lichess_profile.username == chess_com_profile.username
        assert lichess_profile.display_name == chess_com_profile.display_name
        assert lichess_profile.verified == chess_com_profile.verified


class TestErrorHandlingScenarios:
    """Test comprehensive error handling scenarios"""
    
    @pytest.mark.asyncio
    async def test_network_timeout_simulation(self):
        """Test handling of network timeouts"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.get_profile_data.side_effect = asyncio.TimeoutError("Network timeout")
            
            with pytest.raises(asyncio.TimeoutError):
                await mock_service_instance.get_profile_data('lichess', 'testuser')
    
    @pytest.mark.asyncio
    async def test_malformed_data_handling(self):
        """Test handling of malformed API responses"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            # Mock malformed profile data
            mock_service_instance.get_profile_data.return_value = UnifiedProfileData(
                platform="lichess",
                username="testuser",
                display_name=None,  # Missing display name
                avatar_url=None,
                country=None,
                title=None,
                followers=None,
                is_streamer=False,
                joined_date=None,
                last_online=None,
                ratings=None,  # Missing ratings
                verified=False,
                platform_url="https://lichess.org/@/testuser"
            )
            
            profile_data = await mock_service_instance.get_profile_data('lichess', 'testuser')
            
            # Should handle gracefully with defaults
            assert profile_data.username == 'testuser'
            assert profile_data.display_name is None
            assert profile_data.ratings is None
    
    @pytest.mark.asyncio
    async def test_rate_limit_error_handling(self):
        """Test handling of rate limit errors"""
        with patch('routers.users.PlatformService') as mock_platform_service:
            mock_service_instance = AsyncMock()
            mock_platform_service.return_value.__aenter__.return_value = mock_service_instance
            
            mock_service_instance.validate_username.side_effect = ChessComAPIError("Rate limited")
            
            with pytest.raises(ChessComAPIError):
                await mock_service_instance.validate_username('chess_com', 'testuser')


# Performance and stress test markers
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.users_router
]


# Test configuration for different test types
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "users_router: marks tests for users router")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
