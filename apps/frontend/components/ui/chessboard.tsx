"use client"

import { Chessboard } from "react-chessboard"

interface ChessboardWrapperProps {
  position: string
  onMove: (move: { from: string; to: string; promotion?: string }) => void
  boardOrientation: "white" | "black"
}

/*
  react-chessboard takes colours as props rather than classes, so the palette is
  passed in literally. These are the `chess.board` values from the Tailwind
  config — cream and forest — kept in sync by hand because the library cannot
  read CSS variables. Square colours are identical in both themes on purpose:
  a board that inverts with the theme is disorienting to play on.
*/
const LIGHT_SQUARE = "#E4E4DC"
const DARK_SQUARE = "#3D5A45"

export function ChessboardWrapper({
  position,
  onMove,
  boardOrientation,
}: ChessboardWrapperProps) {
  return (
    <div className="mx-auto w-full max-w-md border border-border">
      <Chessboard
        position={position}
        onPieceDrop={(source, target) => {
          onMove({ from: source, to: target, promotion: "q" })
          return true
        }}
        boardOrientation={boardOrientation}
        customLightSquareStyle={{ backgroundColor: LIGHT_SQUARE }}
        customDarkSquareStyle={{ backgroundColor: DARK_SQUARE }}
        customBoardStyle={{ borderRadius: 0 }}
      />
    </div>
  )
}
