"""
Test server for PawnStaar Roasting Platform
This server only includes the roasting functionality without Stockfish dependency
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.roasting_engine import RoastingEngine
import uvicorn

app = FastAPI(title="PawnStaar Roasting Platform Test Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "PawnStaar Roasting Platform Test Server", "status": "running"}

@app.get("/analysis/characters")
async def get_characters():
    """Get list of available roasting characters"""
    try:
        roasting_engine = RoastingEngine()
        characters = roasting_engine.get_all_characters()
        return characters
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading characters: {str(e)}")

@app.post("/analysis/test-roast")
async def test_roast(character_id: int, centipawn_loss: int):
    """Test roast generation for a specific character and move quality"""
    try:
        roasting_engine = RoastingEngine()
        roast_data = roasting_engine.generate_roast(
            character_id, 
            {'centipawn_loss': centipawn_loss}, 
            []
        )
        return roast_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating roast: {str(e)}")

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "roasting-platform"}

if __name__ == "__main__":
    print("🚀 Starting PawnStaar Roasting Platform Test Server...")
    print("📋 Available endpoints:")
    print("  GET  / - Root endpoint")
    print("  GET  /analysis/characters - Get all characters")
    print("  POST /analysis/test-roast - Test roast generation")
    print("  GET  /health - Health check")
    print("\n🎯 Test the roasting system at: http://localhost:8000")
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
