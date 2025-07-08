import asyncio
import chess
from fastapi import WebSocket
from sqlalchemy.orm import Session
from typing import Dict, List

import models
from core.coins import CoinService

class GameManager:
    def __init__(self):
        self.games: Dict[str, "LiveGame"] = {}
        self.pending_challenges: Dict[str, "LiveGame"] = {}
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        # Handle disconnection during a game (e.g., forfeit)
        # This is a complex topic for a real app.

    async def create_challenge(self, db: Session, challenger: models.User, opponent_id: str, stake: int):
        if stake < 0:
            raise ValueError("Stake cannot be negative.")

        coin_service = CoinService(db)
        if coin_service.get_balance(challenger.id) < stake:
            raise ValueError("Insufficient balance to make this challenge.")

        game_id = f"{challenger.id}-vs-{opponent_id}"
        game = LiveGame(db, game_id, challenger.id, opponent_id, stake)
        self.pending_challenges[game_id] = game

        # Notify the opponent
        opponent_ws = self.active_connections.get(opponent_id)
        if opponent_ws:
            await opponent_ws.send_json({
                "type": "challenge_received",
                "from": challenger.name,
                "stake": stake,
                "game_id": game_id
            })
        return game_id

    async def accept_challenge(self, db: Session, game_id: str, user_id: str):
        if game_id not in self.pending_challenges:
            raise ValueError("Challenge not found or expired.")
        
        game = self.pending_challenges[game_id]
        if user_id != game.player2_id:
            raise ValueError("You are not the opponent in this challenge.")

        game.start_game()
        self.games[game_id] = game
        del self.pending_challenges[game_id]

        # Notify both players
        for player_id in [game.player1_id, game.player2_id]:
            ws = self.active_connections.get(player_id)
            if ws:
                await ws.send_json({"type": "game_started", "game_id": game_id, "stake": game.stake})

    async def handle_game_over(self, game_id: str, winner_id: str):
        if game_id not in self.games:
            return

        game = self.games[game_id]
        game.end_game(winner_id)
        
        # Notify players
        for player_id in [game.player1_id, game.player2_id]:
            ws = self.active_connections.get(player_id)
            if ws:
                await ws.send_json({
                    "type": "game_over",
                    "winner": winner_id,
                    "pot": game.stake * 2
                })
        
        del self.games[game_id]

    async def make_move(self, game_id: str, user_id: str, move: str):
        if game_id not in self.games:
            raise ValueError("Game not found.")
        
        game = self.games[game_id]
        
        try:
            game.make_move(user_id, move)
            
            # Broadcast the updated game state to both players
            for player_id in [game.player1_id, game.player2_id]:
                ws = self.active_connections.get(player_id)
                if ws:
                    await ws.send_json({
                        "type": "move_made",
                        "fen": game.board.fen(),
                        "turn": "white" if game.board.turn == chess.WHITE else "black"
                    })
            
            if game.board.is_game_over():
                winner = None
                if game.board.is_checkmate():
                    # The winner is the one whose turn it is NOT
                    winner_id = game.player2_id if game.board.turn == chess.WHITE else game.player1_id
                # Handle draw cases if necessary
                await self.handle_game_over(game_id, winner_id)

        except ValueError as e:
            # Notify the player of the invalid move
            ws = self.active_connections.get(user_id)
            if ws:
                await ws.send_json({"type": "error", "message": str(e)})


class LiveGame:
    def __init__(self, db: Session, game_id: str, player1_id: str, player2_id: str, stake: int):
        self.db = db
        self.game_id = game_id
        self.player1_id = player1_id
        self.player2_id = player2_id
        self.stake = stake
        self.coin_service = CoinService(db)
        self.board = chess.Board()

    def start_game(self):
        """Debits the stake from both players."""
        self.coin_service.debit(self.player1_id, self.stake, f"Stake for game {self.game_id}")
        self.coin_service.debit(self.player2_id, self.stake, f"Stake for game {self.game_id}")

    def make_move(self, user_id: str, move_uci: str):
        # Determine if it's the user's turn
        is_white_turn = self.board.turn == chess.WHITE
        is_player1_turn = is_white_turn and user_id == self.player1_id
        is_player2_turn = not is_white_turn and user_id == self.player2_id

        if not (is_player1_turn or is_player2_turn):
            raise ValueError("Not your turn.")

        try:
            move = chess.Move.from_uci(move_uci)
            if move in self.board.legal_moves:
                self.board.push(move)
            else:
                raise ValueError("Illegal move.")
        except ValueError:
            raise ValueError("Invalid move format.")

    def end_game(self, winner_id: str):
        """Credits the winner with the pot."""
        if winner_id not in [self.player1_id, self.player2_id]:
            # Handle draw or invalid winner
            self.coin_service.credit(self.player1_id, self.stake, f"Stake returned from game {self.game_id} (draw)")
            self.coin_service.credit(self.player2_id, self.stake, f"Stake returned from game {self.game_id} (draw)")
        else:
            pot = self.stake * 2
            self.coin_service.credit(winner_id, pot, f"Winnings from game {self.game_id}")

manager = GameManager()
