'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess, Square, Color } from 'chess.js';
import { X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check, Play } from 'lucide-react';
import { getPieceAssetPath } from '@/lib/chess-utils';
import { DisciplineIcon } from '@/components/icons/DisciplineIcon';

interface ReplayModalProps {
  match: {
    id: string;
    gameId?: string;
    whiteHandle?: string;
    blackHandle?: string;
    timeControl?: string;
    resultType?: string;
    pgn: string;
    finalFen?: string;
  };
  onClose: () => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const ReplayModal: React.FC<ReplayModalProps> = ({ match, onClose }) => {
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);

  // Parse game moves from PGN
  const { positions, moves } = useMemo(() => {
    const chess = new Chess();
    const posList: { fen: string; lastMove?: { from: Square; to: Square } }[] = [
      { fen: chess.fen() },
    ];
    const moveList: string[] = [];

    try {
      if (match.pgn) {
        chess.loadPgn(match.pgn);
        const historyVerbose = chess.history({ verbose: true });
        
        // Re-play from start to collect snapshots
        const replay = new Chess();
        for (const m of historyVerbose) {
          replay.move(m);
          moveList.push(m.san);
          posList.push({
            fen: replay.fen(),
            lastMove: { from: m.from as Square, to: m.to as Square },
          });
        }
      }
    } catch {
      // fallback if PGN format is variant or raw san list
    }

    return { positions: posList, moves: moveList };
  }, [match.pgn]);

  const [stepIndex, setStepIndex] = useState<number>(positions.length - 1);

  // Keep stepIndex valid
  useEffect(() => {
    setStepIndex(positions.length - 1);
  }, [positions]);

  const currentSnapshot = positions[stepIndex] || positions[0] || { fen: new Chess().fen() };
  const currentChess = useMemo(() => new Chess(currentSnapshot.fen), [currentSnapshot.fen]);

  const handlePrev = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setStepIndex((prev) => Math.min(positions.length - 1, prev + 1));
  }, [positions.length]);

  const handleStart = useCallback(() => {
    setStepIndex(0);
  }, []);

  const handleEnd = useCallback(() => {
    setStepIndex(positions.length - 1);
  }, [positions.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Home') handleStart();
      if (e.key === 'End') handleEnd();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, handleStart, handleEnd, onClose]);

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(match.pgn || '');
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentSnapshot.fen);
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-[#14151a] border border-white/10 p-4 sm:p-6 rounded-3xl shadow-2xl flex flex-col gap-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <DisciplineIcon gameId={match.gameId || 'chess'} size={22} />
            <div>
              <h2 className="text-sm sm:text-base font-black text-white font-sora">
                {match.whiteHandle || 'White'} vs {match.blackHandle || 'Black'}
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {match.timeControl} · {match.resultType || 'Match Review'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Board + Move Navigation */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center flex-1 min-h-0 overflow-y-auto">
          {/* 8x8 Board Preview */}
          <div className="aspect-square w-[280px] sm:w-[340px] md:w-[380px] shrink-0 rounded-2xl overflow-hidden border-2 border-white/10 bg-[#16171b] shadow-2xl relative select-none">
            <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
              {RANKS.map((rank, rankIdx) =>
                FILES.map((file, fileIdx) => {
                  const square = `${file}${rank}` as Square;
                  const piece = currentChess.get(square);
                  const isLight = (fileIdx + rankIdx) % 2 === 0;
                  const isLastMoveFrom = currentSnapshot.lastMove?.from === square;
                  const isLastMoveTo = currentSnapshot.lastMove?.to === square;

                  return (
                    <div
                      key={square}
                      className={`relative flex items-center justify-center select-none ${
                        isLastMoveFrom || isLastMoveTo
                          ? isLight
                            ? '!bg-[#FF6A00]/30'
                            : '!bg-[#FF6A00]/25'
                          : isLight
                          ? 'bg-[#E7CBA9]'
                          : 'bg-[#A87954]'
                      }`}
                    >
                      {rankIdx === 7 && (
                        <span className="absolute bottom-0.5 right-1 text-[9px] font-mono font-bold text-black/50 pointer-events-none">
                          {file}
                        </span>
                      )}
                      {fileIdx === 0 && (
                        <span className="absolute top-0.5 left-1 text-[9px] font-mono font-bold text-black/50 pointer-events-none">
                          {rank}
                        </span>
                      )}
                      {piece && (
                        <img
                          src={getPieceAssetPath(piece.color, piece.type)}
                          alt={`${piece.color} ${piece.type}`}
                          className="w-[86%] h-[86%] object-contain drop-shadow pointer-events-none"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Moves Sidebar & Step Controls */}
          <div className="flex flex-col gap-3 flex-1 w-full max-w-sm h-full min-h-0 justify-between">
            {/* Step Status Pill */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#1b1d24] border border-white/[0.08] text-xs">
              <span className="text-zinc-400 font-mono">
                Move {stepIndex === 0 ? '0 (Start)' : `${Math.ceil(stepIndex / 2)} of ${Math.ceil(moves.length / 2)}`}
              </span>
              <span className="font-mono font-bold text-[#FF6A00]">
                {stepIndex === 0 ? 'Initial Board' : moves[stepIndex - 1] || 'Start'}
              </span>
            </div>

            {/* Scrollable Move History */}
            <div className="flex-1 bg-[#111215] border border-white/[0.06] rounded-2xl p-2.5 overflow-y-auto max-h-48 md:max-h-64 font-mono text-xs">
              {moves.length === 0 ? (
                <p className="text-zinc-500 text-center py-4 text-[11px]">No move telemetry available.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {moves.map((moveSan, idx) => {
                    const isSelected = stepIndex === idx + 1;
                    const moveNum = Math.floor(idx / 2) + 1;
                    const isWhite = idx % 2 === 0;

                    return (
                      <button
                        key={idx}
                        onClick={() => setStepIndex(idx + 1)}
                        className={`px-2 py-1 rounded-lg text-left transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-black shadow-sm'
                            : 'text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        {isWhite && <span className="text-zinc-500 text-[10px] w-5">{moveNum}.</span>}
                        {!isWhite && <span className="w-5" />}
                        <span>{moveSan}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Playback Button Bar */}
            <div className="flex items-center justify-between gap-1.5 bg-[#1b1d24] p-1.5 rounded-2xl border border-white/[0.08]">
              <button
                onClick={handleStart}
                disabled={stepIndex === 0}
                title="First Move (Home)"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrev}
                disabled={stepIndex === 0}
                title="Previous Move (Left Arrow)"
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-zinc-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <button
                onClick={handleNext}
                disabled={stepIndex === positions.length - 1}
                title="Next Move (Right Arrow)"
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] disabled:opacity-30 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md transition cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleEnd}
                disabled={stepIndex === positions.length - 1}
                title="Last Move (End)"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/[0.08] pt-3 shrink-0">
          <button
            onClick={handleCopyFen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold transition cursor-pointer"
          >
            {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFen ? 'FEN Copied' : 'Copy FEN'}</span>
          </button>

          <button
            onClick={handleCopyPgn}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition cursor-pointer"
          >
            {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPgn ? 'PGN Copied' : 'Copy PGN'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
