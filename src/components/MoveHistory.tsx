'use client';

import React, { useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ScrollText,
  TrendingUp,
} from 'lucide-react';

interface MoveHistoryProps {
  history: string[];
  currentStepIndex: number;
  onJumpToStep: (step: number) => void;
  fen: string;
  onReview?: () => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  history,
  currentStepIndex,
  onJumpToStep,
  fen,
  onReview,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Group moves into pairs [White, Black]
  const movePairs: { index: number; white: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      index: i / 2 + 1,
      white: history[i],
      black: history[i + 1],
    });
  }

  // Auto-scroll to bottom on new move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  const copyFen = () => {
    navigator.clipboard.writeText(fen);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col bg-[#16171b] border border-white/[0.06] rounded-2xl p-3 text-[#f3f4f6] shadow-lg overflow-hidden">
      {/* Console Scorebook Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ScrollText className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span className="font-extrabold text-xs tracking-wider text-white">
            SCOREBOOK
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">({history.length} ply)</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onReview && history.length > 0 && (
            <button
              onClick={onReview}
              title="Stockfish Game Review & Blunder Breakdown"
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e] hover:text-black transition"
            >
              <TrendingUp className="w-3 h-3" />
              <span>REVIEW</span>
            </button>
          )}

          <button
            onClick={copyFen}
            title="Copy current board FEN"
            className="flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.06] text-zinc-400 hover:text-white transition"
          >
            {copied ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'COPIED' : 'FEN'}</span>
          </button>
        </div>
      </div>

      {/* Column Headings */}
      <div className="grid grid-cols-12 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/[0.04] bg-[#1c1d22] rounded-lg my-1.5">
        <span className="col-span-2 text-zinc-500">#</span>
        <span className="col-span-5 text-[#38bdf8]">White</span>
        <span className="col-span-5 text-[#ff4d5a]">Black</span>
      </div>

      {/* Move list */}
      <div
        ref={scrollRef}
        className="overflow-y-auto divide-y divide-white/[0.04] font-mono text-xs select-none p-1 min-h-[90px] max-h-[140px]"
      >
        {movePairs.length === 0 ? (
          <div className="text-zinc-500 italic text-center py-6 font-sans text-xs">
            Awaiting opening moves...
          </div>
        ) : (
          movePairs.map((pair) => {
            const whiteStep = (pair.index - 1) * 2;
            const blackStep = whiteStep + 1;

            return (
              <div
                key={pair.index}
                className="grid grid-cols-12 items-center py-0.5 px-1.5 hover:bg-white/[0.03] rounded transition"
              >
                <span className="col-span-2 font-mono text-[10px] text-zinc-500 font-medium">
                  {pair.index}.
                </span>

                {/* White Move */}
                <div className="col-span-5 pr-1">
                  <button
                    onClick={() => onJumpToStep(whiteStep)}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-semibold transition ${
                      currentStepIndex === whiteStep
                        ? 'bg-[#38bdf8] text-black font-bold'
                        : 'hover:bg-white/10 text-zinc-300'
                    }`}
                  >
                    {pair.white}
                  </button>
                </div>

                {/* Black Move */}
                <div className="col-span-5 pl-1">
                  {pair.black ? (
                    <button
                      onClick={() => onJumpToStep(blackStep)}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-semibold transition ${
                        currentStepIndex === blackStep
                          ? 'bg-[#e60012] text-white font-bold'
                          : 'hover:bg-white/10 text-zinc-300'
                      }`}
                    >
                      {pair.black}
                    </button>
                  ) : (
                    <span className="text-zinc-600 font-mono">···</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Scrub Navigation Controls */}
      <div className="grid grid-cols-4 gap-1 pt-1.5 border-t border-white/[0.06]">
        <button
          onClick={() => onJumpToStep(-1)}
          disabled={currentStepIndex < 0}
          title="Beginning of game"
          className="flex items-center justify-center py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 transition"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onJumpToStep(currentStepIndex - 1)}
          disabled={currentStepIndex < 0}
          title="Previous move"
          className="flex items-center justify-center py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onJumpToStep(currentStepIndex + 1)}
          disabled={currentStepIndex >= history.length - 1}
          title="Next move"
          className="flex items-center justify-center py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onJumpToStep(history.length - 1)}
          disabled={currentStepIndex >= history.length - 1}
          title="Latest position"
          className="flex items-center justify-center py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 disabled:opacity-20 transition"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
