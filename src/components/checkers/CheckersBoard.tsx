'use client';

import React, { useState } from 'react';
import { Crown, Sparkles, Swords } from 'lucide-react';
import { Piece, Turn, Position, CheckersMove } from '@/lib/checkers-engine';

interface CheckersBoardProps {
  board: Piece[][];
  turn: Turn;
  orientation?: 'w' | 'b';
  legalMoves: CheckersMove[];
  onMove: (from: Position, to: Position) => void;
  lastMove?: { from: Position; to: Position } | null;
  activeMultiJumpPiece?: Position | null;
  disabled?: boolean;
  onMandatoryJumpAlert?: (message: string) => void;
  hintMove?: { from: Position; to: Position } | null;
}

export const CheckersBoard: React.FC<CheckersBoardProps> = ({
  board,
  turn,
  orientation = 'w',
  legalMoves,
  onMove,
  lastMove,
  activeMultiJumpPiece,
  disabled = false,
  onMandatoryJumpAlert,
  hintMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [shakeSquare, setShakeSquare] = useState<Position | null>(null);

  // If in multi-jump, automatically select the piece that must continue jumping
  React.useEffect(() => {
    if (activeMultiJumpPiece) {
      setSelectedSquare(activeMultiJumpPiece);
    }
  }, [activeMultiJumpPiece]);

  // Capture pieces among legal moves (pieces that have at least one capture)
  const capturePieces = React.useMemo(() => {
    const list: Position[] = [];
    for (const m of legalMoves) {
      if (m.captured && !list.some((p) => p.row === m.from.row && p.col === m.from.col)) {
        list.push(m.from);
      }
    }
    return list;
  }, [legalMoves]);
  const hasMandatoryJumps = capturePieces.length > 0;

  // Available destinations for selected piece
  const availableMovesForSelected = selectedSquare
    ? legalMoves.filter(
        (m) => m.from.row === selectedSquare.row && m.from.col === selectedSquare.col
      )
    : [];

  const handleSquareClick = (r: number, c: number) => {
    if (disabled) return;

    // Check if clicking on an available destination square
    if (selectedSquare) {
      const match = availableMovesForSelected.find(
        (m) => m.to.row === r && m.to.col === c
      );
      if (match) {
        onMove(selectedSquare, { row: r, col: c });
        setSelectedSquare(null);
        return;
      }
    }

    // Otherwise, select a piece of current turn
    const p = board[r][c];
    if (p) {
      const isMyColor = turn === 'w' ? p === 'w' || p === 'W' : p === 'b' || p === 'B';
      if (isMyColor) {
        // If in multi-jump, only the locked piece can be selected
        if (activeMultiJumpPiece) {
          if (activeMultiJumpPiece.row === r && activeMultiJumpPiece.col === c) {
            setSelectedSquare({ row: r, col: c });
          } else {
            setShakeSquare({ row: r, col: c });
            setTimeout(() => setShakeSquare(null), 400);
            if (onMandatoryJumpAlert) {
              onMandatoryJumpAlert('Multi-jump in progress! You must continue jumping with the highlighted piece.');
            }
          }
        } else {
          // Check if this piece has legal moves
          const hasMoves = legalMoves.some(
            (m) => m.from.row === r && m.from.col === c
          );
          if (hasMoves) {
            setSelectedSquare({ row: r, col: c });
          } else {
            // Cannot move this piece
            setShakeSquare({ row: r, col: c });
            setTimeout(() => setShakeSquare(null), 400);
            if (hasMandatoryJumps) {
              const jumpNotations = capturePieces
                .map((pos) => `${String.fromCharCode(65 + pos.col)}${8 - pos.row}`)
                .join(', ');
              if (onMandatoryJumpAlert) {
                onMandatoryJumpAlert(`Mandatory Jump! Piece at ${jumpNotations} must capture.`);
              }
              // Auto-select the first mandatory jump piece so user sees the jump immediately!
              setSelectedSquare(capturePieces[0]);
            }
          }
        }
      } else {
        setSelectedSquare(null);
      }
    } else {
      setSelectedSquare(null);
    }
  };

  const rows = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="w-full h-full relative select-none rounded-2xl overflow-hidden shadow-2xl border-4 border-[#22242b] bg-[#16171b]">
      <div className="w-full h-full grid grid-cols-8 grid-rows-8 aspect-square">
        {rows.map((r) =>
          cols.map((c) => {
            const isDark = (r + c) % 2 === 1;
            const piece = board[r][c];

            const isSelected =
              selectedSquare?.row === r && selectedSquare?.col === c;

            const isDestination = availableMovesForSelected.some(
              (m) => m.to.row === r && m.to.col === c
            );

            const isCaptureDestination = availableMovesForSelected.some(
              (m) => m.to.row === r && m.to.col === c && m.captured
            );

            const isLastMoveSquare =
              (lastMove?.from.row === r && lastMove?.from.col === c) ||
              (lastMove?.to.row === r && lastMove?.to.col === c);

            const isMandatoryMultiJumpSquare =
              activeMultiJumpPiece?.row === r && activeMultiJumpPiece?.col === c;

            const isMandatoryCapturePiece = capturePieces.some(
              (p) => p.row === r && p.col === c
            );

            const isShaking = shakeSquare?.row === r && shakeSquare?.col === c;

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => handleSquareClick(r, c)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                  isDark
                    ? isLastMoveSquare
                      ? 'bg-[#3b4758]'
                      : 'bg-[#222933]'
                    : 'bg-[#d8d3c5]'
                }`}
              >
                {/* Dark Square Coordinates (Bottom-left & top-left subtle markings) */}
                {c === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[9px] font-mono font-bold pointer-events-none ${
                      isDark ? 'text-zinc-600' : 'text-zinc-500'
                    }`}
                  >
                    {8 - r}
                  </span>
                )}
                {r === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[9px] font-mono font-bold pointer-events-none ${
                      isDark ? 'text-zinc-600' : 'text-zinc-500'
                    }`}
                  >
                    {String.fromCharCode(65 + c)}
                  </span>
                )}

                {/* Piece Rendering */}
                {piece && (
                  <div
                    className={`w-[84%] h-[84%] rounded-full relative flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                      piece === 'w' || piece === 'W'
                        ? 'bg-gradient-to-br from-[#ffffff] via-[#f1f5f9] to-[#cbd5e1] border-2 border-amber-300/80 text-amber-900 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_6px_12px_rgba(0,0,0,0.5)]'
                        : 'bg-gradient-to-br from-[#27272a] via-[#18181b] to-[#09090b] border-2 border-red-500/60 text-red-500 shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),0_6px_12px_rgba(0,0,0,0.7)]'
                    } ${
                      isSelected
                        ? 'ring-4 ring-[#ffcc00] scale-105 shadow-[0_0_15px_rgba(255,204,0,0.6)]'
                        : isMandatoryMultiJumpSquare
                        ? 'ring-4 ring-[#22c55e] animate-pulse'
                        : isMandatoryCapturePiece
                        ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-[#16171b] shadow-[0_0_18px_rgba(245,158,11,0.8)] animate-pulse'
                        : hintMove && hintMove.from.row === r && hintMove.from.col === c
                        ? 'ring-4 ring-[#ffcc00] ring-offset-2 ring-offset-[#16171b] shadow-[0_0_18px_rgba(255,204,0,0.8)] animate-pulse'
                        : ''
                    } ${isShaking ? 'animate-shake' : ''}`}
                  >
                    {/* Inner concentric ring for authentic wooden/plastic checkers piece feel */}
                    <div
                      className={`w-[70%] h-[70%] rounded-full border flex items-center justify-center ${
                        piece === 'w' || piece === 'W'
                          ? 'border-amber-400/60 bg-amber-50/30'
                          : 'border-red-500/20 bg-black/50'
                      }`}
                    >
                      {/* King Crown Emblem */}
                      {(piece === 'W' || piece === 'B') && (
                        <Crown
                          className={`w-[60%] h-[60%] ${
                            piece === 'W'
                              ? 'text-[#d97706] fill-[#f59e0b] drop-shadow-md'
                              : 'text-[#ef4444] fill-[#dc2626] drop-shadow-md'
                          } animate-in zoom-in`}
                        />
                      )}
                    </div>

                    {/* Mandatory Capture Badge */}
                    {isMandatoryCapturePiece && (
                      <div
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-red-600 border border-white text-white flex items-center justify-center shadow-lg animate-bounce z-10"
                        title="Mandatory Jump Required"
                      >
                        <Swords className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                )}

                {/* Legal Move Landing Indicators */}
                {isDestination && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {isCaptureDestination ? (
                      <div className="w-[84%] h-[84%] rounded-full border-2 border-[#ff334b] bg-red-500/20 animate-pulse flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff334b]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-[#22c55e]/70 ring-4 ring-[#22c55e]/20" />
                    )}
                  </div>
                )}

                {/* Coach Hint Target Landing Beacon */}
                {hintMove && hintMove.to.row === r && hintMove.to.col === c && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-8 h-8 rounded-full border-2 border-[#ffcc00] bg-[#ffcc00]/30 animate-ping" />
                    <div className="w-4 h-4 rounded-full bg-[#ffcc00] shadow-[0_0_12px_#ffcc00]" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
