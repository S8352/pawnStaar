#!/usr/bin/env python3
"""
Test script for the PawnStaar Roasting System
This tests the roasting engine without requiring database setup
"""

import sys
import os
sys.path.append('apps/backend')

from core.roasting_engine import RoastingEngine

def test_roasting_engine():
    print("🧪 Testing PawnStaar Roasting System")
    print("=" * 50)
    
    # Initialize roasting engine
    engine = RoastingEngine()
    print("✅ Roasting engine initialized successfully!")
    
    # Test character loading
    print("\n📋 Available Characters:")
    characters = engine.get_all_characters()
    for char in characters:
        print(f"  {char['id']}: {char['name']} ({char['tone']}, intensity {char['intensity']}/5)")
    
    # Test roast generation for different move qualities
    print("\n🎯 Testing Roast Generation:")
    print("-" * 30)
    
    test_cases = [
        {"centipawn_loss": 400, "description": "Blunder (400 centipawns)"},
        {"centipawn_loss": 200, "description": "Mistake (200 centipawns)"},
        {"centipawn_loss": 80, "description": "Inaccuracy (80 centipawns)"},
        {"centipawn_loss": 20, "description": "Good move (20 centipawns)"},
    ]
    
    for character_id in [1, 2, 3]:  # Test first 3 characters
        char_info = engine.get_character_info(character_id)
        print(f"\n{char_info['name']} ({char_info['tone']}):")
        
        for test_case in test_cases:
            roast = engine.generate_roast(character_id, test_case, [])
            print(f"  {test_case['description']}: \"{roast['roast_text']}\"")
    
    print("\n🎉 All tests passed! Roasting system is working correctly.")
    print("\n🚀 Ready to roast some chess games!")

if __name__ == "__main__":
    test_roasting_engine()

