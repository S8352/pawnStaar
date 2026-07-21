# Cursor IDE Implementation Prompt for PawnStaar Chess Roasting Platform

## Project Context

I'm building a chess roasting platform MVP where users can play against bots or analyze games while receiving personality-driven commentary from chess personalities like Hikaru Nakamura, Ben Finegold, etc. The platform uses rule-based pattern matching (no LLM) to generate entertaining roasts based on Stockfish analysis.

## Architecture

- **Backend**: FastAPI on Railway.app with PostgreSQL
- **Frontend**: Next.js on Vercel
- **Chess Engine**: Stockfish for move analysis
- **Roasting Engine**: Rule-based templates (no LLM needed)
- **Target Cost**: $30/month total

## Current Status

I have a basic chess learning website that needs to be transformed into a roasting platform. The existing codebase has:

- FastAPI backend with basic structure
- Next.js frontend with chess components
- Supabase integration
- Basic user authentication

## Implementation Tasks

### Phase 1: Backend Roasting Engine (Priority 1)

**Task 1.1: Create Roasting Engine Core**

```python
# File: apps/backend/core/roasting_engine.py
# Create a rule-based roasting system that:
# 1. Takes Stockfish evaluation (centipawn loss, mate threats)
# 2. Detects patterns (blunders, missed tactics, opening mistakes)
# 3. Generates character-specific roasts using templates
# 4. Returns structured roast data

# Character templates should include:
# - Hikaru Nakamura (confident, fast-paced)
# - Ben Finegold (sarcastic, educational)
# - Magnus Carlsen (strategic, positional)
# - GothamChess (meme-heavy, YouTube style)
# - Anna Cramling (encouraging but honest)
```

**Task 1.2: Stockfish Integration**

```python
# File: apps/backend/core/stockfish_analyzer.py
# Integrate Stockfish engine to:
# 1. Analyze chess positions
# 2. Calculate centipawn loss for moves
# 3. Detect mate threats and tactical patterns
# 4. Provide best move suggestions
# 5. Return structured evaluation data
```

**Task 1.3: Database Schema Updates**

```sql
-- Add to existing models.py or create new migration
-- Tables needed:
# 1. characters (personality configurations)
# 2. game_analyses (roast analysis results)
# 3. move_roasts (individual move roasts)
# 4. bot_games (live bot game sessions)
```

**Task 1.4: API Endpoints**

```python
# File: apps/backend/routers/roasting.py
# Create endpoints for:
# 1. POST /api/analyze/game - Analyze uploaded PGN
# 2. POST /api/bot/start-game - Start bot game
# 3. POST /api/bot/make-move - Make move in bot game
# 4. GET /api/characters - List available characters
# 5. GET /api/analyze/{id} - Get analysis results
```

### Phase 2: Frontend Roasting Interface (Priority 2)

**Task 2.1: Character Selection Component**

```typescript
// File: apps/frontend/components/features/character-selector.tsx
// Create component that:
// 1. Displays available roasting characters
// 2. Shows character personality previews
// 3. Allows character selection for analysis/games
// 4. Integrates with backend character API
```

**Task 2.2: Roast Display Component**

```typescript
// File: apps/frontend/components/features/roast-display.tsx
// Create component that:
// 1. Shows move-by-move roasts
# 2. Highlights blunders/mistakes with visual indicators
# 3. Displays character-specific commentary
# 4. Allows navigation through game moves
# 5. Shows evaluation bars and centipawn loss
```

**Task 2.3: Bot Game Interface**

```typescript
// File: apps/frontend/components/features/bot-game.tsx
// Create component that:
# 1. Renders chess board for bot games
# 2. Shows real-time roasting commentary
# 3. Displays bot difficulty selection
# 4. Handles move input and validation
# 5. Shows game result and final roast summary
```

**Task 2.4: Analysis Upload Interface**

```typescript
// File: apps/frontend/components/features/analysis-upload.tsx
// Create component that:
# 1. Allows PGN file upload
# 2. Integrates with Chess.com/Lichess import
# 3. Character selection for analysis
# 4. Progress indicator during analysis
# 5. Results display with roast summary
```

### Phase 3: Integration & Polish (Priority 3)

**Task 3.1: Real-time Roasting**

```python
# File: apps/backend/core/realtime_roasting.py
# Implement:
# 1. WebSocket connections for live games
# 2. Real-time roast generation
# 3. Move validation and processing
# 4. Game state management
```

**Task 3.2: Social Features**

```typescript
// File: apps/frontend/components/features/social-sharing.tsx
// Add:
# 1. Share roast highlights
# 2. Social media integration
# 3. Roast rating system
# 4. Community features
```

**Task 3.3: Performance Optimization**

```python
# File: apps/backend/core/performance.py
# Optimize:
# 1. Stockfish analysis caching
# 2. Database query optimization
# 3. API response time improvements
# 4. Memory usage optimization
```

## Key Implementation Details

### Roasting Engine Logic

```python
# Example roasting logic:
def generate_roast(character_id: str, evaluation: dict, patterns: list) -> str:
    if evaluation['centipawn_loss'] > 300:  # Blunder
        if 'mate_in_2' in patterns:
            return "There was literally mate in 2 and you missed it. Chat, F's please!"
        elif 'massive_blunder' in patterns:
            return "That move was so bad, even I'm speechless. And I'm never speechless."
    
    elif evaluation['centipawn_loss'] < 50:  # Good move
        return "Okay, that was actually pretty clean. I'm impressed."
    
    # Add more character-specific responses...
```

### Character Personalities

```json
{
  "hikaru_nakamura": {
    "tone": "confident",
    "intensity": 4,
    "catchphrases": ["Chat", "Let's go", "That's clean"],
    "blunder_responses": ["There was literally mate in 2...", "That's not how you play chess"],
    "brilliant_responses": ["Okay, that was actually pretty clean", "Beautiful move"]
  },
  "ben_finegold": {
    "tone": "sarcastic",
    "intensity": 3,
    "catchphrases": ["Oh no no no", "That's not how you play chess"],
    "blunder_responses": ["I've seen better moves from my 6-year-old students", "That move was so bad..."],
    "brilliant_responses": ["Finally! A move that doesn't make me want to cry", "Now you're thinking like a chess player"]
  }
}
```

### Database Models

```python
# Add to models.py
class Character(Base):
    __tablename__ = "characters"
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    display_name = Column(String(100), nullable=False)
    personality_config = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)

class GameAnalysis(Base):
    __tablename__ = "game_analyses"
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID, ForeignKey("users.id"))
    character_id = Column(UUID, ForeignKey("characters.id"))
    pgn = Column(Text, nullable=False)
    analysis_data = Column(JSON, nullable=False)
    roast_summary = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class MoveRoast(Base):
    __tablename__ = "move_roasts"
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID, ForeignKey("game_analyses.id"))
    move_number = Column(Integer, nullable=False)
    move_san = Column(String(10), nullable=False)
    centipawn_loss = Column(Integer)
    roast_text = Column(Text, nullable=False)
    roast_type = Column(String(50), nullable=False)
    pattern_detected = Column(String(100))
```

## Success Criteria

- [ ] Users can upload PGN files and get roasted analysis
- [ ] Users can play bot games with real-time roasting
- [ ] Character personalities are distinct and entertaining
- [ ] Roasts are generated in < 2 seconds
- [ ] System handles 100+ concurrent users
- [ ] Mobile-responsive interface
- [ ] Social sharing functionality works

## Technical Constraints

- No LLM usage (rule-based only)
- Railway.app backend deployment
- Vercel frontend deployment
- $30/month budget limit
- Stockfish for chess analysis
- PostgreSQL for data storage

## Next Steps

1. Start with Phase 1, Task 1.1 (Roasting Engine Core)
2. Implement Stockfish integration
3. Create database schema
4. Build API endpoints
5. Develop frontend components
6. Test and optimize performance

**Please implement the roasting engine core first, then we'll build the supporting infrastructure. Focus on creating entertaining, character-specific roasts based on chess move analysis.**
