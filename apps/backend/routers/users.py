from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from supabase import Client
from core.supabase import get_supabase_client
from core.config import settings
from models import User
from sqlalchemy.orm import Session
from database import get_db
from core.platform_service import (
    PlatformService, 
    UnifiedProfileData, 
    UnifiedGameFilters,
    Platform
)
from core.exceptions import (
    PlatformAPIError,
    LichessAPIError,
    ChessComAPIError,
    PlayerNotFoundError,
    GameImportError
)
import logging
import asyncio
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

class UserProfile(BaseModel):
    name: str
    avatar_url: str | None = None
    lichess_username: str | None = None
    chess_com_username: str | None = None

class LinkAccountRequest(BaseModel):
    platform: str = Field(..., description="Platform name: 'lichess' or 'chess_com'")
    username: str = Field(..., min_length=1, max_length=50, description="Username on the platform")

class SearchProfileRequest(BaseModel):
    platform: str = Field(..., description="Platform name: 'lichess' or 'chess_com'")
    username: str = Field(..., min_length=1, max_length=50, description="Username to search")

class MultiPlatformSearchRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=50, description="Username to search across platforms")
    platforms: Optional[List[str]] = Field(default=None, description="Platforms to search (default: all)")

class BatchValidationRequest(BaseModel):
    validations: List[Dict[str, str]] = Field(..., description="List of platform/username pairs to validate")

class MultiPlatformImportRequest(BaseModel):
    platforms_usernames: Dict[str, str] = Field(..., description="Platform to username mapping")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Game import filters")

class PlatformResponse(BaseModel):
    success: bool
    platform: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class MultiPlatformResponse(BaseModel):
    results: Dict[str, PlatformResponse]
    summary: Dict[str, Any]

@router.get("/me", response_model=UserProfile)
async def get_current_user(supabase: Client = Depends(get_supabase_client), db: Session = Depends(get_db)):
    try:
        user_response = supabase.auth.get_user()
        user_id = user_response.user.id
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        return db_user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/me")
async def update_current_user(profile: UserProfile, supabase: Client = Depends(get_supabase_client), db: Session = Depends(get_db)):
    try:
        user_response = supabase.auth.get_user()
        user_id = user_response.user.id
        db_user = db.query(User).filter(User.id == user_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        db_user.name = profile.name
        db_user.avatar_url = profile.avatar_url
        db_user.lichess_username = profile.lichess_username
        db_user.chess_com_username = profile.chess_com_username
        db.commit()
        db.refresh(db_user)
        return db_user
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/link-account")
async def link_account(
    request: LinkAccountRequest,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase_client),
    db: Session = Depends(get_db)
):
    """Link a chess platform account with enhanced error handling"""
    try:
        user_response = supabase.auth.get_user()
        user_id = user_response.user.id
        
        async with PlatformService() as platform_service:
            # Validate username exists
            is_valid = await platform_service.validate_username(request.platform, request.username)
            if not is_valid:
                raise HTTPException(status_code=404, detail=f"Username '{request.username}' not found on {request.platform}")
            
            # Get profile data using unified structure
            profile_data = await platform_service.get_profile_data(request.platform, request.username)
            if not profile_data:
                raise HTTPException(status_code=400, detail="Could not fetch profile data")
            
            # Update user record with unified data
            db_user = db.query(User).filter(User.id == user_id).first()
            if not db_user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if request.platform == 'lichess':
                db_user.lichess_username = profile_data.username
                db_user.lichess_avatar_url = profile_data.avatar_url
                db_user.lichess_rating = profile_data.ratings.get('blitz', {}).get('rating') if profile_data.ratings else None
                db_user.lichess_verified = True
            elif request.platform == 'chess_com':
                db_user.chess_com_username = profile_data.username
                db_user.chess_com_avatar_url = profile_data.avatar_url
                db_user.chess_com_rating = profile_data.ratings.get('chess_blitz', {}).get('rating') if profile_data.ratings else None
                db_user.chess_com_verified = True
            
            db.commit()
            
            # Queue game import in background
            # background_tasks.add_task(import_games_background, user_id, request.platform, request.username)
            
            return {
                "message": "Account linked successfully",
                "profile": {
                    "platform": profile_data.platform,
                    "username": profile_data.username,
                    "display_name": profile_data.display_name,
                    "avatar_url": profile_data.avatar_url,
                    "country": profile_data.country,
                    "title": profile_data.title,
                    "verified": profile_data.verified,
                    "ratings": profile_data.ratings,
                    "platform_url": profile_data.platform_url
                }
            }
    
    except PlatformAPIError as e:
        logger.error(f"Platform API error during account linking: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Platform error: {str(e)}")
    except PlayerNotFoundError as e:
        logger.error(f"Player not found during account linking: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during account linking: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Account linking failed: {str(e)}")

@router.post("/search-profile")
async def search_profile(request: SearchProfileRequest):
    """Search for a profile on chess platform with enhanced error handling"""
    try:
        async with PlatformService() as platform_service:
            profile_data = await platform_service.get_profile_data(request.platform, request.username)
            
            if not profile_data:
                raise HTTPException(status_code=404, detail=f"Profile '{request.username}' not found on {request.platform}")
            
            return {
                "platform": profile_data.platform,
                "username": profile_data.username,
                "display_name": profile_data.display_name,
                "avatar_url": profile_data.avatar_url,
                "country": profile_data.country,
                "title": profile_data.title,
                "verified": profile_data.verified,
                "is_streamer": profile_data.is_streamer,
                "followers": profile_data.followers,
                "ratings": profile_data.ratings,
                "joined_date": profile_data.joined_date.isoformat() if profile_data.joined_date else None,
                "last_online": profile_data.last_online.isoformat() if profile_data.last_online else None,
                "platform_url": profile_data.platform_url
            }
            
    except PlatformAPIError as e:
        logger.error(f"Platform API error during profile search: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Platform error: {str(e)}")
    except PlayerNotFoundError as e:
        logger.error(f"Player not found during profile search: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during profile search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Profile search failed: {str(e)}")

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


# Enhanced Multi-Platform Endpoints

@router.post("/search-multi-platform", response_model=MultiPlatformResponse)
async def search_multi_platform(request: MultiPlatformSearchRequest):
    """Search for a username across multiple chess platforms simultaneously"""
    try:
        async with PlatformService() as platform_service:
            start_time = datetime.now()
            
            # Use provided platforms or default to all supported
            platforms = request.platforms or platform_service.get_supported_platforms()
            
            # Search across platforms concurrently
            search_results = await platform_service.search_players(
                request.username, 
                platforms=platforms,
                max_results=5
            )
            
            # Build response
            results = {}
            total_found = 0
            
            for platform in platforms:
                platform_results = search_results.get(platform, [])
                success = len(platform_results) > 0
                
                results[platform] = PlatformResponse(
                    success=success,
                    platform=platform,
                    data={
                        "players": platform_results,
                        "count": len(platform_results)
                    } if success else None,
                    error=None if success else "No players found"
                )
                
                total_found += len(platform_results)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            return MultiPlatformResponse(
                results=results,
                summary={
                    "total_platforms_searched": len(platforms),
                    "total_players_found": total_found,
                    "search_duration_seconds": round(duration, 3),
                    "platforms_with_results": sum(1 for r in results.values() if r.success)
                }
            )
            
    except Exception as e:
        logger.error(f"Multi-platform search error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/validate-batch")
async def validate_batch_usernames(request: BatchValidationRequest):
    """Validate multiple username/platform combinations in batch"""
    try:
        async with PlatformService() as platform_service:
            start_time = datetime.now()
            
            # Create validation tasks
            validation_tasks = []
            for validation in request.validations:
                platform = validation.get('platform')
                username = validation.get('username')
                
                if not platform or not username:
                    continue
                    
                task = platform_service.validate_username(platform, username)
                validation_tasks.append((platform, username, task))
            
            # Execute validations concurrently
            results = []
            for platform, username, task in validation_tasks:
                try:
                    is_valid = await task
                    results.append({
                        "platform": platform,
                        "username": username,
                        "valid": is_valid,
                        "error": None
                    })
                except Exception as e:
                    results.append({
                        "platform": platform,
                        "username": username,
                        "valid": False,
                        "error": str(e)
                    })
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            valid_count = sum(1 for r in results if r['valid'])
            
            return {
                "validations": results,
                "summary": {
                    "total_validations": len(results),
                    "valid_usernames": valid_count,
                    "invalid_usernames": len(results) - valid_count,
                    "validation_duration_seconds": round(duration, 3)
                }
            }
            
    except Exception as e:
        logger.error(f"Batch validation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch validation failed: {str(e)}")


@router.post("/import-multi-platform")
async def import_multi_platform_games(
    request: MultiPlatformImportRequest,
    background_tasks: BackgroundTasks,
    supabase: Client = Depends(get_supabase_client)
):
    """Import games from multiple platforms concurrently"""
    try:
        user_response = supabase.auth.get_user()
        user_id = user_response.user.id
        
        async with PlatformService() as platform_service:
            start_time = datetime.now()
            
            # Convert filters if provided
            filters = None
            if request.filters:
                filters = UnifiedGameFilters(**request.filters)
            
            # Import games from multiple platforms
            import_results = await platform_service.import_games_from_multiple_platforms(
                request.platforms_usernames,
                filters=filters
            )
            
            # Process results
            results = {}
            total_games = 0
            
            for platform, games in import_results.items():
                game_count = len(games)
                total_games += game_count
                
                results[platform] = PlatformResponse(
                    success=game_count > 0,
                    platform=platform,
                    data={
                        "games_imported": game_count,
                        "games": [
                            {
                                "id": game.platform_game_id,
                                "time_control": game.time_control_category,
                                "result": game.result,
                                "played_at": game.played_at.isoformat() if game.played_at else None
                            } for game in games[:5]  # Return first 5 games as preview
                        ]
                    } if game_count > 0 else None,
                    error=None if game_count > 0 else "No games imported"
                )
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # TODO: Store games in database via background task
            # background_tasks.add_task(store_imported_games, user_id, import_results)
            
            return MultiPlatformResponse(
                results=results,
                summary={
                    "total_platforms": len(request.platforms_usernames),
                    "total_games_imported": total_games,
                    "import_duration_seconds": round(duration, 3),
                    "platforms_with_games": sum(1 for r in results.values() if r.success)
                }
            )
            
    except GameImportError as e:
        logger.error(f"Game import error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Game import failed: {str(e)}")
    except Exception as e:
        logger.error(f"Multi-platform import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/platform/supported")
async def get_supported_platforms():
    """Get list of supported chess platforms"""
    try:
        platform_service = PlatformService()
        platforms = platform_service.get_supported_platforms()
        
        return {
            "platforms": platforms,
            "count": len(platforms),
            "details": {
                "lichess": {
                    "name": "Lichess",
                    "url": "https://lichess.org",
                    "features": ["profiles", "games", "analysis", "search"]
                },
                "chess_com": {
                    "name": "Chess.com",
                    "url": "https://chess.com",
                    "features": ["profiles", "games", "search"]
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Platform info error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get platform info: {str(e)}")


@router.get("/platform/metrics")
async def get_platform_metrics():
    """Get platform performance metrics and cache statistics"""
    try:
        async with PlatformService() as platform_service:
            cache_stats = platform_service.get_cache_stats()
            
            return {
                "cache": cache_stats,
                "platforms": {
                    "supported_count": len(platform_service.get_supported_platforms()),
                    "supported_platforms": platform_service.get_supported_platforms()
                },
                "timestamp": datetime.now().isoformat(),
                "service_status": "operational"
            }
            
    except Exception as e:
        logger.error(f"Metrics error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.post("/platform/cache/clear")
async def clear_platform_cache(
    supabase: Client = Depends(get_supabase_client)
):
    """Clear platform service cache (admin operation)"""
    try:
        user_response = supabase.auth.get_user()
        user = getattr(user_response, "user", None)
        user_id = getattr(user, "id", None)
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required")

        if user_id not in settings.admin_user_id_set():
            raise HTTPException(status_code=403, detail="Admin privileges required")

        platform_service = PlatformService()
        platform_service.clear_cache()

        return {
            "message": "Platform cache cleared successfully",
            "timestamp": datetime.now().isoformat()
        }

    except HTTPException:
        # Preserve intended auth status codes (401/403) instead of masking as 500.
        raise
    except Exception as e:
        logger.error(f"Cache clear error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@router.get("/platform/health")
async def platform_health_check():
    """Health check for platform services"""
    try:
        async with PlatformService() as platform_service:
            start_time = datetime.now()
            
            # Test basic platform operations
            health_results = {}
            overall_healthy = True
            
            for platform in platform_service.get_supported_platforms():
                try:
                    # Quick validation test with a known username
                    test_username = "test" if platform == "lichess" else "test"
                    await platform_service.validate_username(platform, test_username)
                    
                    health_results[platform] = {
                        "status": "healthy",
                        "response_time_ms": 0,  # Would measure actual response time
                        "last_check": datetime.now().isoformat()
                    }
                except Exception as e:
                    health_results[platform] = {
                        "status": "unhealthy",
                        "error": str(e),
                        "last_check": datetime.now().isoformat()
                    }
                    overall_healthy = False
            
            end_time = datetime.now()
            total_duration = (end_time - start_time).total_seconds()
            
            return {
                "overall_status": "healthy" if overall_healthy else "degraded",
                "platforms": health_results,
                "check_duration_seconds": round(total_duration, 3),
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "overall_status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
