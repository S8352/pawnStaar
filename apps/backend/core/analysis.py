import os
import io
import chess
import chess.pgn
import chess.engine
from pydantic import BaseModel, Field
from typing import List, Optional
from .roasting_engine import RoastingEngine

class MoveAnalysis(BaseModel):
    move_number: int
    move: str
    evaluation: float
    best_move: str
    centipawn_loss: int = 0
    blunder: bool = False
    mistake: bool = False
    inaccuracy: bool = False
    roast_text: Optional[str] = None
    roast_type: Optional[str] = None
    character_used: Optional[str] = None

class GameAnalysis(BaseModel):
    moves: List[MoveAnalysis]
    blunder_count: int
    mistake_count: int
    inaccuracy_count: int
    roast_summary: Optional[str] = None
    character_used: Optional[str] = None

class StockfishService:
    def __init__(self):
        stockfish_path = os.getenv("STOCKFISH_PATH")
        if not stockfish_path:
            raise ValueError("STOCKFISH_PATH environment variable not set.")
        
        try:
            self.engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
        except FileNotFoundError:
            raise FileNotFoundError(f"Stockfish engine not found at {stockfish_path}")
        
        self.roasting_engine = RoastingEngine()

    def analyze_pgn(self, pgn_string: str, character_id: int = 2) -> GameAnalysis:
        pgn = chess.pgn.read_game(io.StringIO(pgn_string))
        if pgn is None:
            raise ValueError("Invalid PGN string")

        board = pgn.board()
        analysis_results = []
        blunder_count = 0
        mistake_count = 0
        inaccuracy_count = 0
        
        prev_score = chess.engine.Cp(0)

        for i, move in enumerate(pgn.mainline_moves()):
            info = self.engine.analyse(board, chess.engine.Limit(time=0.1))
            current_score = info["score"].white()

            # For the first move, there's no previous score to compare against
            if i > 0:
                score_delta = abs(current_score.score() - prev_score.score())
                centipawn_loss = int(score_delta)
                
                move_analysis = MoveAnalysis(
                    move_number=i,
                    move=board.san(move),
                    evaluation=current_score.score(mate_score=10000) / 100.0,
                    best_move=board.san(info["pv"][0]),
                    centipawn_loss=centipawn_loss
                )

                if score_delta > 300: # Blunder
                    move_analysis.blunder = True
                    blunder_count += 1
                elif score_delta > 150: # Mistake
                    move_analysis.mistake = True
                    mistake_count += 1
                elif score_delta > 75: # Inaccuracy
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
            roast_summary=roast_summary,
            character_used=character['display_name']
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
    
    def close(self):
        self.engine.quit()
