from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from supabase import Client
from core.supabase import get_supabase_client
from models import User
from sqlalchemy.orm import Session
from database import get_db
from core.platform_service import PlatformService

router = APIRouter()

class UserProfile(BaseModel):
    name: str
    avatar_url: str | None = None
    lichess_username: str | None = None
    chess_com_username: str | None = None

class LinkAccountRequest(BaseModel):
    platform: str  # 'lichess' or 'chess_com'
    username: str

class SearchProfileRequest(BaseModel):
    platform: str
    username: str

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
        # background_tasks.add_task(import_games_background, user_id, request.platform, request.username)
        
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
