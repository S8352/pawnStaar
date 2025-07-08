# PawnStaar MVP Implementation Plan: Chess Platform Account Linking

## Overview
This document outlines a detailed step-by-step plan to implement chess platform account linking (Lichess & Chess.com), game importing, and deploy the MVP at minimal cost using AI-assisted development tools.

## Table of Contents
- [Phase 1: Database & Backend Foundation](#phase-1-database--backend-foundation)
- [Phase 2: Chess Platform Integration](#phase-2-chess-platform-integration)
- [Phase 3: Frontend Account Linking](#phase-3-frontend-account-linking)
- [Phase 4: Game Import & Storage](#phase-4-game-import--storage)
- [Phase 5: AI-Assisted Deployment](#phase-5-ai-assisted-deployment)
- [Phase 6: MVP Launch](#phase-6-mvp-launch)
- [Cost Optimization Strategy](#cost-optimization-strategy)
- [AI Tools Integration](#ai-tools-integration)

---

## Phase 1: Database & Backend Foundation
**Timeline: Days 1-3**

### 1.1 Enhanced Database Schema
**Tasks:**
- [ ] Update User model with profile image fields
- [ ] Enhance Game model with platform metadata
- [ ] Create account linking validation tables
- [ ] Add database migration

**Implementation Steps:**

1. **Update `apps/backend/models.py`:**
```python
class User(Base):
    # Existing fields...
    lichess_avatar_url = Column(String, nullable=True)
    chess_com_avatar_url = Column(String, nullable=True)
    lichess_verified = Column(Boolean, default=False)
    chess_com_verified = Column(Boolean, default=False)
    lichess_rating = Column(Integer, nullable=True)
    chess_com_rating = Column(Integer, nullable=True)
    last_sync_lichess = Column(DateTime, nullable=True)
    last_sync_chess_com = Column(DateTime, nullable=True)

class Game(Base):
    # Existing fields...
    platform = Column(String, nullable=False)  # 'lichess', 'chess_com', 'manual'
    platform_game_id = Column(String, nullable=True)
    time_control = Column(String, nullable=True)
    rated = Column(Boolean, default=True)
    variant = Column(String, default='standard')
    white_player = Column(String, nullable=True)
    black_player = Column(String, nullable=True)
    white_rating = Column(Integer, nullable=True)
    black_rating = Column(Integer, nullable=True)
    user_color = Column(String, nullable=True)  # 'white', 'black'
    result = Column(String, nullable=True)  # '1-0', '0-1', '1/2-1/2'
    termination = Column(String, nullable=True)
    played_at = Column(DateTime, nullable=True)
```

2. **Create migration:**
```bash
cd apps/backend
alembic revision --autogenerate -m "add_platform_profile_fields"
alembic upgrade head
```

### 1.2 Configuration Updates
**Tasks:**
- [ ] Add Chess.com API configuration
- [ ] Update environment variables
- [ ] Add rate limiting configuration

**Implementation:**
Update `apps/backend/core/config.py`:
```python
class Settings(BaseSettings):
    # Existing settings...
    chess_com_api_base: str = "https://api.chess.com/pub"
    lichess_api_base: str = "https://lichess.org/api"
    profile_image_cache_ttl: int = 86400  # 24 hours
    max_games_import: int = 100
    rate_limit_per_minute: int = 30
```

---

## Phase 2: Chess Platform Integration
**Timeline: Days 4-7**

### 2.1 Chess.com API Service
**Tasks:**
- [ ] Create Chess.com service class
- [ ] Implement profile fetching
- [ ] Add game import functionality
- [ ] Handle rate limiting

**Implementation:**
Create `apps/backend/core/chess_com.py`:
```python
import httpx
import asyncio
from typing import Optional, List, Dict
from datetime import datetime

class ChessComService:
    def __init__(self):
        self.base_url = "https://api.chess.com/pub"
        self.client = httpx.AsyncClient()
    
    async def get_player_profile(self, username: str) -> Optional[Dict]:
        """Fetch player profile from Chess.com"""
        try:
            response = await self.client.get(f"{self.base_url}/player/{username}")
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error fetching Chess.com profile: {e}")
            return None
    
    async def get_player_games(self, username: str, year: int, month: int) -> List[Dict]:
        """Fetch games for a specific month"""
        try:
            url = f"{self.base_url}/player/{username}/games/{year}/{month:02d}"
            response = await self.client.get(url)
            if response.status_code == 200:
                data = response.json()
                return data.get('games', [])
            return []
        except Exception as e:
            print(f"Error fetching Chess.com games: {e}")
            return []
    
    async def import_recent_games(self, username: str, max_games: int = 50) -> List[Dict]:
        """Import recent games from Chess.com"""
        games = []
        current_date = datetime.now()
        
        # Try last 3 months
        for month_offset in range(3):
            year = current_date.year
            month = current_date.month - month_offset
            if month <= 0:
                month += 12
                year -= 1
            
            month_games = await self.get_player_games(username, year, month)
            games.extend(month_games)
            
            if len(games) >= max_games:
                break
            
            # Rate limiting
            await asyncio.sleep(0.1)
        
        return games[:max_games]
```

### 2.2 Enhanced Lichess Service
**Tasks:**
- [ ] Update existing Lichess service
- [ ] Add profile image fetching
- [ ] Improve error handling

**Implementation:**
Update `apps/backend/core/lichess.py`:
```python
import berserk
import httpx
from typing import Optional, Dict

class LichessService:
    def __init__(self, token: str = None):
        if token:
            session = berserk.TokenSession(token)
            self.client = berserk.Client(session)
        else:
            self.client = berserk.Client()
        self.http_client = httpx.AsyncClient()

    async def get_player_profile(self, username: str) -> Optional[Dict]:
        """Fetch player profile from Lichess"""
        try:
            profile = self.client.users.get_public_data(username)
            return profile
        except Exception as e:
            print(f"Error fetching Lichess profile: {e}")
            return None

    def import_games(self, user_id: str, username: str, max_games: int = 50):
        """Enhanced game import with metadata"""
        try:
            games_stream = self.client.games.export_by_user(
                username, 
                max=max_games,
                rated=True,
                perfType=['blitz', 'rapid', 'classical', 'bullet']
            )
            
            games = []
            for game in games_stream:
                game_data = {
                    'pgn': str(game),
                    'platform': 'lichess',
                    'platform_game_id': game.headers.get('Site', '').split('/')[-1],
                    'time_control': game.headers.get('TimeControl', ''),
                    'rated': True,
                    'white_player': game.headers.get('White', ''),
                    'black_player': game.headers.get('Black', ''),
                    'result': game.headers.get('Result', ''),
                    'termination': game.headers.get('Termination', ''),
                    'played_at': game.headers.get('UTCDate', '') + ' ' + game.headers.get('UTCTime', '')
                }
                games.append(game_data)
            
            return games
        except Exception as e:
            print(f"Error importing Lichess games: {e}")
            return []
```

### 2.3 Unified Platform Service
**Tasks:**
- [ ] Create platform abstraction layer
- [ ] Implement profile validation
- [ ] Add caching mechanism

**Implementation:**
Create `apps/backend/core/platform_service.py`:
```python
from typing import Optional, Dict, List
from .lichess import LichessService
from .chess_com import ChessComService
import asyncio

class PlatformService:
    def __init__(self):
        self.lichess = LichessService()
        self.chess_com = ChessComService()
    
    async def validate_username(self, platform: str, username: str) -> bool:
        """Validate if username exists on platform"""
        if platform == 'lichess':
            profile = await self.lichess.get_player_profile(username)
            return profile is not None
        elif platform == 'chess_com':
            profile = await self.chess_com.get_player_profile(username)
            return profile is not None
        return False
    
    async def get_profile_data(self, platform: str, username: str) -> Optional[Dict]:
        """Get unified profile data from platform"""
        if platform == 'lichess':
            profile = await self.lichess.get_player_profile(username)
            if profile:
                return {
                    'username': username,
                    'avatar_url': profile.get('profile', {}).get('avatar'),
                    'rating': profile.get('perfs', {}).get('blitz', {}).get('rating'),
                    'verified': True
                }
        elif platform == 'chess_com':
            profile = await self.chess_com.get_player_profile(username)
            if profile:
                return {
                    'username': username,
                    'avatar_url': profile.get('avatar'),
                    'rating': profile.get('stats', {}).get('chess_blitz', {}).get('last', {}).get('rating'),
                    'verified': True
                }
        return None
```

---

## Phase 3: Frontend Account Linking
**Timeline: Days 8-11**

### 3.1 Backend API Endpoints
**Tasks:**
- [ ] Create account linking endpoints
- [ ] Add username search endpoint
- [ ] Implement profile fetching API

**Implementation:**
Update `apps/backend/routers/users.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from core.platform_service import PlatformService
from sqlalchemy.orm import Session
from database import get_db
from models import User

class LinkAccountRequest(BaseModel):
    platform: str  # 'lichess' or 'chess_com'
    username: str

class SearchProfileRequest(BaseModel):
    platform: str
    username: str

@router.post("/link-account")
async def link_account(
    request: LinkAccountRequest,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase_client),
    db: Session = Depends(get_db)
):
    """Link a chess platform account"""
    try:
        user_response = supabase.auth.get_user()
        user_id = user_response.user.id
        
        platform_service = PlatformService()
        
        # Validate username exists
        is_valid = await platform_service.validate_username(request.platform, request.username)
        if not is_valid:
            raise HTTPException(status_code=404, detail="Username not found on platform")
        
        # Get profile data
        profile_data = await platform_service.get_profile_data(request.platform, request.username)
        if not profile_data:
            raise HTTPException(status_code=400, detail="Could not fetch profile data")
        
        # Update user record
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if request.platform == 'lichess':
            db_user.lichess_username = request.username
            db_user.lichess_avatar_url = profile_data['avatar_url']
            db_user.lichess_rating = profile_data['rating']
            db_user.lichess_verified = True
        elif request.platform == 'chess_com':
            db_user.chess_com_username = request.username
            db_user.chess_com_avatar_url = profile_data['avatar_url']
            db_user.chess_com_rating = profile_data['rating']
            db_user.chess_com_verified = True
        
        db.commit()
        
        # Queue game import in background
        background_tasks.add_task(import_games_background, user_id, request.platform, request.username)
        
        return {"message": "Account linked successfully", "profile": profile_data}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/search-profile")
async def search_profile(request: SearchProfileRequest):
    """Search for a profile on chess platform"""
    try:
        platform_service = PlatformService()
        profile_data = await platform_service.get_profile_data(request.platform, request.username)
        
        if not profile_data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        return profile_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/unlink-account/{platform}")
async def unlink_account(
    platform: str,
    supabase: Client = Depends(get_supabase_client),
    db: Session = Depends(get_db)
):
    """Unlink a chess platform account"""
    try:
        user_response = supabase.auth.get_user()
        user_id = user_response.user.id
        
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if platform == 'lichess':
            db_user.lichess_username = None
            db_user.lichess_avatar_url = None
            db_user.lichess_rating = None
            db_user.lichess_verified = False
        elif platform == 'chess_com':
            db_user.chess_com_username = None
            db_user.chess_com_avatar_url = None
            db_user.chess_com_rating = None
            db_user.chess_com_verified = False
        
        db.commit()
        return {"message": f"{platform} account unlinked successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def import_games_background(user_id: str, platform: str, username: str):
    """Background task to import games after account linking"""
    # Implementation for background game import
    pass
```

### 3.2 Enhanced Settings Form Component
**Tasks:**
- [ ] Add username search functionality
- [ ] Implement real-time profile preview
- [ ] Add loading states and error handling

**Implementation:**
Update `apps/frontend/components/features/settings-form.tsx`:
```tsx
"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Camera, LinkIcon, Search, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProfilePreview {
  username: string
  avatar_url?: string
  rating?: number
  verified: boolean
}

export function SettingsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState<{lichess: boolean, chess_com: boolean}>({
    lichess: false,
    chess_com: false
  })
  const [searchResults, setSearchResults] = useState<{
    lichess?: ProfilePreview,
    chess_com?: ProfilePreview
  }>({})
  const [searchInputs, setSearchInputs] = useState({
    lichess: '',
    chess_com: ''
  })
  const { toast } = useToast()

  const searchProfile = async (platform: 'lichess' | 'chess_com', username: string) => {
    if (!username.trim()) return

    setSearchLoading(prev => ({ ...prev, [platform]: true }))
    
    try {
      const response = await fetch('/api/users/search-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username })
      })
      
      if (response.ok) {
        const profileData = await response.json()
        setSearchResults(prev => ({ ...prev, [platform]: profileData }))
      } else {
        setSearchResults(prev => ({ ...prev, [platform]: undefined }))
        toast({
          title: "Profile not found",
          description: `No ${platform} profile found for username: ${username}`,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Failed to search for profile. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSearchLoading(prev => ({ ...prev, [platform]: false }))
    }
  }

  const linkAccount = async (platform: 'lichess' | 'chess_com', username: string) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/users/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username })
      })
      
      if (response.ok) {
        toast({
          title: "Account linked",
          description: `${platform} account linked successfully. Games are being imported.`,
        })
        // Refresh user data
      } else {
        const error = await response.json()
        toast({
          title: "Link failed",
          description: error.detail || "Failed to link account",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Link failed",
        description: "Failed to link account. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const ProfileSearchCard = ({ 
    platform, 
    displayName, 
    color, 
    connected = false 
  }: { 
    platform: 'lichess' | 'chess_com'
    displayName: string
    color: string
    connected?: boolean
  }) => {
    const result = searchResults[platform]
    const isSearching = searchLoading[platform]
    
    return (
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${color} rounded flex items-center justify-center`}>
            <span className="text-white text-xs font-bold">
              {displayName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium">{displayName}</p>
            {connected && <p className="text-sm text-green-600">Connected</p>}
          </div>
        </div>
        
        {!connected && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder={`Enter ${displayName} username`}
                value={searchInputs[platform]}
                onChange={(e) => setSearchInputs(prev => ({ 
                  ...prev, 
                  [platform]: e.target.value 
                }))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchProfile(platform, searchInputs[platform])
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => searchProfile(platform, searchInputs[platform])}
                disabled={isSearching || !searchInputs[platform].trim()}
              >
                {isSearching ? (
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {result && (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={result.avatar_url} />
                    <AvatarFallback>{result.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{result.username}</p>
                    {result.rating && (
                      <p className="text-sm text-gray-600">Rating: {result.rating}</p>
                    )}
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <Button
                  size="sm"
                  onClick={() => linkAccount(platform, result.username)}
                  disabled={isLoading}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Account
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Update your profile information and connect chess accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile section remains the same */}
        
        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-pawn-primary">Chess Platform Accounts</h3>
          <p className="text-sm text-gray-600">
            Connect your chess accounts to import games and sync your progress
          </p>

          <div className="space-y-4">
            <ProfileSearchCard
              platform="chess_com"
              displayName="Chess.com"
              color="bg-green-500"
            />
            
            <ProfileSearchCard
              platform="lichess"
              displayName="Lichess"
              color="bg-blue-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Phase 4: Game Import & Storage
**Timeline: Days 12-15**

### 4.1 Background Job System
**Tasks:**
- [ ] Set up Celery with Redis
- [ ] Create game import tasks
- [ ] Add progress tracking

**Implementation:**
Update `apps/backend/celery_worker.py`:
```python
from celery import Celery
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Game, GameAnalysis
from core.platform_service import PlatformService
from core.lichess import LichessService
from core.chess_com import ChessComService
import json
from datetime import datetime

celery_app = Celery('pawnstaar')
celery_app.conf.broker_url = 'redis://localhost:6379/0'
celery_app.conf.result_backend = 'redis://localhost:6379/0'

@celery_app.task(bind=True)
def import_platform_games(self, user_id: str, platform: str, username: str, max_games: int = 100):
    """Import games from chess platform"""
    db = SessionLocal()
    
    try:
        # Update task progress
        self.update_state(state='PROGRESS', meta={'current': 0, 'total': max_games, 'status': 'Starting import...'})
        
        if platform == 'lichess':
            service = LichessService()
            games_data = service.import_games(user_id, username, max_games)
        elif platform == 'chess_com':
            service = ChessComService()
            games_data = await service.import_recent_games(username, max_games)
        else:
            raise ValueError(f"Unsupported platform: {platform}")
        
        imported_count = 0
        for i, game_data in enumerate(games_data):
            # Check if game already exists
            existing_game = db.query(Game).filter(
                Game.user_id == user_id,
                Game.platform == platform,
                Game.platform_game_id == game_data.get('platform_game_id')
            ).first()
            
            if not existing_game:
                # Create new game record
                game = Game(
                    user_id=user_id,
                    pgn=game_data['pgn'],
                    platform=platform,
                    platform_game_id=game_data.get('platform_game_id'),
                    time_control=game_data.get('time_control'),
                    rated=game_data.get('rated', True),
                    variant=game_data.get('variant', 'standard'),
                    white_player=game_data.get('white_player'),
                    black_player=game_data.get('black_player'),
                    white_rating=game_data.get('white_rating'),
                    black_rating=game_data.get('black_rating'),
                    user_color=game_data.get('user_color'),
                    result=game_data.get('result'),
                    termination=game_data.get('termination'),
                    played_at=datetime.fromisoformat(game_data.get('played_at', '')) if game_data.get('played_at') else None
                )
                db.add(game)
                imported_count += 1
            
            # Update progress
            progress = int((i + 1) / len(games_data) * 100)
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': i + 1,
                    'total': len(games_data),
                    'imported': imported_count,
                    'status': f'Imported {imported_count} new games...'
                }
            )
        
        db.commit()
        
        # Update user's last sync time
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            if platform == 'lichess':
                user.last_sync_lichess = datetime.utcnow()
            elif platform == 'chess_com':
                user.last_sync_chess_com = datetime.utcnow()
            db.commit()
        
        return {
            'status': 'completed',
            'imported': imported_count,
            'total_processed': len(games_data),
            'message': f'Successfully imported {imported_count} new games from {platform}'
        }
    
    except Exception as e:
        db.rollback()
        raise self.retry(exc=e, countdown=60, max_retries=3)
    
    finally:
        db.close()

@celery_app.task
def analyze_imported_games(user_id: str, game_ids: list):
    """Analyze newly imported games"""
    # Implementation for game analysis
    pass
```

### 4.2 Game Import Progress API
**Tasks:**
- [ ] Add progress tracking endpoints
- [ ] Create import status monitoring

**Implementation:**
Create `apps/backend/routers/import.py`:
```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from celery.result import AsyncResult
from celery_worker import import_platform_games
from core.supabase import get_supabase_client
from supabase import Client

router = APIRouter()

class ImportRequest(BaseModel):
    platform: str
    username: str
    max_games: int = 100

@router.post("/start-import")
async def start_import(
    request: ImportRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """Start game import from chess platform"""
    try:
        user_response = supabase.auth.get_user()
        user_id = user_response.user.id
        
        # Start background task
        task = import_platform_games.delay(
            user_id, 
            request.platform, 
            request.username, 
            request.max_games
        )
        
        return {"task_id": task.id, "status": "started"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/import-status/{task_id}")
async def get_import_status(task_id: str):
    """Get import task status"""
    try:
        result = AsyncResult(task_id)
        
        if result.state == 'PENDING':
            response = {
                'state': result.state,
                'status': 'Task is waiting to be processed'
            }
        elif result.state == 'PROGRESS':
            response = {
                'state': result.state,
                'current': result.info.get('current', 0),
                'total': result.info.get('total', 1),
                'imported': result.info.get('imported', 0),
                'status': result.info.get('status', '')
            }
        elif result.state == 'SUCCESS':
            response = {
                'state': result.state,
                'result': result.info
            }
        else:  # FAILURE
            response = {
                'state': result.state,
                'error': str(result.info)
            }
        
        return response
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

---

## Phase 5: AI-Assisted Deployment
**Timeline: Days 16-20**

### 5.1 Cost-Optimized Infrastructure Setup

**Free Tier Services:**
- **Frontend**: Vercel (Free tier - 100GB bandwidth)
- **Backend**: Railway (Free tier - $5 credit monthly)
- **Database**: Supabase (Free tier - 500MB, 2 concurrent connections)
- **Redis**: Upstash (Free tier - 10K commands/day)
- **File Storage**: Cloudinary (Free tier - 25 credits)
- **Monitoring**: Sentry (Free tier - 5K errors/month)

### 5.2 Deployment Configuration Files

**Create deployment configs:**

1. **Vercel Configuration** (`vercel.json`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "apps/frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend-url.railway.app/$1"
    }
  ],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://okklzwqibdfxiynabkjh.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "***REMOVED_SUPABASE_ANON_KEY***"
  }
}
```

2. **Railway Deployment** (`railway.toml`):
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/backend/Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[env]
PORT = "8000"
```

3. **Docker Configuration** (Update `apps/backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

4. **GitHub Actions CI/CD** (`.github/workflows/deploy.yml`):
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd apps/backend
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          cd apps/backend
          python -m pytest tests/ -v

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/frontend

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
          service: backend
```

### 5.3 Environment Configuration

**Backend Environment Variables** (`.env`):
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Redis
REDIS_URL=redis://default:password@host:port

# Chess APIs
LICHESS_API_TOKEN=optional-token-for-authenticated-requests
CHESS_COM_API_BASE=https://api.chess.com/pub

# Security
SECRET_KEY=your-secret-key
CORS_ORIGINS=https://your-frontend-domain.vercel.app

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

**Frontend Environment Variables** (`.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://okklzwqibdfxiynabkjh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***REMOVED_SUPABASE_ANON_KEY***
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
```

---

## Phase 6: MVP Launch
**Timeline: Days 21-25**

### 6.1 Pre-Launch Testing
**Tasks:**
- [ ] End-to-end testing of account linking flow
- [ ] Game import testing with real accounts
- [ ] Performance testing under load
- [ ] Security audit and penetration testing
- [ ] Mobile responsiveness testing

**Testing Checklist:**
```bash
# Backend API Testing
curl -X POST https://your-backend.railway.app/api/users/search-profile \
  -H "Content-Type: application/json" \
  -d '{"platform": "lichess", "username": "test-user"}'

# Frontend Integration Testing
npm run test:e2e

# Load Testing
artillery run load-test.yml
```

### 6.2 Monitoring & Analytics Setup
**Tasks:**
- [ ] Set up Sentry for error tracking
- [ ] Configure Google Analytics
- [ ] Add performance monitoring
- [ ] Set up uptime monitoring

**Implementation:**
1. **Sentry Integration** (`apps/backend/main.py`):
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.sentry_dsn,
    integrations=[FastApiIntegration(auto_enable=True)],
    traces_sample_rate=0.1,
)
```

2. **Analytics** (`apps/frontend/app/layout.tsx`):
```tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 6.3 Launch Checklist
**Pre-Launch:**
- [ ] Domain setup and SSL certificates
- [ ] Database backups configured
- [ ] Rate limiting implemented
- [ ] GDPR compliance measures
- [ ] Terms of service and privacy policy
- [ ] User onboarding flow tested
- [ ] Customer support system ready

**Launch Day:**
- [ ] Deploy to production
- [ ] Monitor error rates and performance
- [ ] Test critical user flows
- [ ] Announce launch on social media
- [ ] Monitor user feedback and issues

**Post-Launch (Week 1):**
- [ ] Daily monitoring of key metrics
- [ ] User feedback collection and analysis
- [ ] Bug fixes and performance optimizations
- [ ] Feature usage analytics review

---

## Cost Optimization Strategy

### Monthly Cost Breakdown (Free Tier)
- **Vercel**: $0 (Free tier - 100GB bandwidth)
- **Railway**: $0 (Free tier - $5 credit monthly)
- **Supabase**: $0 (Free tier - 500MB database)
- **Upstash Redis**: $0 (Free tier - 10K commands/day)
- **Cloudinary**: $0 (Free tier - 25 credits)
- **Sentry**: $0 (Free tier - 5K errors/month)
- **Domain**: ~$12/year (optional, can use free subdomains)

**Total Monthly Cost: $0-1**

### Scaling Strategy (When Free Tiers Exceeded)
1. **Database**: Upgrade Supabase to Pro ($25/month) for 8GB
2. **Backend**: Railway Pro ($20/month) for better performance
3. **Redis**: Upstash Pay-as-you-go ($0.2 per 100K commands)
4. **CDN**: Cloudinary Pro ($89/month) for image optimization

**Estimated Cost at 1K Users: $50-75/month**

### Cost Optimization Techniques
- **Database Query Optimization**: Use indexes, limit queries
- **Caching Strategy**: Redis for frequently accessed data
- **Image Optimization**: Compress and resize profile images
- **API Rate Limiting**: Prevent abuse and reduce costs
- **Background Jobs**: Use Celery for heavy operations

---

## AI Tools Integration

### Development Phase AI Tools

**1. GitHub Copilot Integration**
```bash
# Install GitHub Copilot in VS Code
# Enable for Python, TypeScript, and SQL files
# Use for:
# - API endpoint generation
# - Database query optimization
# - Frontend component scaffolding
```

**2. Cursor AI IDE**
```bash
# Use Cursor for:
# - Code refactoring and optimization
# - Bug detection and fixes
# - Documentation generation
# - Test case creation
```

**3. AI-Powered Code Review**
```yaml
# .github/workflows/ai-review.yml
name: AI Code Review
on: [pull_request]
jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: github/super-linter@v4
        env:
          DEFAULT_BRANCH: main
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Deployment Phase AI Tools

**1. Automated Deployment with AI**
```bash
# Use Railway CLI with AI suggestions
railway login
railway init
railway deploy --detach

# Use Vercel CLI with optimization suggestions
vercel --prod
```

**2. Performance Monitoring AI**
```python
# Sentry Performance Monitoring
import sentry_sdk
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn="your-dsn",
    integrations=[SqlalchemyIntegration()],
    traces_sample_rate=1.0,
    profiles_sample_rate=1.0,
)
```

**3. AI-Powered Testing**
```bash
# Use Playwright with AI test generation
npm install @playwright/test
npx playwright codegen your-app-url
```

### Maintenance Phase AI Tools

**1. Automated Bug Detection**
```python
# DeepCode/Snyk integration for security
# SonarQube for code quality
# Dependabot for dependency updates
```

**2. AI-Powered Analytics**
```javascript
// Google Analytics with AI insights
// Mixpanel for user behavior analysis
// Hotjar for user experience optimization
```

---

## Implementation Timeline Summary

| Phase | Duration | Key Deliverables | AI Tools Used |
|-------|----------|------------------|---------------|
| Phase 1 | Days 1-3 | Database schema, backend foundation | GitHub Copilot, Cursor |
| Phase 2 | Days 4-7 | Chess platform APIs, services | GitHub Copilot, AI code review |
| Phase 3 | Days 8-11 | Frontend components, API integration | Cursor, Copilot |
| Phase 4 | Days 12-15 | Game import system, background jobs | AI testing, code optimization |
| Phase 5 | Days 16-20 | Deployment setup, CI/CD | Railway AI, Vercel optimization |
| Phase 6 | Days 21-25 | Testing, monitoring, launch | AI monitoring, analytics |

## Success Metrics

**Technical Metrics:**
- API response time < 200ms
- 99.9% uptime
- Zero critical security vulnerabilities
- < 1% error rate

**Business Metrics:**
- User account linking rate > 60%
- Game import success rate > 95%
- User retention rate > 40% (7-day)
- Average games imported per user > 50

**Cost Metrics:**
- Stay within free tier limits for first 1K users
- Cost per user < $0.10/month
- Infrastructure costs < 10% of revenue

---

## Risk Mitigation

**Technical Risks:**
- **API Rate Limits**: Implement exponential backoff and queuing
- **Database Performance**: Use connection pooling and query optimization
- **Security Vulnerabilities**: Regular security audits and updates

**Business Risks:**
- **Platform API Changes**: Monitor API documentation and maintain fallbacks
- **User Adoption**: A/B test onboarding flows and gather feedback
- **Scaling Costs**: Monitor usage and optimize before hitting limits

**Operational Risks:**
- **Deployment Failures**: Implement blue-green deployments and rollback procedures
- **Data Loss**: Automated backups and disaster recovery procedures
- **Team Knowledge**: Document all processes and maintain knowledge base

---

## Next Steps

1. **Review and approve this implementation plan**
2. **Set up development environment and tools**
3. **Begin Phase 1 implementation**
4. **Set up project management and tracking**
5. **Schedule regular progress reviews and adjustments**

This comprehensive plan provides a roadmap to take your chess platform account linking feature from concept to live MVP while minimizing costs and leveraging AI tools for maximum efficiency.
