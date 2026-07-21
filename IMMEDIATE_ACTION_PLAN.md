# Immediate Action Plan - PawnStaar Roasting Platform

## 🎯 Current Status Assessment

**✅ Strong Foundation:**

- FastAPI backend with Stockfish integration
- Next.js frontend with chess components
- PostgreSQL database with game analysis
- Supabase authentication
- Game import from Chess.com/Lichess

**❌ Missing for Roasting:**

- Character personality system
- Roasting engine (entertaining commentary)
- Bot game system
- Real-time roasting interface

## 🚀 Phase 1: Backend Roasting Engine (Start Here)

### Step 1: Add Character Models (30 minutes)

**File: `apps/backend/models.py`**

```python
# ADD these models to your existing models.py

class Character(Base):
    __tablename__ = 'characters'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)  # 'hikaru_nakamura'
    display_name = Column(String(100), nullable=False)  # 'Hikaru Nakamura'
    description = Column(Text, nullable=True)
    personality_config = Column(JSON, nullable=False)  # Roasting templates
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

class BotGame(Base):
    __tablename__ = 'bot_games'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey('users.id'))
    character_id = Column(Integer, ForeignKey('characters.id'))
    bot_rating = Column(Integer, nullable=False)  # 800-2500
    game_result = Column(String, nullable=True)  # 'win', 'loss', 'draw'
    pgn = Column(Text, nullable=True)
    current_position = Column(String, nullable=True)  # FEN
    move_history = Column(JSON, nullable=True)
    roast_history = Column(JSON, nullable=True)  # Real-time roasts
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
```

### Step 2: Create Roasting Engine (45 minutes)

**File: `apps/backend/core/roasting_engine.py` (NEW)**

```python
import random
from typing import Dict, List, Any

class RoastingEngine:
    def __init__(self):
        self.character_templates = self._load_character_templates()
    
    def generate_roast(self, character_id: int, move_analysis: dict, patterns: list) -> dict:
        """Generate character-specific roast based on move analysis"""
        character = self.character_templates.get(character_id, self.character_templates[2])  # Default to Ben Finegold
        
        # Determine roast type based on centipawn loss
        centipawn_loss = move_analysis.get('centipawn_loss', 0)
        
        if centipawn_loss > 300:  # Blunder
            roast_type = 'blunder'
        elif centipawn_loss > 100:  # Mistake
            roast_type = 'mistake'
        elif centipawn_loss > 50:  # Inaccuracy
            roast_type = 'inaccuracy'
        else:  # Good move
            roast_type = 'brilliant'
        
        # Get random response from appropriate category
        responses = character.get(f'{roast_type}_responses', ['Nice move!'])
        roast_text = random.choice(responses)
        
        return {
            'roast_text': roast_text,
            'roast_type': roast_type,
            'character_name': character['display_name'],
            'intensity': character['intensity']
        }
    
    def _load_character_templates(self) -> Dict[int, Dict[str, Any]]:
        """Load character personality configurations"""
        return {
            1: {  # Hikaru Nakamura
                'display_name': 'Hikaru Nakamura',
                'tone': 'confident',
                'intensity': 4,
                'blunder_responses': [
                    "There was literally mate in 2 and you missed it. Chat, can we get some F's?",
                    "That move was so bad, even I'm speechless. And I'm never speechless.",
                    "You just blundered harder than my last tournament opponent. And that's saying something."
                ],
                'mistake_responses': [
                    "Okay, that's not great. You're better than this.",
                    "Come on, you know better than that move.",
                    "That's a mistake, but we can recover from this."
                ],
                'inaccuracy_responses': [
                    "Not the best move, but it's playable.",
                    "There were better options, but this works.",
                    "Decent move, but we can do better."
                ],
                'brilliant_responses': [
                    "Okay, that was actually pretty clean. I'm impressed.",
                    "Now THAT'S how you play chess! Beautiful move.",
                    "Chat, we just witnessed greatness. Take notes."
                ]
            },
            2: {  # Ben Finegold
                'display_name': 'Ben Finegold',
                'tone': 'sarcastic',
                'intensity': 3,
                'blunder_responses': [
                    "Oh no, no, no. That's not how you play chess. That's how you lose chess.",
                    "I've seen better moves from my 6-year-old students. And they're 6.",
                    "That move was so bad, I'm going to need to charge you extra for this lesson."
                ],
                'mistake_responses': [
                    "That's a mistake. Let me explain why this doesn't work.",
                    "Oh dear, that's not the right move here.",
                    "I'm going to need to add this to my 'what not to do' examples."
                ],
                'inaccuracy_responses': [
                    "That's not terrible, but it's not great either.",
                    "There were better moves available, but this is playable.",
                    "Not the worst move, but definitely not the best."
                ],
                'brilliant_responses': [
                    "Finally! A move that doesn't make me want to cry.",
                    "Now you're thinking like a chess player. Keep it up.",
                    "That's the kind of move that makes me proud to be a teacher."
                ]
            },
            3: {  # Magnus Carlsen
                'display_name': 'Magnus Carlsen',
                'tone': 'strategic',
                'intensity': 2,
                'blunder_responses': [
                    "That move doesn't make sense from a positional standpoint.",
                    "You've just given away your advantage completely.",
                    "This is not how you play chess at the highest level."
                ],
                'mistake_responses': [
                    "That's a positional mistake. Let me show you why.",
                    "You're not thinking about the long-term consequences.",
                    "This move weakens your position unnecessarily."
                ],
                'inaccuracy_responses': [
                    "There were more precise moves available.",
                    "This is okay, but not optimal.",
                    "You can do better than this."
                ],
                'brilliant_responses': [
                    "Excellent positional understanding.",
                    "That's a very strong move. Well played.",
                    "You're showing good chess intuition here."
                ]
            }
        }
```

### Step 3: Enhance Analysis with Roasting (30 minutes)

**File: `apps/backend/core/analysis.py` (MODIFY)**

```python
# ADD these imports at the top
from .roasting_engine import RoastingEngine
from typing import Optional

# MODIFY the MoveAnalysis class
class MoveAnalysis(BaseModel):
    move_number: int
    move: str
    evaluation: float
    best_move: str
    centipawn_loss: int = 0  # ADD this field
    blunder: bool = False
    mistake: bool = False
    inaccuracy: bool = False
    roast_text: Optional[str] = None  # ADD this field
    roast_type: Optional[str] = None  # ADD this field
    character_used: Optional[str] = None  # ADD this field

# MODIFY the GameAnalysis class
class GameAnalysis(BaseModel):
    moves: List[MoveAnalysis]
    blunder_count: int
    mistake_count: int
    inaccuracy_count: int
    roast_summary: Optional[str] = None  # ADD this field
    character_used: Optional[str] = None  # ADD this field

# MODIFY the StockfishService class
class StockfishService:
    def __init__(self):
        # ... existing code ...
        self.roasting_engine = RoastingEngine()  # ADD this line
    
    def analyze_pgn(self, pgn_string: str, character_id: int = 2) -> GameAnalysis:
        # ... existing code until the move analysis loop ...
        
        for i, move in enumerate(pgn.mainline_moves()):
            info = self.engine.analyse(board, chess.engine.Limit(time=0.1))
            current_score = info["score"].white()

            if i > 0:
                score_delta = abs(current_score.score() - prev_score.score())
                
                # Calculate centipawn loss
                centipawn_loss = int(score_delta)
                
                move_analysis = MoveAnalysis(
                    move_number=i,
                    move=board.san(move),
                    evaluation=current_score.score(mate_score=10000) / 100.0,
                    best_move=board.san(info["pv"][0]),
                    centipawn_loss=centipawn_loss  # ADD this
                )

                # Determine move quality
                if score_delta > 300:
                    move_analysis.blunder = True
                    blunder_count += 1
                elif score_delta > 150:
                    move_analysis.mistake = True
                    mistake_count += 1
                elif score_delta > 75:
                    move_analysis.inaccuracy = True
                    inaccuracy_count += 1
                
                # Generate roast for this move
                roast_data = self.roasting_engine.generate_roast(
                    character_id, 
                    {'centipawn_loss': centipawn_loss}, 
                    []
                )
                move_analysis.roast_text = roast_data['roast_text']
                move_analysis.roast_type = roast_data['roast_type']
                move_analysis.character_used = roast_data['character_name']
                
                analysis_results.append(move_analysis)

            board.push(move)
            prev_score = current_score

        # Generate overall game roast summary
        character = self.roasting_engine.character_templates.get(character_id, self.roasting_engine.character_templates[2])
        roast_summary = self._generate_game_summary(blunder_count, mistake_count, inaccuracy_count, character)

        return GameAnalysis(
            moves=analysis_results,
            blunder_count=blunder_count,
            mistake_count=mistake_count,
            inaccuracy_count=inaccuracy_count,
            roast_summary=roast_summary,  # ADD this
            character_used=character['display_name']  # ADD this
        )
    
    def _generate_game_summary(self, blunders: int, mistakes: int, inaccuracies: int, character: dict) -> str:
        """Generate overall game roast summary"""
        total_errors = blunders + mistakes + inaccuracies
        
        if blunders > 3:
            return f"Wow, {blunders} blunders in one game? {character['display_name']} would be speechless."
        elif total_errors > 10:
            return f"With {total_errors} errors, this game was... interesting. Let's just say there's room for improvement."
        elif blunders == 0 and mistakes < 3:
            return f"Not bad! Only {mistakes} mistakes. {character['display_name']} might actually be impressed."
        else:
            return f"Mixed bag of a game. Some good moves, some not so good. Typical chess, really."
```

### Step 4: Update Analysis API (15 minutes)

**File: `apps/backend/routers/analysis.py` (MODIFY)**

```python
# MODIFY the existing analyze_game endpoint
@router.post("/analysis/", response_model=GameAnalysis)
async def analyze_game(
    pgn: Annotated[str, Body(embed=True)], 
    character_id: Annotated[int, Body(embed=True)] = 2,  # ADD this parameter
    stockfish_service: StockfishService = Depends(get_stockfish_service)
):
    try:
        analysis = stockfish_service.analyze_pgn(pgn, character_id)  # PASS character_id
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

# ADD new endpoint for character list
@router.get("/characters")
async def get_characters():
    """Get list of available roasting characters"""
    roasting_engine = RoastingEngine()
    characters = []
    
    for char_id, char_data in roasting_engine.character_templates.items():
        characters.append({
            'id': char_id,
            'name': char_data['display_name'],
            'description': f"{char_data['tone']} commentary with intensity {char_data['intensity']}/5",
            'sample_roast': char_data['blunder_responses'][0] if char_data['blunder_responses'] else "Nice move!"
        })
    
    return characters
```

## 🎨 Phase 2: Frontend Roasting Interface (Next)

### Step 5: Character Selection Component (30 minutes)

**File: `apps/frontend/components/features/character-selector.tsx` (NEW)**

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, MessageSquare } from "lucide-react"

interface Character {
  id: number;
  name: string;
  description: string;
  sample_roast: string;
}

interface CharacterSelectorProps {
  selectedCharacter: number;
  onCharacterChange: (characterId: number) => void;
}

export function CharacterSelector({ selectedCharacter, onCharacterChange }: CharacterSelectorProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const response = await fetch('http://localhost:8000/analysis/characters')
        const data = await response.json()
        setCharacters(data)
      } catch (error) {
        console.error('Failed to fetch characters:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCharacters()
  }, [])

  if (loading) {
    return <div className="text-center py-4">Loading characters...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-pawn-accent" />
          Choose Your Roasting Coach
        </CardTitle>
        <CardDescription>
          Select a chess personality to roast your games
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {characters.map((character) => (
          <div
            key={character.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedCharacter === character.id
                ? 'border-pawn-primary bg-pawn-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onCharacterChange(character.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{character.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{character.description}</p>
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm italic">
                  "{character.sample_roast}"
                </div>
              </div>
              <div className="ml-4">
                {selectedCharacter === character.id ? (
                  <Badge className="bg-pawn-primary">Selected</Badge>
                ) : (
                  <Button size="sm" variant="outline">
                    Select
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

### Step 6: Update Analysis Page (20 minutes)

**File: `apps/frontend/app/analysis/page.tsx` (MODIFY)**

```typescript
"use client"

import { useState } from "react"
import { GameImport } from "@/components/features/game-import"
import { GameList } from "@/components/features/game-list"
import { CharacterSelector } from "@/components/features/character-selector"  // ADD this import

export default function AnalysisPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedCharacter, setSelectedCharacter] = useState<number>(2)  // ADD this state

  const handleImportSuccess = () => {
    setRefreshKey(oldKey => oldKey + 1)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Chess Roasting Analysis</h1>
        <p className="text-gray-600">Get roasted by chess personalities while improving your game</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <CharacterSelector 
            selectedCharacter={selectedCharacter}
            onCharacterChange={setSelectedCharacter}
          />
          <GameImport onImportSuccess={handleImportSuccess} />
        </div>
        <div className="lg:col-span-3">
          <GameList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  )
}
```

## 🧪 Testing Your Implementation

### Step 7: Test the Roasting Engine (10 minutes)

1. **Start your backend:**

```bash
cd apps/backend
uvicorn main:app --reload
```

2. **Test the characters endpoint:**

```bash
curl http://localhost:8000/analysis/characters
```

3. **Test analysis with roasting:**

```bash
curl -X POST "http://localhost:8000/analysis/analysis/" \
  -H "Content-Type: application/json" \
  -d '{"pgn": "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4 Bxb4 5. c3 Ba5 6. d4 exd4 7. O-O d6 8. cxd4 Bb6 9. Nc3 Nf6 10. e5 dxe5 11. dxe5 Ng4 12. Bxf7+ Kxf7 13. Ng5+ Kg8 14. Qxg4", "character_id": 1}'
```

## 📊 Expected Results

After implementing these changes, you should have:

1. ✅ **Character system** with 3 roasting personalities
2. ✅ **Enhanced analysis** with roast commentary for each move
3. ✅ **Character selection UI** in the frontend
4. ✅ **API endpoints** for character management
5. ✅ **Database models** ready for bot games

## 🚀 Next Steps

Once this foundation is working:

1. **Add more characters** (GothamChess, Anna Cramling, etc.)
2. **Implement bot games** with real-time roasting
3. **Add social sharing** for roast highlights
4. **Optimize performance** and add caching
5. **Deploy to Railway.app** and Vercel

This implementation gives you a working roasting platform that transforms your existing chess analysis into entertaining, personality-driven commentary!
