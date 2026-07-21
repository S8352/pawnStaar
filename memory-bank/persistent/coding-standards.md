# Coding Standards and Best Practices

## TypeScript Standards

### Type Definitions

```typescript
// Prefer explicit types over 'any'
interface GameAnalysis {
  gameId: string;
  blunders: MoveAnalysis[];
  mistakes: MoveAnalysis[];
  inaccuracies: MoveAnalysis[];
  overallScore: number;
}

// Use union types for specific values
type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';
type GameResult = 'win' | 'loss' | 'draw';

// Use generics for reusable components
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

### Component Patterns

```typescript
// Functional components with proper typing
interface GameAnalysisProps {
  gameId: string;
  onAnalysisComplete: (analysis: GameAnalysis) => void;
  className?: string;
}

export const GameAnalysis: React.FC<GameAnalysisProps> = ({
  gameId,
  onAnalysisComplete,
  className
}) => {
  // Component implementation
};

// Custom hooks with proper return types
export const useGameAnalysis = (gameId: string) => {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  return { analysis, loading, error, refetch: () => {} };
};
```

## React Best Practices

### State Management

```typescript
// Use useReducer for complex state
interface GameState {
  currentGame: Game | null;
  analysis: GameAnalysis | null;
  loading: boolean;
  error: string | null;
}

type GameAction = 
  | { type: 'SET_GAME'; payload: Game }
  | { type: 'SET_ANALYSIS'; payload: GameAnalysis }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string };

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_GAME':
      return { ...state, currentGame: action.payload };
    // ... other cases
  }
};
```

### Error Handling

```typescript
// Comprehensive error boundaries
class GameAnalysisErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Game Analysis Error:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

## API Design Standards

### Endpoint Structure

```python
# FastAPI endpoint with proper typing and validation
from pydantic import BaseModel, Field
from typing import List, Optional

class GameAnalysisRequest(BaseModel):
    game_id: str = Field(..., description="Unique game identifier")
    analysis_depth: int = Field(15, ge=1, le=25, description="Analysis depth")
    include_variations: bool = Field(True, description="Include move variations")

class GameAnalysisResponse(BaseModel):
    game_id: str
    analysis: GameAnalysis
    processing_time: float
    engine_version: str

@router.post("/analyze", response_model=GameAnalysisResponse)
async def analyze_game(
    request: GameAnalysisRequest,
    current_user: User = Depends(get_current_user)
) -> GameAnalysisResponse:
    """Analyze a chess game and return detailed analysis."""
    # Implementation
```

### Error Handling

```python
# Consistent error responses
class APIError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": exc.message,
                "type": "APIError",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    )
```

## Database Standards

### Model Definitions

```python
# SQLAlchemy models with proper relationships
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    games = relationship("Game", back_populates="user", cascade="all, delete-orphan")
    analyses = relationship("GameAnalysis", back_populates="user")

class Game(Base):
    __tablename__ = "games"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    pgn = Column(Text, nullable=False)
    result = Column(String(10), nullable=False)
    time_control = Column(String(20), nullable=False)
    platform = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="games")
    analysis = relationship("GameAnalysis", back_populates="game", uselist=False)
```

## Testing Standards

### Unit Tests

```typescript
// Jest tests with proper mocking
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameAnalysis } from '../GameAnalysis';
import { useGameAnalysis } from '../../hooks/useGameAnalysis';

jest.mock('../../hooks/useGameAnalysis');
const mockUseGameAnalysis = useGameAnalysis as jest.MockedFunction<typeof useGameAnalysis>;

describe('GameAnalysis Component', () => {
  beforeEach(() => {
    mockUseGameAnalysis.mockReturnValue({
      analysis: null,
      loading: false,
      error: null,
      refetch: jest.fn()
    });
  });

  it('should display loading state', () => {
    mockUseGameAnalysis.mockReturnValue({
      analysis: null,
      loading: true,
      error: null,
      refetch: jest.fn()
    });

    render(<GameAnalysis gameId="test-game" onAnalysisComplete={jest.fn()} />);
    expect(screen.getByText('Analyzing game...')).toBeInTheDocument();
  });

  it('should handle analysis errors gracefully', async () => {
    const errorMessage = 'Analysis failed';
    mockUseGameAnalysis.mockReturnValue({
      analysis: null,
      loading: false,
      error: errorMessage,
      refetch: jest.fn()
    });

    render(<GameAnalysis gameId="test-game" onAnalysisComplete={jest.fn()} />);
    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });
});
```

### Integration Tests

```python
# Pytest integration tests
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///./test.db")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    yield TestingSessionLocal()
    Base.metadata.drop_all(bind=engine)

def test_analyze_game_endpoint(test_db, client: TestClient, test_user):
    # Test game analysis endpoint
    response = client.post(
        "/api/analyze",
        json={
            "game_id": "test-game-123",
            "analysis_depth": 15,
            "include_variations": True
        },
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "analysis" in data
    assert "blunders" in data["analysis"]
    assert "mistakes" in data["analysis"]
```

## Performance Standards

### Frontend Optimization

```typescript
// Memoization for expensive calculations
const ExpensiveGameAnalysis = React.memo(({ gameId, analysis }: Props) => {
  const processedAnalysis = useMemo(() => {
    return processGameAnalysis(analysis);
  }, [analysis]);

  const handleMoveClick = useCallback((move: Move) => {
    onMoveSelect(move);
  }, [onMoveSelect]);

  return (
    <div>
      {/* Component implementation */}
    </div>
  );
});

// Lazy loading for heavy components
const GameAnalysis = lazy(() => import('./GameAnalysis'));
const LivePlay = lazy(() => import('./LivePlay'));

// Route-based code splitting
const App = () => (
  <Router>
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/analysis" element={<GameAnalysis />} />
        <Route path="/live" element={<LivePlay />} />
      </Routes>
    </Suspense>
  </Router>
);
```

### Backend Optimization

```python
# Database query optimization
from sqlalchemy.orm import selectinload, joinedload

# Use eager loading to avoid N+1 queries
def get_user_games_with_analysis(user_id: str):
    return db.query(Game)\
        .options(selectinload(Game.analysis))\
        .filter(Game.user_id == user_id)\
        .all()

# Use database indexes for frequently queried fields
class Game(Base):
    __tablename__ = "games"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    platform = Column(String(20), index=True)
```

## Security Standards

### Input Validation

```python
# Comprehensive input validation
from pydantic import BaseModel, validator, Field
import re

class UserRegistration(BaseModel):
    email: str = Field(..., regex=r'^[^@]+@[^@]+\.[^@]+$')
    username: str = Field(..., min_length=3, max_length=50, regex=r'^[a-zA-Z0-9_]+$')
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        return v
```

### Authentication

```python
# Secure authentication implementation
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

---
*Last Updated: 2025-01-25*
*Relevance Score: 0.9*
*Category: coding-standards*
*Tags: [coding, standards, typescript, react, python, fastapi, testing, security]*

