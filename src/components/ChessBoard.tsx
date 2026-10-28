'use client';

import React, { useState, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { getPieceAssetPath } from '@/lib/chess-utils';
import { useSettings } from '@/lib/settings-context';

interface ChessBoardProps {
  chess: Chess;
  orientation: Color;
  lastMove: { from: Square; to: Square } | null;
  onMove: (from: Square, to: Square, promotion?: PieceSymbol) => boolean;
  disabled?: boolean;
  hintSquares?: { from: Square; to: Square } | null;
  reviewBadge?: { square: Square; classification: string } | null;
  playerColor?: Color | 'spectator' | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  orientation,
  lastMove,
  onMove,
  disabled = false,
  hintSquares = null,
  reviewBadge = null,
  playerColor = null,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalDestinations, setLegalDestinations] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square; color: Color } | null>(null);
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null);

  const { getBoardColors } = useSettings();
  const boardColors = getBoardColors();

  const displayFiles = orientation === 'w' ? FILES : [...FILES].reverse();
  const displayRanks = orientation === 'w' ? RANKS : [...RANKS].reverse();

  // Find king square if in check
  let kingInCheckSquare: Square | null = null;
  if (chess.inCheck()) {
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          kingInCheckSquare = `${FILES[c]}${RANKS[r]}` as Square;
        }
      }
    }
  }

  // Check if player has permission to touch/select this piece
  const canSelectPiece = useCallback(
    (piece: { color: Color; type: PieceSymbol } | null): boolean => {
      if (!piece || disabled || pendingPromotion) return false;

      // In multiplayer, players can only move their assigned color and only on their turn
      if (playerColor && (playerColor === 'w' || playerColor === 'b')) {
        return piece.color === playerColor && chess.turn() === playerColor;
      }

      // Local play / pass & play: piece must match the active turn
      return piece.color === chess.turn();
    },
    [disabled, pendingPromotion, playerColor, chess]
  );

  const getLegalMovesForSquare = (square: Square): Square[] => {
    try {
      const moves = chess.moves({ square, verbose: true }) as Move[];
      return moves ? moves.map((m) => m.to as Square) : [];
    } catch {
      return [];
    }
  };

  const attemptMove = (from: Square, to: Square) => {
    const piece = chess.get(from);
    if (!piece) return;

    // Check for pawn promotion
    const isPawn = piece.type === 'p';
    const isPromotionRank = (piece.color === 'w' && to.endsWith('8')) || (piece.color === 'b' && to.endsWith('1'));

    if (isPawn && isPromotionRank) {
      setPendingPromotion({ from, to, color: piece.color });
      return;
    }

    const success = onMove(from, to);
    if (success) {
      setSelectedSquare(null);
      setLegalDestinations([]);
    }
  };

  const handleSquareClick = (square: Square) => {
    if (disabled || pendingPromotion) return;

    const piece = chess.get(square);

    // 1. If a piece is already selected:
    if (selectedSquare) {
      // Tap on the same piece -> toggle deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalDestinations([]);
        return;
      }

      // Tap on legal destination square -> execute move!
      if (legalDestinations && legalDestinations.includes(square)) {
        attemptMove(selectedSquare, square);
        return;
      }

      // Tap on another own selectable piece -> switch selection immediately
      if (piece && canSelectPiece(piece)) {
        setSelectedSquare(square);
        setLegalDestinations(getLegalMovesForSquare(square));
        return;
      }

      // Tap anywhere else -> deselect
      setSelectedSquare(null);
      setLegalDestinations([]);
      return;
    }

    // 2. No piece selected: select if piece belongs to current player
    if (piece && canSelectPiece(piece)) {
      setSelectedSquare(square);
      setLegalDestinations(getLegalMovesForSquare(square));
    }
  };

  const handlePromotionSelect = (promotionType: PieceSymbol) => {
    if (!pendingPromotion) return;
    onMove(pendingPromotion.from, pendingPromotion.to, promotionType);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalDestinations([]);
  };

  // Drag & drop handlers (desktop / mouse)
  const handleDragStart = (e: React.DragEvent, square: Square) => {
    if (disabled || pendingPromotion) return;
    const piece = chess.get(square);
    if (piece && canSelectPiece(piece)) {
      setDraggedSquare(square);
      setSelectedSquare(square);
      setLegalDestinations(getLegalMovesForSquare(square));
      e.dataTransfer.setData('text/plain', square);
      e.dataTransfer.effectAllowed = 'move';
    } else {
      e.preventDefault();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSquare: Square) => {
    e.preventDefault();
    const sourceSquare = (e.dataTransfer.getData('text/plain') as Square) || draggedSquare;
    if (sourceSquare && legalDestinations && legalDestinations.includes(targetSquare)) {
      attemptMove(sourceSquare, targetSquare);
    }
    setDraggedSquare(null);
  };

  return (
    <div className="relative select-none aspect-square w-full h-full rounded-2xl overflow-hidden border-2 border-white/10 bg-[#16171b] shadow-2xl touch-none">
      {/* 8x8 Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full touch-none select-none">
        {displayRanks.map((rank, rankIdx) =>
          displayFiles.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const isLight = (fileIdx + rankIdx) % 2 === 0;

            const isSelected = selectedSquare === square;
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isLegal = Boolean(legalDestinations && legalDestinations.includes(square));
            const isKingInCheck = kingInCheckSquare === square;
            const isHintSquare = hintSquares?.from === square || hintSquares?.to === square;
            const isSelectable = Boolean(piece && canSelectPiece(piece));

            // Coordinates labels
            const showFileLabel = rankIdx === 7;
            const showRankLabel = fileIdx === 0;

            return (
              <div
                key={square}
                suppressHydrationWarning
                onClick={() => handleSquareClick(square)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, square)}
                className={`relative flex items-center justify-center touch-none select-none ${
                  isSelectable || isLegal ? 'cursor-pointer' : disabled ? 'cursor-default' : 'cursor-pointer'
                } ${
                  isHintSquare
                    ? '!bg-[#ffcc00]/40 ring-2 ring-inset ring-[#ffcc00]'
                    : isSelected
                    ? '!bg-[#FF6A00]/30 ring-2 ring-inset ring-[#FF6A00]'
                    : isLastMoveFrom || isLastMoveTo
                    ? isLight
                      ? '!bg-[#00c8f8]/25'
                      : '!bg-[#00c8f8]/20'
                    : ''
                } ${isKingInCheck ? '!bg-[#ff334b] ring-4 ring-[#ff334b]/80 animate-pulse' : ''}`}
                style={
                  !isHintSquare && !isSelected && !isLastMoveFrom && !isLastMoveTo && !isKingInCheck
                    ? { backgroundColor: isLight ? boardColors.light : boardColors.dark }
                    : undefined
                }
              >
                {/* File coordinate label */}
                {showFileLabel && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] font-mono font-bold tracking-tighter pointer-events-none select-none ${
                      isLight ? 'text-[#1e1e1e]/60' : 'text-[#f4f1eb]/60'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Rank coordinate label */}
                {showRankLabel && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] font-mono font-bold tracking-tighter pointer-events-none select-none ${
                      isLight ? 'text-[#1e1e1e]/60' : 'text-[#f4f1eb]/60'
                    }`}
                  >
                    {rank}
                  </span>
                )}

                {/* Piece Image with high-contrast silhouette */}
                {piece && (
                  <img
                    src={getPieceAssetPath(piece.color, piece.type)}
                    alt={`${piece.color} ${piece.type}`}
                    draggable={isSelectable}
                    onDragStart={(e) => handleDragStart(e, square)}
                    className={`w-[86%] h-[86%] object-contain z-10 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] transition-transform duration-75 ${
                      isSelectable ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : 'pointer-events-none'
                    }`}
                    style={{
                      userSelect: 'none',
                    }}
                  />
                )}

                {/* Review Classification Badge */}
                {reviewBadge && reviewBadge.square === square && (
                  <div
                    className={`absolute -top-1 -right-1 z-30 flex items-center justify-center w-5 h-5 rounded-full border border-black/40 text-[9px] font-mono font-black shadow-lg ${
                      reviewBadge.classification === 'brilliant'
                        ? 'bg-teal-500 text-black ring-2 ring-teal-300'
                        : reviewBadge.classification === 'best'
                        ? 'bg-emerald-500 text-black ring-1 ring-emerald-300'
                        : reviewBadge.classification === 'excellent'
                        ? 'bg-sky-500 text-black'
                        : reviewBadge.classification === 'inaccuracy'
                        ? 'bg-amber-400 text-black ring-1 ring-amber-300'
                        : reviewBadge.classification === 'mistake'
                        ? 'bg-orange-500 text-white'
                        : reviewBadge.classification === 'blunder'
                        ? 'bg-red-600 text-white ring-2 ring-red-400 animate-pulse'
                        : 'bg-zinc-700 text-white'
                    }`}
                  >
                    {reviewBadge.classification === 'brilliant'
                      ? '!!'
                      : reviewBadge.classification === 'best'
                      ? '★'
                      : reviewBadge.classification === 'excellent'
                      ? '✓'
                      : reviewBadge.classification === 'inaccuracy'
                      ? '?!'
                      : reviewBadge.classification === 'mistake'
                      ? '?'
                      : reviewBadge.classification === 'blunder'
                      ? '??'
                      : '•'}
                  </div>
                )}

                {/* Legal move marker: glowing neon dot for empty, glowing ring for capture */}
                {isLegal && !piece && (
                  <div className="absolute w-3.5 h-3.5 rounded-full pointer-events-none z-20 bg-[#10e080] shadow-[0_0_8px_rgba(16,224,128,0.8)]" />
                )}

                {isLegal && piece && (
                  <div className="absolute inset-1 border-[3px] border-[#ff334b] rounded-full pointer-events-none z-20 shadow-[0_0_10px_rgba(255,51,75,0.6)]" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pawn Promotion Dialog Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-[#141624] border border-white/20 p-5 rounded-3xl shadow-2xl flex flex-col items-center gap-3">
            <span className="font-mono text-xs uppercase font-extrabold tracking-widest text-zinc-300 border-b border-white/10 pb-2 w-full text-center">
              PROMOTE PAWN
            </span>
            <div className="flex gap-2.5">
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handlePromotionSelect(type)}
                  className="p-3 rounded-2xl border border-white/10 bg-[#1e2133] hover:bg-[#FF6A00] hover:border-transparent transition group active:scale-95 cursor-pointer"
                >
                  <img
                    src={getPieceAssetPath(pendingPromotion.color, type)}
                    alt={type}
                    className="w-12 h-12 object-contain group-hover:scale-105 transition drop-shadow pointer-events-none"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
