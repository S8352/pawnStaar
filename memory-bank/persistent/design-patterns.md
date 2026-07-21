# Design Patterns and Architectural Decisions

## Chess Platform Specific Patterns

### Game Analysis Pipeline Pattern

```typescript
// Strategy pattern for different analysis types
interface AnalysisStrategy {
  analyze(game: ChessGame): Promise<GameAnalysis>;
  getAnalysisType(): string;
}

class BlunderAnalysis implements AnalysisStrategy {
  async analyze(game: ChessGame): Promise<GameAnalysis> {
    // Implement blunder detection logic
    return {
      type: 'blunder',
      moves: this.detectBlunders(game),
      severity: 'high'
    };
  }
  
  getAnalysisType(): string {
    return 'blunder';
  }
}

class TacticalAnalysis implements AnalysisStrategy {
  async analyze(game: ChessGame): Promise<GameAnalysis> {
    // Implement tactical pattern detection
    return {
      type: 'tactical',
      patterns: this.detectTacticalPatterns(game),
      difficulty: this.calculateDifficulty(game)
    };
  }
  
  getAnalysisType(): string {
    return 'tactical';
  }
}

// Analysis pipeline coordinator
class GameAnalysisPipeline {
  private strategies: AnalysisStrategy[] = [];
  
  addStrategy(strategy: AnalysisStrategy): void {
    this.strategies.push(strategy);
  }
  
  async analyzeGame(game: ChessGame): Promise<CompleteGameAnalysis> {
    const results: GameAnalysis[] = [];
    
    for (const strategy of this.strategies) {
      const analysis = await strategy.analyze(game);
      results.push(analysis);
    }
    
    return this.combineAnalyses(results);
  }
}
```

### Training Module Factory Pattern

```typescript
// Factory pattern for creating training modules
interface TrainingModule {
  generateExercises(userProfile: UserProfile): Promise<Exercise[]>;
  getModuleType(): string;
  getDifficulty(): number;
}

class DailyWorkoutFactory {
  static createModule(userLevel: UserLevel): TrainingModule {
    switch (userLevel) {
      case 'beginner':
        return new BeginnerDailyWorkout();
      case 'intermediate':
        return new IntermediateDailyWorkout();
      case 'advanced':
        return new AdvancedDailyWorkout();
      default:
        throw new Error(`Unknown user level: ${userLevel}`);
    }
  }
}

class PersonalizedPuzzleGenerator implements TrainingModule {
  async generateExercises(userProfile: UserProfile): Promise<Exercise[]> {
    const weaknesses = await this.identifyWeaknesses(userProfile);
    const exercises: Exercise[] = [];
    
    for (const weakness of weaknesses) {
      const exercise = await this.createExerciseForWeakness(weakness);
      exercises.push(exercise);
    }
    
    return this.prioritizeExercises(exercises);
  }
  
  getModuleType(): string {
    return 'personalized_puzzle';
  }
  
  getDifficulty(): number {
    return this.calculateAdaptiveDifficulty();
  }
}
```

## Frontend Architecture Patterns

### Compound Component Pattern

```typescript
// Compound components for complex UI elements
interface GameAnalysisProps {
  gameId: string;
  children: React.ReactNode;
}

const GameAnalysis: React.FC<GameAnalysisProps> & {
  Header: typeof GameAnalysisHeader;
  Moves: typeof GameAnalysisMoves;
  Evaluation: typeof GameAnalysisEvaluation;
  Comments: typeof GameAnalysisComments;
} = ({ gameId, children }) => {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  
  return (
    <GameAnalysisContext.Provider value={{ analysis, selectedMove, setSelectedMove }}>
      <div className="game-analysis">
        {children}
      </div>
    </GameAnalysisContext.Provider>
  );
};

const GameAnalysisHeader: React.FC = () => {
  const { analysis } = useGameAnalysisContext();
  return (
    <div className="analysis-header">
      <h2>Game Analysis</h2>
      <div className="analysis-stats">
        <span>Blunders: {analysis?.blunders.length || 0}</span>
        <span>Mistakes: {analysis?.mistakes.length || 0}</span>
      </div>
    </div>
  );
};

// Usage
<GameAnalysis gameId="game-123">
  <GameAnalysis.Header />
  <GameAnalysis.Moves />
  <GameAnalysis.Evaluation />
  <GameAnalysis.Comments />
</GameAnalysis>
```

### Custom Hook Pattern for Business Logic

```typescript
// Custom hooks for complex business logic
export const useGameAnalysis = (gameId: string) => {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const analyzeGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await gameAnalysisService.analyzeGame(gameId);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [gameId]);
  
  const refetch = useCallback(() => {
    analyzeGame();
  }, [analyzeGame]);
  
  useEffect(() => {
    if (gameId) {
      analyzeGame();
    }
  }, [gameId, analyzeGame]);
  
  return {
    analysis,
    loading,
    error,
    refetch,
    analyzeGame
  };
};

// Specialized hooks for specific features
export const usePersonalizedTraining = (userId: string) => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  
  const generateDailyWorkout = useCallback(async () => {
    const workout = await trainingService.generateDailyWorkout(userId);
    setCurrentWorkout(workout);
  }, [userId]);
  
  const completeExercise = useCallback(async (exerciseId: string, result: ExerciseResult) => {
    await trainingService.completeExercise(exerciseId, result);
    // Update workout state
  }, []);
  
  return {
    workouts,
    currentWorkout,
    generateDailyWorkout,
    completeExercise
  };
};
```

## Backend Architecture Patterns

### Repository Pattern for Data Access

```python
# Repository pattern for clean data access
from abc import ABC, abstractmethod
from typing import List, Optional
from sqlalchemy.orm import Session

class GameRepository(ABC):
    @abstractmethod
    def get_by_id(self, game_id: str) -> Optional[Game]:
        pass
    
    @abstractmethod
    def get_by_user(self, user_id: str, limit: int = 100) -> List[Game]:
        pass
    
    @abstractmethod
    def create(self, game: Game) -> Game:
        pass
    
    @abstractmethod
    def update(self, game: Game) -> Game:
        pass

class SQLGameRepository(GameRepository):
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_id(self, game_id: str) -> Optional[Game]:
        return self.db.query(Game).filter(Game.id == game_id).first()
    
    def get_by_user(self, user_id: str, limit: int = 100) -> List[Game]:
        return self.db.query(Game)\
            .filter(Game.user_id == user_id)\
            .order_by(Game.created_at.desc())\
            .limit(limit)\
            .all()
    
    def create(self, game: Game) -> Game:
        self.db.add(game)
        self.db.commit()
        self.db.refresh(game)
        return game
    
    def update(self, game: Game) -> Game:
        self.db.commit()
        self.db.refresh(game)
        return game

# Service layer using repository
class GameService:
    def __init__(self, game_repo: GameRepository, analysis_service: AnalysisService):
        self.game_repo = game_repo
        self.analysis_service = analysis_service
    
    async def import_game(self, user_id: str, pgn_data: str, platform: str) -> Game:
        # Parse PGN and create game entity
        game = self.parse_pgn_to_game(pgn_data, user_id, platform)
        
        # Save to database
        saved_game = self.game_repo.create(game)
        
        # Trigger analysis
        await self.analysis_service.analyze_game_async(saved_game.id)
        
        return saved_game
```

### Command Pattern for Complex Operations

```python
# Command pattern for complex operations
from abc import ABC, abstractmethod
from typing import Any, Dict

class Command(ABC):
    @abstractmethod
    def execute(self) -> Any:
        pass
    
    @abstractmethod
    def undo(self) -> Any:
        pass

class AnalyzeGameCommand(Command):
    def __init__(self, game_id: str, analysis_service: AnalysisService):
        self.game_id = game_id
        self.analysis_service = analysis_service
        self.previous_analysis = None
    
    def execute(self) -> GameAnalysis:
        # Store previous state for undo
        self.previous_analysis = self.analysis_service.get_analysis(self.game_id)
        
        # Perform analysis
        analysis = self.analysis_service.analyze_game(self.game_id)
        return analysis
    
    def undo(self) -> GameAnalysis:
        if self.previous_analysis:
            self.analysis_service.restore_analysis(self.game_id, self.previous_analysis)
        return self.previous_analysis

class CommandInvoker:
    def __init__(self):
        self.history: List[Command] = []
        self.current_position = -1
    
    def execute_command(self, command: Command) -> Any:
        # Remove any commands after current position
        self.history = self.history[:self.current_position + 1]
        
        # Execute command and add to history
        result = command.execute()
        self.history.append(command)
        self.current_position += 1
        
        return result
    
    def undo(self) -> Any:
        if self.current_position >= 0:
            command = self.history[self.current_position]
            result = command.undo()
            self.current_position -= 1
            return result
        return None
    
    def redo(self) -> Any:
        if self.current_position < len(self.history) - 1:
            self.current_position += 1
            command = self.history[self.current_position]
            return command.execute()
        return None
```

## Data Flow Patterns

### Event-Driven Architecture

```typescript
// Event-driven pattern for loose coupling
interface DomainEvent {
  eventType: string;
  aggregateId: string;
  timestamp: Date;
  data: any;
}

class GameAnalysisCompletedEvent implements DomainEvent {
  eventType = 'GameAnalysisCompleted';
  
  constructor(
    public aggregateId: string,
    public data: { gameId: string; analysis: GameAnalysis },
    public timestamp: Date = new Date()
  ) {}
}

class EventBus {
  private handlers: Map<string, Function[]> = new Map();
  
  subscribe(eventType: string, handler: Function): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
  
  publish(event: DomainEvent): void {
    const handlers = this.handlers.get(event.eventType) || [];
    handlers.forEach(handler => handler(event));
  }
}

// Event handlers
class TrainingRecommendationHandler {
  constructor(private trainingService: TrainingService) {}
  
  handle(event: GameAnalysisCompletedEvent): void {
    const { gameId, analysis } = event.data;
    
    // Generate personalized training based on analysis
    this.trainingService.generateRecommendations(gameId, analysis);
  }
}

class ProgressTrackingHandler {
  constructor(private progressService: ProgressService) {}
  
  handle(event: GameAnalysisCompletedEvent): void {
    const { gameId, analysis } = event.data;
    
    // Update user progress metrics
    this.progressService.updateProgress(gameId, analysis);
  }
}
```

### CQRS Pattern for Read/Write Separation

```python
# CQRS pattern for complex domain operations
from abc import ABC, abstractmethod
from typing import List, Optional

# Command side (write operations)
class CreateGameAnalysisCommand:
    def __init__(self, game_id: str, analysis_data: dict):
        self.game_id = game_id
        self.analysis_data = analysis_data

class GameAnalysisCommandHandler:
    def __init__(self, game_repo: GameRepository, analysis_repo: AnalysisRepository):
        self.game_repo = game_repo
        self.analysis_repo = analysis_repo
    
    def handle(self, command: CreateGameAnalysisCommand) -> str:
        # Validate command
        game = self.game_repo.get_by_id(command.game_id)
        if not game:
            raise ValueError(f"Game {command.game_id} not found")
        
        # Create analysis
        analysis = GameAnalysis(
            game_id=command.game_id,
            data=command.analysis_data
        )
        
        # Save to write database
        saved_analysis = self.analysis_repo.create(analysis)
        
        # Publish event for read model update
        event_bus.publish(GameAnalysisCreatedEvent(saved_analysis.id, saved_analysis))
        
        return saved_analysis.id

# Query side (read operations)
class GetUserProgressQuery:
    def __init__(self, user_id: str, time_period: str = "month"):
        self.user_id = user_id
        self.time_period = time_period

class UserProgressQueryHandler:
    def __init__(self, read_db: ReadDatabase):
        self.read_db = read_db
    
    def handle(self, query: GetUserProgressQuery) -> UserProgress:
        # Query optimized read model
        return self.read_db.get_user_progress(query.user_id, query.time_period)
```

## Performance Patterns

### Caching Strategy Pattern

```typescript
// Strategy pattern for different caching approaches
interface CacheStrategy {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

class MemoryCacheStrategy implements CacheStrategy {
  private cache = new Map<string, { value: any; expires: number }>();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl * 1000
    });
  }
  
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

class RedisCacheStrategy implements CacheStrategy {
  constructor(private redis: Redis) {}
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

// Cache manager with strategy selection
class CacheManager {
  constructor(private strategy: CacheStrategy) {}
  
  async get<T>(key: string): Promise<T | null> {
    return this.strategy.get<T>(key);
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    return this.strategy.set(key, value, ttl);
  }
  
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    let value = await this.get<T>(key);
    if (value === null) {
      value = await factory();
      await this.set(key, value, ttl);
    }
    return value;
  }
}
```

---
*Last Updated: 2025-01-25*
*Relevance Score: 0.9*
*Category: design-patterns*
*Tags: [patterns, architecture, chess, frontend, backend, performance, caching]*
