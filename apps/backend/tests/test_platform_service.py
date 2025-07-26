"""
Comprehensive Test Suite for Platform Service

This module contains extensive tests for the unified platform service,
covering cross-platform operations, data normalization, error handling,
caching, and performance benchmarks.

Author: PawnStaar Development Team
Version: 1.0.0
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from typing import Dict, Any, List

from core.platform_service import (
    PlatformService,
    Platform,
    UnifiedProfileData,
    UnifiedGameData,
    UnifiedGameFilters,
    ImportProgress
)
from core.exceptions import (
    PlatformAPIError,
    LichessAPIError,
    ChessComAPIError,
    PlayerNotFoundError,
    GameImportError
)


class TestPlatformServiceInitialization:
    """Test platform service initialization and lifecycle management"""
    
    @pytest.mark.asyncio
    async def test_platform_service_initialization(self):
        """Test basic platform service initialization"""
        service = PlatformService()
        
        # Services should be None initially
        assert service._lichess_service is None
        assert service._chess_com_service is None
        assert service._profile_cache == {}
        assert service._cache_ttl == 300
        
    @pytest.mark.asyncio
    async def test_ensure_services_initialization(self):
        """Test that services are properly initialized when needed"""
        service = PlatformService()
        
        with patch('core.platform_service.LichessService') as mock_lichess, \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_chess_com_instance = AsyncMock()
            mock_chess_com.return_value = mock_chess_com_instance
            
            await service._ensure_services()
            
            assert service._lichess_service is not None
            assert service._chess_com_service is not None
            mock_chess_com_instance._ensure_client.assert_called_once()
            
    @pytest.mark.asyncio
    async def test_async_context_manager(self):
        """Test async context manager functionality"""
        with patch('core.platform_service.LichessService') as mock_lichess, \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_lichess_instance = AsyncMock()
            mock_chess_com_instance = AsyncMock()
            mock_lichess.return_value = mock_lichess_instance
            mock_chess_com.return_value = mock_chess_com_instance
            
            async with PlatformService() as service:
                assert service._lichess_service is not None
                assert service._chess_com_service is not None
                
            # Verify close was called
            mock_lichess_instance.close.assert_called_once()
            mock_chess_com_instance.close.assert_called_once()
            
    @pytest.mark.asyncio
    async def test_close_method(self):
        """Test proper cleanup in close method"""
        service = PlatformService()
        
        with patch('core.platform_service.LichessService') as mock_lichess, \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_lichess_instance = AsyncMock()
            mock_chess_com_instance = AsyncMock()
            mock_lichess.return_value = mock_lichess_instance
            mock_chess_com.return_value = mock_chess_com_instance
            
            await service._ensure_services()
            await service.close()
            
            assert service._lichess_service is None
            assert service._chess_com_service is None
            mock_lichess_instance.close.assert_called_once()
            mock_chess_com_instance.close.assert_called_once()


class TestUsernameValidation:
    """Test username validation across platforms"""
    
    @pytest.mark.asyncio
    async def test_validate_lichess_username_success(self):
        """Test successful Lichess username validation"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = {'username': 'testuser'}
            service._lichess_service = mock_lichess_instance
            
            result = await service.validate_username('lichess', 'testuser')
            
            assert result is True
            mock_lichess_instance.get_player_profile.assert_called_once_with('testuser')
            
    @pytest.mark.asyncio
    async def test_validate_chess_com_username_success(self):
        """Test successful Chess.com username validation"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_chess_com_instance = AsyncMock()
            mock_chess_com_instance.get_player_profile.return_value = MagicMock(username='testuser')
            service._chess_com_service = mock_chess_com_instance
            
            result = await service.validate_username('chess_com', 'testuser')
            
            assert result is True
            mock_chess_com_instance.get_player_profile.assert_called_once_with('testuser')
            
    @pytest.mark.asyncio
    async def test_validate_username_not_found(self):
        """Test username validation when user not found"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = None
            service._lichess_service = mock_lichess_instance
            
            result = await service.validate_username('lichess', 'nonexistent')
            
            assert result is False
            
    @pytest.mark.asyncio
    async def test_validate_username_unsupported_platform(self):
        """Test username validation with unsupported platform"""
        service = PlatformService()
        
        with pytest.raises(PlatformAPIError, match="Unsupported platform"):
            await service.validate_username('invalid_platform', 'testuser')
            
    @pytest.mark.asyncio
    async def test_validate_username_api_error(self):
        """Test username validation with API error"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.side_effect = LichessAPIError("API Error")
            service._lichess_service = mock_lichess_instance
            
            with pytest.raises(PlatformAPIError, match="Failed to validate username"):
                await service.validate_username('lichess', 'testuser')


class TestProfileFetching:
    """Test profile fetching and data normalization"""
    
    @pytest.fixture
    def sample_lichess_profile(self):
        """Sample Lichess profile data"""
        return {
            'username': 'testuser',
            'profile': {
                'realName': 'Test User',
                'country': 'US'
            },
            'title': 'GM',
            'nbFollowers': 1000,
            'streamer': True,
            'createdAt': 1640995200000,  # 2022-01-01
            'seenAt': 1640995200000,
            'perfs': {
                'blitz': {'rating': 2000, 'rd': 50, 'games': 100},
                'rapid': {'rating': 1950, 'rd': 60, 'games': 50}
            }
        }
        
    @pytest.fixture
    def sample_chess_com_profile(self):
        """Sample Chess.com profile data"""
        profile = MagicMock()
        profile.username = 'testuser'
        profile.display_name = 'Test User'
        profile.avatar_url = 'https://example.com/avatar.jpg'
        profile.country = 'US'
        profile.title = 'GM'
        profile.followers = 1000
        profile.is_streamer = True
        profile.joined_date = datetime(2022, 1, 1)
        profile.last_online = datetime(2022, 1, 1)
        profile.ratings = {
            'chess_blitz': {'rating': 2000, 'games': 100},
            'chess_rapid': {'rating': 1950, 'games': 50}
        }
        profile.verified = True
        return profile
        
    @pytest.mark.asyncio
    async def test_get_lichess_profile_success(self, sample_lichess_profile):
        """Test successful Lichess profile fetching"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = sample_lichess_profile
            service._lichess_service = mock_lichess_instance
            
            result = await service.get_profile_data('lichess', 'testuser')
            
            assert isinstance(result, UnifiedProfileData)
            assert result.platform == 'lichess'
            assert result.username == 'testuser'
            assert result.display_name == 'Test User'
            assert result.country == 'US'
            assert result.title == 'GM'
            assert result.followers == 1000
            assert result.is_streamer is True
            assert result.verified is True
            assert result.platform_url == 'https://lichess.org/@/testuser'
            
    @pytest.mark.asyncio
    async def test_get_chess_com_profile_success(self, sample_chess_com_profile):
        """Test successful Chess.com profile fetching"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_chess_com_instance = AsyncMock()
            mock_chess_com_instance.get_player_profile.return_value = sample_chess_com_profile
            service._chess_com_service = mock_chess_com_instance
            
            result = await service.get_profile_data('chess_com', 'testuser')
            
            assert isinstance(result, UnifiedProfileData)
            assert result.platform == 'chess_com'
            assert result.username == 'testuser'
            assert result.display_name == 'Test User'
            assert result.avatar_url == 'https://example.com/avatar.jpg'
            assert result.country == 'US'
            assert result.title == 'GM'
            assert result.followers == 1000
            assert result.is_streamer is True
            assert result.verified is True
            assert result.platform_url == 'https://www.chess.com/member/testuser'
            
    @pytest.mark.asyncio
    async def test_get_profile_not_found(self):
        """Test profile fetching when user not found"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = None
            service._lichess_service = mock_lichess_instance
            
            result = await service.get_profile_data('lichess', 'nonexistent')
            
            assert result is None
            
    @pytest.mark.asyncio
    async def test_get_profile_unsupported_platform(self):
        """Test profile fetching with unsupported platform"""
        service = PlatformService()
        
        with pytest.raises(PlatformAPIError, match="Unsupported platform"):
            await service.get_profile_data('invalid_platform', 'testuser')


class TestProfileCaching:
    """Test profile caching mechanism"""
    
    @pytest.mark.asyncio
    async def test_profile_caching_enabled(self):
        """Test that profile data is cached when use_cache=True"""
        service = PlatformService()
        
        sample_lichess_profile = {
            'username': 'testuser',
            'profile': {'realName': 'Test User'},
            'perfs': {'blitz': {'rating': 2000, 'games': 100}}
        }
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = sample_lichess_profile
            service._lichess_service = mock_lichess_instance
            
            # First call should fetch from API
            result1 = await service.get_profile_data('lichess', 'testuser', use_cache=True)
            assert mock_lichess_instance.get_player_profile.call_count == 1
            
            # Second call should use cache
            result2 = await service.get_profile_data('lichess', 'testuser', use_cache=True)
            assert mock_lichess_instance.get_player_profile.call_count == 1  # No additional call
            
            assert result1.username == result2.username
            
    @pytest.mark.asyncio
    async def test_profile_caching_disabled(self):
        """Test that profile data is not cached when use_cache=False"""
        service = PlatformService()
        
        sample_lichess_profile = {
            'username': 'testuser',
            'profile': {'realName': 'Test User'},
            'perfs': {'blitz': {'rating': 2000, 'games': 100}}
        }
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = sample_lichess_profile
            service._lichess_service = mock_lichess_instance
            
            # Both calls should fetch from API
            await service.get_profile_data('lichess', 'testuser', use_cache=False)
            await service.get_profile_data('lichess', 'testuser', use_cache=False)
            
            assert mock_lichess_instance.get_player_profile.call_count == 2
            
    @pytest.mark.asyncio
    async def test_cache_expiration(self):
        """Test that cache expires after TTL"""
        service = PlatformService()
        service._cache_ttl = 1  # 1 second TTL for testing
        
        sample_lichess_profile = {
            'username': 'testuser',
            'profile': {'realName': 'Test User'},
            'perfs': {'blitz': {'rating': 2000, 'games': 100}}
        }
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = sample_lichess_profile
            service._lichess_service = mock_lichess_instance
            
            # First call
            await service.get_profile_data('lichess', 'testuser', use_cache=True)
            assert mock_lichess_instance.get_player_profile.call_count == 1
            
            # Wait for cache to expire
            await asyncio.sleep(1.1)
            
            # Second call should fetch from API again
            await service.get_profile_data('lichess', 'testuser', use_cache=True)
            assert mock_lichess_instance.get_player_profile.call_count == 2
            
    def test_clear_cache(self):
        """Test cache clearing functionality"""
        service = PlatformService()
        service._profile_cache = {'test': ('data', datetime.utcnow())}
        
        service.clear_cache()
        
        assert service._profile_cache == {}
        
    def test_get_cache_stats(self):
        """Test cache statistics"""
        service = PlatformService()
        service._profile_cache = {'test1': ('data1', datetime.utcnow()), 'test2': ('data2', datetime.utcnow())}
        
        stats = service.get_cache_stats()
        
        assert stats['cached_profiles'] == 2
        assert stats['cache_ttl'] == 300


class TestGameImport:
    """Test game import functionality"""
    
    @pytest.fixture
    def sample_lichess_games(self):
        """Sample Lichess games data"""
        return [
            {
                'id': 'game1',
                'pgn': '[Event "Test"]\n1. e4 e5 *',
                'time_control': '300+0',
                'rated': True,
                'variant': 'standard',
                'white_player': 'player1',
                'black_player': 'player2',
                'white_rating': 1500,
                'black_rating': 1600,
                'user_color': 'white',
                'result': '1-0',
                'termination': 'Normal',
                'played_at': datetime(2022, 1, 1),
                'opening': 'King\'s Pawn',
                'analysis_available': True
            }
        ]
        
    @pytest.fixture
    def sample_chess_com_games(self):
        """Sample Chess.com games data"""
        game = MagicMock()
        game.platform_game_id = 'game1'
        game.pgn = '[Event "Test"]\n1. e4 e5 *'
        game.time_control = '300+0'
        game.rated = True
        game.variant = 'standard'
        game.white_player = 'player1'
        game.black_player = 'player2'
        game.white_rating = 1500
        game.black_rating = 1600
        game.user_color = 'white'
        game.result = '1-0'
        game.termination = 'Normal'
        game.played_at = datetime(2022, 1, 1)
        game.opening = 'King\'s Pawn'
        game.analysis_available = False
        return [game]
        
    @pytest.mark.asyncio
    async def test_import_lichess_games_success(self, sample_lichess_games):
        """Test successful Lichess game import"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.import_games.return_value = sample_lichess_games
            service._lichess_service = mock_lichess_instance
            
            filters = UnifiedGameFilters(max_games=10)
            result = await service.import_games('lichess', 'testuser', filters)
            
            assert len(result) == 1
            assert isinstance(result[0], UnifiedGameData)
            assert result[0].platform == 'lichess'
            assert result[0].platform_game_id == 'game1'
            assert result[0].time_control_category == 'blitz'  # 300+0 is blitz
            assert result[0].platform_url == 'https://lichess.org/game1'
            
    @pytest.mark.asyncio
    async def test_import_chess_com_games_success(self, sample_chess_com_games):
        """Test successful Chess.com game import"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_chess_com_instance = AsyncMock()
            mock_chess_com_instance.import_games.return_value = sample_chess_com_games
            service._chess_com_service = mock_chess_com_instance
            
            filters = UnifiedGameFilters(max_games=10)
            result = await service.import_games('chess_com', 'testuser', filters)
            
            assert len(result) == 1
            assert isinstance(result[0], UnifiedGameData)
            assert result[0].platform == 'chess_com'
            assert result[0].platform_game_id == 'game1'
            assert result[0].time_control_category == 'blitz'
            assert result[0].platform_url == 'https://www.chess.com/game/live/game1'
            
    @pytest.mark.asyncio
    async def test_import_games_unsupported_platform(self):
        """Test game import with unsupported platform"""
        service = PlatformService()
        
        with pytest.raises(GameImportError, match="Unsupported platform"):
            await service.import_games('invalid_platform', 'testuser')
            
    @pytest.mark.asyncio
    async def test_import_games_api_error(self):
        """Test game import with API error"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.import_games.side_effect = LichessAPIError("API Error")
            service._lichess_service = mock_lichess_instance
            
            with pytest.raises(GameImportError, match="Failed to import games"):
                await service.import_games('lichess', 'testuser')


class TestMultiPlatformOperations:
    """Test multi-platform concurrent operations"""
    
    @pytest.mark.asyncio
    async def test_import_games_from_multiple_platforms_success(self):
        """Test successful multi-platform game import"""
        service = PlatformService()
        
        # Mock successful imports from both platforms
        with patch.object(service, 'import_games') as mock_import:
            mock_import.side_effect = [
                [MagicMock(platform='lichess')],  # Lichess games
                [MagicMock(platform='chess_com')]  # Chess.com games
            ]
            
            platforms_usernames = {
                'lichess': 'lichess_user',
                'chess_com': 'chess_com_user'
            }
            
            result = await service.import_games_from_multiple_platforms(platforms_usernames)
            
            assert 'lichess' in result
            assert 'chess_com' in result
            assert len(result['lichess']) == 1
            assert len(result['chess_com']) == 1
            assert mock_import.call_count == 2
            
    @pytest.mark.asyncio
    async def test_import_games_from_multiple_platforms_partial_failure(self):
        """Test multi-platform import with partial failure"""
        service = PlatformService()
        
        # Mock one success, one failure
        with patch.object(service, 'import_games') as mock_import:
            mock_import.side_effect = [
                [MagicMock(platform='lichess')],  # Lichess success
                GameImportError("Chess.com failed")  # Chess.com failure
            ]
            
            platforms_usernames = {
                'lichess': 'lichess_user',
                'chess_com': 'chess_com_user'
            }
            
            result = await service.import_games_from_multiple_platforms(platforms_usernames)
            
            assert 'lichess' in result
            assert 'chess_com' in result
            assert len(result['lichess']) == 1
            assert len(result['chess_com']) == 0  # Failed import returns empty list
            
    @pytest.mark.asyncio
    async def test_import_games_unsupported_platform_filtered(self):
        """Test that unsupported platforms are filtered out"""
        service = PlatformService()
        
        with patch.object(service, 'import_games') as mock_import:
            mock_import.return_value = [MagicMock(platform='lichess')]
            
            platforms_usernames = {
                'lichess': 'lichess_user',
                'invalid_platform': 'invalid_user'
            }
            
            result = await service.import_games_from_multiple_platforms(platforms_usernames)
            
            assert 'lichess' in result
            assert 'invalid_platform' not in result
            assert mock_import.call_count == 1


class TestPlayerSearch:
    """Test player search functionality"""
    
    @pytest.mark.asyncio
    async def test_search_players_success(self):
        """Test successful player search across platforms"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess, \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_lichess_instance = AsyncMock()
            mock_chess_com_instance = AsyncMock()
            mock_lichess_instance.search_players.return_value = [{'username': 'lichess_user'}]
            mock_chess_com_instance.search_players.return_value = [{'username': 'chess_com_user'}]
            service._lichess_service = mock_lichess_instance
            service._chess_com_service = mock_chess_com_instance
            
            result = await service.search_players('test', max_results=5)
            
            assert 'lichess' in result
            assert 'chess_com' in result
            assert len(result['lichess']) == 1
            assert len(result['chess_com']) == 1
            assert result['lichess'][0]['username'] == 'lichess_user'
            assert result['chess_com'][0]['username'] == 'chess_com_user'
            
    @pytest.mark.asyncio
    async def test_search_players_specific_platforms(self):
        """Test player search on specific platforms only"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.search_players.return_value = [{'username': 'lichess_user'}]
            service._lichess_service = mock_lichess_instance
            
            result = await service.search_players('test', platforms=['lichess'], max_results=5)
            
            assert 'lichess' in result
            assert 'chess_com' not in result
            assert len(result['lichess']) == 1
            
    @pytest.mark.asyncio
    async def test_search_players_with_errors(self):
        """Test player search with API errors"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess, \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_lichess_instance = AsyncMock()
            mock_chess_com_instance = AsyncMock()
            mock_lichess_instance.search_players.side_effect = Exception("Lichess error")
            mock_chess_com_instance.search_players.return_value = [{'username': 'chess_com_user'}]
            service._lichess_service = mock_lichess_instance
            service._chess_com_service = mock_chess_com_instance
            
            result = await service.search_players('test', max_results=5)
            
            assert 'lichess' in result
            assert 'chess_com' in result
            assert len(result['lichess']) == 0  # Error returns empty list
            assert len(result['chess_com']) == 1


class TestGameAnalysis:
    """Test game analysis functionality"""
    
    @pytest.mark.asyncio
    async def test_get_lichess_game_analysis_success(self):
        """Test successful Lichess game analysis retrieval"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_game_analysis.return_value = {'analysis': 'data'}
            service._lichess_service = mock_lichess_instance
            
            result = await service.get_game_analysis('lichess', 'game123')
            
            assert result == {'analysis': 'data'}
            mock_lichess_instance.get_game_analysis.assert_called_once_with('game123')
            
    @pytest.mark.asyncio
    async def test_get_chess_com_game_analysis_success(self):
        """Test successful Chess.com game analysis retrieval"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_chess_com_instance = AsyncMock()
            mock_chess_com_instance.get_game_analysis.return_value = {'analysis': 'data'}
            service._chess_com_service = mock_chess_com_instance
            
            result = await service.get_game_analysis('chess_com', 'game123')
            
            assert result == {'analysis': 'data'}
            mock_chess_com_instance.get_game_analysis.assert_called_once_with('game123')
            
    @pytest.mark.asyncio
    async def test_get_game_analysis_unsupported_platform(self):
        """Test game analysis with unsupported platform"""
        service = PlatformService()
        
        result = await service.get_game_analysis('invalid_platform', 'game123')
        
        assert result is None
        
    @pytest.mark.asyncio
    async def test_get_game_analysis_error(self):
        """Test game analysis with API error"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_game_analysis.side_effect = Exception("API Error")
            service._lichess_service = mock_lichess_instance
            
            result = await service.get_game_analysis('lichess', 'game123')
            
            assert result is None


class TestDataNormalization:
    """Test data normalization across platforms"""
    
    def test_classify_time_control_bullet(self):
        """Test time control classification for bullet games"""
        service = PlatformService()
        
        assert service._classify_time_control('60+0') == 'bullet'
        assert service._classify_time_control('120+1') == 'bullet'
        assert service._classify_time_control('179') == 'bullet'
        
    def test_classify_time_control_blitz(self):
        """Test time control classification for blitz games"""
        service = PlatformService()
        
        assert service._classify_time_control('300+0') == 'blitz'
        assert service._classify_time_control('180+2') == 'blitz'
        assert service._classify_time_control('599') == 'blitz'
        
    def test_classify_time_control_rapid(self):
        """Test time control classification for rapid games"""
        service = PlatformService()
        
        assert service._classify_time_control('600+0') == 'rapid'
        assert service._classify_time_control('900+10') == 'rapid'
        assert service._classify_time_control('1799') == 'rapid'
        
    def test_classify_time_control_classical(self):
        """Test time control classification for classical games"""
        service = PlatformService()
        
        assert service._classify_time_control('1800+0') == 'classical'
        assert service._classify_time_control('3600+30') == 'classical'
        assert service._classify_time_control('7200') == 'classical'
        
    def test_classify_time_control_unknown(self):
        """Test time control classification for unknown formats"""
        service = PlatformService()
        
        assert service._classify_time_control('') == 'unknown'
        assert service._classify_time_control('unknown') == 'unknown'
        assert service._classify_time_control('invalid') == 'unknown'
        assert service._classify_time_control(None) == 'unknown'
        
    def test_get_lichess_avatar_url(self):
        """Test Lichess avatar URL generation"""
        service = PlatformService()
        
        url = service._get_lichess_avatar_url('testuser')
        assert url == 'https://lichess1.org/assets/images/icons/t.png'
        
        url = service._get_lichess_avatar_url('Magnus')
        assert url == 'https://lichess1.org/assets/images/icons/m.png'
        
    def test_parse_lichess_timestamp(self):
        """Test Lichess timestamp parsing"""
        service = PlatformService()
        
        # Valid timestamp (milliseconds)
        timestamp = 1640995200000  # 2022-01-01 00:00:00
        result = service._parse_lichess_timestamp(timestamp)
        assert result is not None
        assert result.year == 2022
        assert result.month == 1
        assert result.day == 1
        
        # Invalid timestamp
        result = service._parse_lichess_timestamp(None)
        assert result is None
        
        result = service._parse_lichess_timestamp('invalid')
        assert result is None
        
    def test_normalize_lichess_ratings(self):
        """Test Lichess ratings normalization"""
        service = PlatformService()
        
        perfs = {
            'blitz': {'rating': 2000, 'rd': 50, 'games': 100},
            'rapid': {'rating': 1950, 'rd': 60, 'games': 50},
            'invalid': 'not_a_dict'
        }
        
        result = service._normalize_lichess_ratings(perfs)
        
        assert 'blitz' in result
        assert 'rapid' in result
        assert 'invalid' not in result
        assert result['blitz']['rating'] == 2000
        assert result['blitz']['rd'] == 50
        assert result['blitz']['games'] == 100
        
    def test_normalize_chess_com_ratings(self):
        """Test Chess.com ratings normalization"""
        service = PlatformService()
        
        ratings = {
            'chess_blitz': {'rating': 2000, 'games': 100},
            'chess_rapid': {'rating': 1950, 'games': 50}
        }
        
        result = service._normalize_chess_com_ratings(ratings)
        
        # Chess.com ratings should pass through unchanged
        assert result == ratings


class TestPerformanceBenchmarks:
    """Test performance benchmarks and optimization"""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_profile_fetching_performance(self):
        """Test performance of concurrent profile fetching"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess, \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            # Mock fast responses
            mock_lichess_instance = AsyncMock()
            mock_chess_com_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = {'username': 'test'}
            mock_chess_com_instance.get_player_profile.return_value = MagicMock(username='test')
            service._lichess_service = mock_lichess_instance
            service._chess_com_service = mock_chess_com_instance
            
            # Test concurrent fetching
            start_time = datetime.utcnow()
            
            tasks = [
                service.get_profile_data('lichess', f'user{i}', use_cache=False)
                for i in range(10)
            ]
            
            results = await asyncio.gather(*tasks)
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            # Should complete in reasonable time (concurrent execution)
            assert duration < 2.0  # Less than 2 seconds for 10 requests
            assert len(results) == 10
            assert all(result is not None for result in results)
            
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_cache_performance_improvement(self):
        """Test that caching improves performance"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.return_value = {'username': 'test'}
            service._lichess_service = mock_lichess_instance
            
            # First call (no cache)
            start_time = datetime.utcnow()
            await service.get_profile_data('lichess', 'testuser', use_cache=True)
            first_call_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Second call (with cache)
            start_time = datetime.utcnow()
            await service.get_profile_data('lichess', 'testuser', use_cache=True)
            second_call_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Cached call should be significantly faster
            assert second_call_time < first_call_time
            assert mock_lichess_instance.get_player_profile.call_count == 1
            
    @pytest.mark.asyncio
    async def test_multi_platform_import_performance(self):
        """Test performance of multi-platform game import"""
        service = PlatformService()
        
        with patch.object(service, 'import_games') as mock_import:
            # Mock import responses with delay simulation
            async def mock_import_with_delay(platform, username, filters=None):
                await asyncio.sleep(0.1)  # Simulate API delay
                return [MagicMock(platform=platform)]
            
            mock_import.side_effect = mock_import_with_delay
            
            platforms_usernames = {
                'lichess': 'lichess_user',
                'chess_com': 'chess_com_user'
            }
            
            start_time = datetime.utcnow()
            result = await service.import_games_from_multiple_platforms(platforms_usernames)
            end_time = datetime.utcnow()
            
            duration = (end_time - start_time).total_seconds()
            
            # Should complete in less time than sequential (concurrent execution)
            assert duration < 0.15  # Less than 0.15s (concurrent vs 0.2s sequential)
            assert len(result) == 2
            
    def test_memory_usage_optimization(self):
        """Test memory usage optimization"""
        service = PlatformService()
        
        # Fill cache with test data
        for i in range(100):
            service._profile_cache[f'test{i}'] = (f'data{i}', datetime.utcnow())
            
        # Check cache size
        assert len(service._profile_cache) == 100
        
        # Clear cache
        service.clear_cache()
        
        # Memory should be freed
        assert len(service._profile_cache) == 0


class TestErrorHandling:
    """Test comprehensive error handling scenarios"""
    
    @pytest.mark.asyncio
    async def test_network_timeout_handling(self):
        """Test handling of network timeouts"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            mock_lichess_instance.get_player_profile.side_effect = asyncio.TimeoutError("Timeout")
            service._lichess_service = mock_lichess_instance
            
            with pytest.raises(PlatformAPIError, match="Validation failed"):
                await service.validate_username('lichess', 'testuser')
                
    @pytest.mark.asyncio
    async def test_partial_service_failure(self):
        """Test handling when one service fails but others succeed"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess, \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_lichess_instance = AsyncMock()
            mock_chess_com_instance = AsyncMock()
            mock_lichess_instance.search_players.side_effect = Exception("Lichess down")
            mock_chess_com_instance.search_players.return_value = [{'username': 'chess_user'}]
            service._lichess_service = mock_lichess_instance
            service._chess_com_service = mock_chess_com_instance
            
            result = await service.search_players('test')
            
            # Should still return results from working service
            assert 'lichess' in result
            assert 'chess_com' in result
            assert len(result['lichess']) == 0
            assert len(result['chess_com']) == 1
            
    @pytest.mark.asyncio
    async def test_malformed_data_handling(self):
        """Test handling of malformed API responses"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            # Return malformed data
            mock_lichess_instance.get_player_profile.return_value = {'invalid': 'data'}
            service._lichess_service = mock_lichess_instance
            
            result = await service.get_profile_data('lichess', 'testuser')
            
            # Should handle gracefully and return normalized data
            assert isinstance(result, UnifiedProfileData)
            assert result.platform == 'lichess'
            assert result.username == 'testuser'  # Should use provided username as fallback
            
    @pytest.mark.asyncio
    async def test_rate_limit_error_propagation(self):
        """Test proper propagation of rate limit errors"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            mock_chess_com_instance = AsyncMock()
            mock_chess_com_instance.get_player_profile.side_effect = ChessComAPIError("Rate limited")
            service._chess_com_service = mock_chess_com_instance
            
            with pytest.raises(PlatformAPIError, match="Failed to validate username"):
                await service.validate_username('chess_com', 'testuser')


class TestIntegrationScenarios:
    """Test end-to-end integration scenarios"""
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_complete_user_workflow(self):
        """Test complete user workflow from validation to game import"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess:
            
            mock_lichess_instance = AsyncMock()
            
            # Mock profile data
            profile_data = {
                'username': 'testuser',
                'profile': {'realName': 'Test User'},
                'perfs': {'blitz': {'rating': 2000, 'games': 100}}
            }
            mock_lichess_instance.get_player_profile.return_value = profile_data
            
            # Mock games data
            games_data = [{
                'id': 'game1',
                'pgn': '[Event "Test"]\n1. e4 e5 *',
                'time_control': '300+0',
                'rated': True,
                'variant': 'standard',
                'white_player': 'testuser',
                'black_player': 'opponent',
                'result': '1-0',
                'termination': 'Normal',
                'played_at': datetime(2022, 1, 1)
            }]
            mock_lichess_instance.import_games.return_value = games_data
            
            service._lichess_service = mock_lichess_instance
            
            # Step 1: Validate username
            is_valid = await service.validate_username('lichess', 'testuser')
            assert is_valid is True
            
            # Step 2: Get profile data
            profile = await service.get_profile_data('lichess', 'testuser')
            assert profile is not None
            assert profile.username == 'testuser'
            
            # Step 3: Import games
            games = await service.import_games('lichess', 'testuser')
            assert len(games) == 1
            assert games[0].platform == 'lichess'
            
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_cross_platform_data_consistency(self):
        """Test data consistency across platforms"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services'), \
             patch('core.platform_service.LichessService') as mock_lichess, \
             patch('core.platform_service.ChessComService') as mock_chess_com:
            
            # Setup mocks for both platforms
            mock_lichess_instance = AsyncMock()
            mock_chess_com_instance = AsyncMock()
            
            lichess_profile = {
                'username': 'testuser',
                'profile': {'realName': 'Test User'},
                'perfs': {'blitz': {'rating': 2000}}
            }
            
            chess_com_profile = MagicMock()
            chess_com_profile.username = 'testuser'
            chess_com_profile.display_name = 'Test User'
            chess_com_profile.ratings = {'chess_blitz': {'rating': 2000}}
            chess_com_profile.verified = True
            
            mock_lichess_instance.get_player_profile.return_value = lichess_profile
            mock_chess_com_instance.get_player_profile.return_value = chess_com_profile
            
            service._lichess_service = mock_lichess_instance
            service._chess_com_service = mock_chess_com_instance
            
            # Get profiles from both platforms
            lichess_unified = await service.get_profile_data('lichess', 'testuser')
            chess_com_unified = await service.get_profile_data('chess_com', 'testuser')
            
            # Verify consistent data structure
            assert isinstance(lichess_unified, UnifiedProfileData)
            assert isinstance(chess_com_unified, UnifiedProfileData)
            assert lichess_unified.username == chess_com_unified.username
            assert lichess_unified.display_name == chess_com_unified.display_name
            
    @pytest.mark.asyncio
    async def test_resource_cleanup_on_error(self):
        """Test proper resource cleanup when errors occur"""
        service = PlatformService()
        
        with patch.object(service, '_ensure_services') as mock_ensure:
            mock_ensure.side_effect = Exception("Initialization failed")
            
            try:
                await service.validate_username('lichess', 'testuser')
            except Exception:
                pass
            
            # Ensure cleanup is called
            await service.close()
            
            # Services should be None after cleanup
            assert service._lichess_service is None
            assert service._chess_com_service is None


class TestUtilityMethods:
    """Test utility and helper methods"""
    
    def test_get_supported_platforms(self):
        """Test getting list of supported platforms"""
        service = PlatformService()
        
        platforms = service.get_supported_platforms()
        
        assert isinstance(platforms, list)
        assert 'lichess' in platforms
        assert 'chess_com' in platforms
        assert len(platforms) == 2
        
    def test_filter_conversion_methods(self):
        """Test filter conversion methods"""
        service = PlatformService()
        
        unified_filters = UnifiedGameFilters(
            max_games=50,
            rated=True,
            time_control='300+0',
            color='white',
            min_rating=1500,
            max_rating=2000
        )
        
        # Test Lichess filter conversion
        lichess_filters = service._convert_to_lichess_filters(unified_filters)
        assert lichess_filters['max_games'] == 50
        assert lichess_filters['rated'] is True
        assert lichess_filters['time_control'] == '300+0'
        
        # Test Chess.com filter conversion
        chess_com_filters = service._convert_to_chess_com_filters(unified_filters)
        assert chess_com_filters.max_games == 50
        assert chess_com_filters.rated is True
        assert chess_com_filters.time_control == '300+0'


# Performance and stress test markers
pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.platform_service
]


# Test configuration for different test types
def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "integration: marks tests as integration tests")
    config.addinivalue_line("markers", "platform_service: marks tests for platform service")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
