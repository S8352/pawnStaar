"use client"

import { Chessboard } from "react-chessboard"

interface ChessboardWrapperProps {
  position: string;
  onMove: (move: { from: string; to: string; promotion?: string }) => void;
  boardOrientation: "white" | "black";
}

export function ChessboardWrapper({ position, onMove, boardOrientation }: ChessboardWrapperProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <Chessboard
        position={position}
        onPieceDrop={(source, target) => {
          onMove({ from: source, to: target, promotion: "q" });
          return true;
        }}
        boardOrientation={boardOrientation}
      />
    </div>
  );
}
