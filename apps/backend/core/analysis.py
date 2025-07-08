import os
import io
import chess
import chess.pgn
import chess.engine
from pydantic import BaseModel, Field
from typing import List, Optional

class MoveAnalysis(BaseModel):
    move_number: int
    move: str
    evaluation: float
    best_move: str
    blunder: bool = False
    mistake: bool = False
    inaccuracy: bool = False

class GameAnalysis(BaseModel):
    moves: List[MoveAnalysis]
    blunder_count: int
    mistake_count: int
    inaccuracy_count: int

class StockfishService:
    def __init__(self):
        stockfish_path = os.getenv("STOCKFISH_PATH")
        if not stockfish_path:
            raise ValueError("STOCKFISH_PATH environment variable not set.")
        
        try:
            self.engine = chess.engine.SimpleEngine.popen_uci(stockfish_path)
        except FileNotFoundError:
            raise FileNotFoundError(f"Stockfish engine not found at {stockfish_path}")

    def analyze_pgn(self, pgn_string: str) -> GameAnalysis:
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
                move_analysis = MoveAnalysis(
                    move_number=i,
                    move=board.san(move),
                    evaluation=current_score.score(mate_score=10000) / 100.0,
                    best_move=board.san(info["pv"][0])
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
                
                analysis_results.append(move_analysis)

            board.push(move)
            prev_score = current_score

        return GameAnalysis(
            moves=analysis_results,
            blunder_count=blunder_count,
            mistake_count=mistake_count,
            inaccuracy_count=inaccuracy_count,
        )

    def close(self):
        self.engine.quit()
