# PawnStaar Chess Roasting Platform - Technical Requirements Document

## Executive Summary

Build a chess roasting platform MVP with Railway.app backend and Vercel frontend. The system uses rule-based pattern matching (no LLM required) to generate personality-driven chess commentary. Target: $30/month operational costs, 50K MAU by month 12.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway.app   │    │   External      │
│   Frontend      │◄──►│   Backend       │◄──►│   APIs          │
│   (Next.js)     │    │   (FastAPI)     │    │   (Chess.com)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Assets │    │   PostgreSQL    │    │   Lichess API   │
│   CDN Delivery  │    │   Database      │    │   Game Import   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Backend Requirements (Railway.app)

### Core Technology Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+ (Railway managed)
- **Chess Engine**: Stockfish 15+ (CPU-optimized)
- **Authentication**: Supabase Auth
- **Deployment**: Railway.app with auto-scaling
- **Environment**: Python virtual environment

### Database Schema

```sql
-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    chess_com_username VARCHAR(50),
    lichess_username VARCHAR(50),
    rating_estimate INTEGER DEFAULT 1200,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Character Personalities
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    personality_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Game Analyses
CREATE TABLE game_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    character_id UUID REFERENCES characters(id),
    pgn TEXT NOT NULL,
    game_source VARCHAR(20) NOT NULL, -- 'chess_com', 'lichess', 'manual'
    external_game_id VARCHAR(100),
    analysis_data JSONB NOT NULL,
    roast_summary TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Move-by-Move Roasts
CREATE TABLE move_roasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES game_analyses(id),
    move_number INTEGER NOT NULL,
    move_san VARCHAR(10) NOT NULL,
    centipawn_loss INTEGER,
    evaluation DECIMAL(8,2),
    roast_text TEXT NOT NULL,
    roast_type VARCHAR(50) NOT NULL, -- 'blunder', 'mistake', 'inaccuracy', 'brilliant'
    pattern_detected VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bot Game Sessions
CREATE TABLE bot_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    character_id UUID REFERENCES characters(id),
    bot_rating INTEGER NOT NULL,
    game_result VARCHAR(10), -- 'win', 'loss', 'draw'
    pgn TEXT,
    analysis_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_game_analyses_user_id ON game_analyses(user_id);
CREATE INDEX idx_move_roasts_analysis_id ON move_roasts(analysis_id);
CREATE INDEX idx_bot_games_user_id ON bot_games(user_id);
CREATE INDEX idx_users_email ON users(email);
```

### API Endpoints

```python
# Authentication Routes
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me

# Game Analysis Routes
POST /api/analyze/game          # Analyze uploaded PGN
POST /api/analyze/import        # Import from Chess.com/Lichess
GET  /api/analyze/{analysis_id} # Get analysis results
GET  /api/analyze/user/{user_id} # Get user's analyses

# Bot Game Routes
POST /api/bot/start-game        # Start new bot game
POST /api/bot/make-move         # Make move in bot game
GET  /api/bot/game/{game_id}    # Get bot game state
POST /api/bot/end-game          # End bot game

# Character Routes
GET  /api/characters            # List available characters
GET  /api/characters/{char_id}  # Get character details

# User Routes
GET  /api/user/profile          # Get user profile
PUT  /api/user/profile          # Update user profile
GET  /api/user/analyses         # Get user's analyses
```

### Roasting Engine Implementation

```python
# Core Roasting Engine (No LLM Required)
class RoastingEngine:
    def __init__(self):
        self.stockfish = StockfishEngine()
        self.pattern_detector = PatternDetector()
        self.character_templates = CharacterTemplates()
    
    def analyze_move(self, position: str, move: str, character_id: str) -> dict:
        # 1. Get Stockfish evaluation
        evaluation = self.stockfish.analyze_position(position, move)
        
        # 2. Detect patterns
        patterns = self.pattern_detector.detect_patterns(position, move, evaluation)
        
        # 3. Generate roast based on character
        roast = self.character_templates.generate_roast(
            character_id, evaluation, patterns
        )
        
        return {
            'evaluation': evaluation,
            'patterns': patterns,
            'roast': roast,
            'centipawn_loss': evaluation.get('centipawn_loss', 0)
        }

# Character Template System
class CharacterTemplates:
    def __init__(self):
        self.templates = {
            'hikari_nakamura': {
                'blunder_responses': [
                    "There was literally mate in 2 and you missed it. Chat, can we get some F's?",
                    "That move was so bad, even I'm speechless. And I'm never speechless.",
                    "You just blundered harder than my last tournament opponent. And that's saying something."
                ],
                'brilliant_responses': [
                    "Okay, that was actually pretty clean. I'm impressed.",
                    "Now THAT'S how you play chess! Beautiful move.",
                    "Chat, we just witnessed greatness. Take notes."
                ],
                'tone': 'confident',
                'intensity': 4
            },
            'benny_finegold': {
                'blunder_responses': [
                    "Oh no, no, no. That's not how you play chess. That's how you lose chess.",
                    "I've seen better moves from my 6-year-old students. And they're 6.",
                    "That move was so bad, I'm going to need to charge you extra for this lesson."
                ],
                'brilliant_responses': [
                    "Finally! A move that doesn't make me want to cry.",
                    "Now you're thinking like a chess player. Keep it up.",
                    "That's the kind of move that makes me proud to be a teacher."
                ],
                'tone': 'sarcastic',
                'intensity': 3
            }
        }
    
    def generate_roast(self, character_id: str, evaluation: dict, patterns: list) -> str:
        character = self.templates.get(character_id, self.templates['benny_finegold'])
        
        # Determine roast type based on evaluation
        if evaluation['centipawn_loss'] > 300:
            roast_type = 'blunder'
        elif evaluation['centipawn_loss'] > 100:
            roast_type = 'mistake'
        elif evaluation['centipawn_loss'] > 50:
            roast_type = 'inaccuracy'
        else:
            roast_type = 'brilliant'
        
        # Get random response from appropriate category
        responses = character[f'{roast_type}_responses']
        return random.choice(responses)

# Pattern Detection System
class PatternDetector:
    def detect_patterns(self, position: str, move: str, evaluation: dict) -> list:
        patterns = []
        
        # Check for common patterns
        if evaluation.get('mate_in_n'):
            patterns.append(f"mate_in_{evaluation['mate_in_n']}")
        
        if evaluation.get('centipawn_loss', 0) > 500:
            patterns.append('massive_blunder')
        
        if self._is_opening_mistake(position, move):
            patterns.append('opening_mistake')
        
        if self._is_time_trouble_move(move):
            patterns.append('time_trouble')
        
        return patterns
```

### Stockfish Integration

```python
import chess
import chess.engine
from typing import Dict, Any

class StockfishEngine:
    def __init__(self):
        self.engine = chess.engine.SimpleEngine.popen_uci("/usr/bin/stockfish")
    
    def analyze_position(self, fen: str, move: str) -> Dict[str, Any]:
        board = chess.Board(fen)
        
        # Analyze current position
        info = self.engine.analyse(board, chess.engine.Limit(time=1.0))
        
        # Make the move and analyze resulting position
        move_obj = board.parse_san(move)
        board.push(move_obj)
        
        info_after = self.engine.analyse(board, chess.engine.Limit(time=1.0))
        
        # Calculate centipawn loss
        centipawn_loss = abs(info['score'].white().score() - info_after['score'].white().score())
        
        return {
            'evaluation_before': info['score'].white().score(),
            'evaluation_after': info_after['score'].white().score(),
            'centipawn_loss': centipawn_loss,
            'best_move': str(info['pv'][0]) if 'pv' in info else None,
            'mate_in_n': self._extract_mate_threat(info_after)
        }
    
    def _extract_mate_threat(self, info: Dict) -> int:
        score = info['score']
        if score.is_mate():
            return score.mate()
        return None
```

### External API Integration

```python
import httpx
from typing import Dict, List

class ChessComAPI:
    def __init__(self):
        self.base_url = "https://api.chess.com/pub"
    
    async def get_user_games(self, username: str, year: int, month: int) -> List[Dict]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/player/{username}/games/{year}/{month:02d}"
            )
            return response.json().get('games', [])

class LichessAPI:
    def __init__(self):
        self.base_url = "https://lichess.org/api"
    
    async def get_user_games(self, username: str, max_games: int = 10) -> List[Dict]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/games/user/{username}",
                params={'max': max_games, 'pgnInJson': True}
            )
            return response.json()
```

## Frontend Requirements (Vercel)

### Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **Chess Board**: React Chess Board
- **State Management**: Zustand
- **Authentication**: Supabase Auth
- **Deployment**: Vercel with automatic deployments

### Key Components

```typescript
// Chess Board Component
interface ChessBoardProps {
  position: string;
  onMove: (move: string) => void;
  disabled?: boolean;
  showEvaluation?: boolean;
}

// Character Selection Component
interface CharacterSelectorProps {
  selectedCharacter: string;
  onCharacterChange: (characterId: string) => void;
  characters: Character[];
}

// Analysis Display Component
interface AnalysisDisplayProps {
  analysis: GameAnalysis;
  currentMove: number;
  onMoveSelect: (moveNumber: number) => void;
}

// Bot Game Interface
interface BotGameProps {
  gameId: string;
  characterId: string;
  botRating: number;
  onGameEnd: (result: GameResult) => void;
}
```

### State Management

```typescript
// Zustand Store
interface AppState {
  user: User | null;
  currentGame: BotGame | null;
  currentAnalysis: GameAnalysis | null;
  selectedCharacter: string;
  
  // Actions
  setUser: (user: User | null) => void;
  startBotGame: (characterId: string, botRating: number) => void;
  makeMove: (move: string) => void;
  loadAnalysis: (analysisId: string) => void;
  setCharacter: (characterId: string) => void;
}
```

### API Client

```typescript
// API Client for Railway Backend
class PawnStaarAPI {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pawnstaar-backend.railway.app';
  }
  
  async analyzeGame(pgn: string, characterId: string): Promise<GameAnalysis> {
    const response = await fetch(`${this.baseUrl}/api/analyze/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pgn, character_id: characterId })
    });
    return response.json();
  }
  
  async startBotGame(characterId: string, botRating: number): Promise<BotGame> {
    const response = await fetch(`${this.baseUrl}/api/bot/start-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character_id: characterId, bot_rating: botRating })
    });
    return response.json();
  }
  
  async makeMove(gameId: string, move: string): Promise<MoveResponse> {
    const response = await fetch(`${this.baseUrl}/api/bot/make-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId, move })
    });
    return response.json();
  }
}
```

## Deployment Configuration

### Railway.app Backend

```yaml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"

[env]
PYTHON_VERSION = "3.11"
```

```dockerfile
# Dockerfile for Railway
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    stockfish \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Vercel Frontend

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://pawnstaar-backend.railway.app",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

## Cost Analysis

### Railway.app Backend Costs

- **Base Plan**: $5/month
- **PostgreSQL**: $15/month (2 vCPU, 4GB RAM)
- **Compute**: $10/month (estimated usage)
- **Total Backend**: ~$30/month

### Vercel Frontend Costs

- **Hobby Plan**: Free (100GB bandwidth, serverless functions)
- **Pro Plan**: $20/month (if needed for higher limits)
- **Total Frontend**: $0-20/month

### Total MVP Costs: $30-50/month

## Performance Requirements

### Backend Performance

- **API Response Time**: < 500ms for analysis requests
- **Stockfish Analysis**: < 2 seconds per move
- **Database Queries**: < 100ms for user data
- **Concurrent Users**: Support 100+ simultaneous users

### Frontend Performance

- **Page Load Time**: < 3 seconds
- **Chess Board Rendering**: < 100ms
- **Real-time Updates**: < 200ms latency
- **Mobile Responsiveness**: Full mobile support

## Security Requirements

### Authentication

- Supabase Auth with JWT tokens
- OAuth integration (Google, GitHub)
- Rate limiting on API endpoints
- CORS configuration for Vercel domain

### Data Protection

- Encrypt sensitive user data
- Secure API endpoints with authentication
- Input validation and sanitization
- SQL injection prevention

## Monitoring and Analytics

### Backend Monitoring

- Railway built-in monitoring
- Custom health check endpoints
- Error logging and tracking
- Performance metrics collection

### Frontend Analytics

- Vercel Analytics integration
- User interaction tracking
- Performance monitoring
- Error boundary implementation

## Development Workflow

### Backend Development

1. Local development with Docker
2. Git-based deployment to Railway
3. Automatic deployments on main branch
4. Environment variable management

### Frontend Development

1. Local development with Next.js
2. Git-based deployment to Vercel
3. Preview deployments for PRs
4. Automatic production deployments

## Testing Strategy

### Backend Testing

- Unit tests for roasting engine
- Integration tests for API endpoints
- Chess engine accuracy tests
- Performance benchmarks

### Frontend Testing

- Component unit tests
- Integration tests for user flows
- E2E tests for critical paths
- Accessibility testing

## Launch Checklist

### Pre-Launch

- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Database migrations completed
- [ ] Character personalities configured
- [ ] Stockfish engine tested
- [ ] API endpoints validated
- [ ] Authentication working
- [ ] Chess board integration tested

### Post-Launch

- [ ] Monitor error rates
- [ ] Track user engagement
- [ ] Optimize performance
- [ ] Collect user feedback
- [ ] Plan feature iterations

## Success Metrics

### Technical Metrics

- API response time < 500ms
- 99.9% uptime
- < 1% error rate
- Support 100+ concurrent users

### Business Metrics

- 50,000 MAU by month 12
- $75,000 MRR by month 12
- 8% free-to-paid conversion
- 1,000+ daily social shares

---

**This technical specification provides everything needed to implement the PawnStaar Chess Roasting Platform MVP using Railway.app and Vercel. The rule-based roasting engine eliminates LLM costs while delivering consistent, entertaining commentary that scales efficiently.**

