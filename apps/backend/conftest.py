"""
Pytest configuration and fixtures for PawnStaar backend tests
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import Generator, AsyncGenerator
import tempfile
import os

# Set up test environment variables before any imports
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')
os.environ.setdefault('SUPABASE_URL', 'https://test.supabase.co')
os.environ.setdefault('SUPABASE_ANON_KEY', 'test-key')

# Test fixtures for common test data
@pytest.fixture
def mock_lichess_profile():
    """Mock Lichess profile data"""
    return {
        'id': 'testuser',
        'username': 'TestUser',
        'title': 'FM',
        'online': True,
        'playing': False,
        'streaming': False,
        'patron': True,
        'verified': True,
        'profile': {
            'country': 'US',
            'location': 'New York',
            'bio': 'Chess enthusiast',
            'firstName': 'Test',
            'lastName': 'User',
            'avatar': 'avatar123'
        },
        'perfs': {
            'blitz': {'rating': 1500, 'games': 100},
            'rapid': {'rating': 1450, 'games': 50},
            'bullet': {'rating': 1600, 'games': 200}
        },
        'createdAt': 1234567890000,
        'seenAt': 1234567890000,
        'playTime': {'total': 3600, 'tv': 1800},
        'count': {'all': 350, 'rated': 300, 'win': 180, 'loss': 120, 'draw': 50}
    }

@pytest.fixture
def mock_pgn_game():
    """Mock PGN game string"""
    return """[Event "Rated Blitz game"]
[Site "https://lichess.org/abc123"]
[Date "2024.01.15"]
[White "TestUser"]
[Black "Opponent"]
[Result "1-0"]
[UTCDate "2024.01.15"]
[UTCTime "14:30:00"]
[WhiteElo "1500"]
[BlackElo "1450"]
[TimeControl "300+3"]
[ECO "B20"]
[Opening "Sicilian Defense"]
[Termination "Normal"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 1-0"""

@pytest.fixture
def mock_chess_pgn_game(mock_pgn_game):
    """Mock chess.pgn.Game object"""
    import chess.pgn
    import io
    return chess.pgn.read_game(io.StringIO(mock_pgn_game))

@pytest.fixture
def temp_directory():
    """Create a temporary directory for tests"""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield temp_dir

@pytest.fixture
def mock_settings():
    """Mock settings for testing"""
    from core.config import Settings
    
    settings = Settings()
    settings.lichess_api_base = "https://lichess.org/api"
    settings.lichess_rate_limit_delay = 0.1  # Faster for tests
    settings.lichess_request_timeout = 10
    settings.lichess_max_games_per_import = 100
    settings.database_url = "sqlite:///:memory:"
    
    return settings

@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

# Async test utilities
@pytest.fixture
async def async_mock_response():
    """Create an async mock HTTP response"""
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = AsyncMock()
    return mock_response

# Database fixtures (for future use)
@pytest.fixture
def mock_db_session():
    """Mock database session"""
    return Mock()

@pytest.fixture
def mock_user():
    """Mock user object"""
    user = Mock()
    user.id = "test-user-id"
    user.email = "test@example.com"
    user.lichess_username = "testuser"
    user.chess_com_username = None
    return user

# HTTP client fixtures
@pytest.fixture
def mock_httpx_client():
    """Mock httpx AsyncClient"""
    client = AsyncMock()
    client.get = AsyncMock()
    client.aclose = AsyncMock()
    return client

# Berserk client fixtures
@pytest.fixture
def mock_berserk_client():
    """Mock berserk client"""
    client = Mock()
    client.users = Mock()
    client.games = Mock()
    return client

# Test markers for pytest
pytest_plugins = []

def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
