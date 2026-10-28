'use client';

import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ListOrdered, Sparkles } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface MobileMoveTickerProps {
  history: string[];
  currentStepIndex: number;
  onJumpToStep: (stepIdx: number) => void;
  onOpenMoveSheet: () => void;
  coachCommentary?: string | null;
  onOpenCoachSheet?: () => void;
}

export const MobileMoveTicker: React.FC<MobileMoveTickerProps> = ({
  history,
  currentStepIndex,
  onJumpToStep,
  onOpenMoveSheet,
  coachCommentary,
  onOpenCoachSheet,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [history.length, currentStepIndex]);

  const canStepBack = currentStepIndex >= 0;
  const canStepForward = currentStepIndex < history.length - 1;

  const handleStepBack = () => {
    if (canStepBack) {
      haptics.tap();
      onJumpToStep(currentStepIndex - 1);
    }
  };

  const handleStepForward = () => {
    if (canStepForward) {
      haptics.tap();
      onJumpToStep(currentStepIndex + 1);
    }
  };

  return (
    <div className="w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-xl bg-[#16171b] border border-white/[0.06] text-xs h-9 shrink-0 select-none">
      {/* Step Backward Button */}
      <button
        onClick={handleStepBack}
        disabled={!canStepBack}
        aria-label="Previous move"
        className="p-1 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Horizontal Scrollable Move Ribbon */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {history.length === 0 ? (
          <span className="text-[11px] text-zinc-500 font-mono italic">
            Match ready · White to move
          </span>
        ) : (
          history.map((san, idx) => {
            const moveNum = Math.floor(idx / 2) + 1;
            const isWhite = idx % 2 === 0;
            const isSelected = idx === currentStepIndex;

            return (
              <button
                key={idx}
                onClick={() => {
                  haptics.tap();
                  onJumpToStep(idx);
                }}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono shrink-0 transition ${
                  isSelected
                    ? 'bg-[#22c55e] text-black font-extrabold shadow-sm'
                    : 'bg-white/[0.04] text-zinc-300 hover:bg-white/10'
                }`}
              >
                {isWhite && <span className="text-zinc-500 text-[10px]">{moveNum}.</span>}
                <span>{san}</span>
              </button>
            );
          })
        )}
      </div>

      {/* Step Forward Button */}
      <button
        onClick={handleStepForward}
        disabled={!canStepForward}
        aria-label="Next move"
        className="p-1 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

      {/* Actions: Coach commentary badge & Full sheet toggle */}
      <div className="flex items-center gap-1 shrink-0">
        {onOpenCoachSheet && (
          <button
            onClick={() => {
              haptics.tap();
              onOpenCoachSheet();
            }}
            title={coachCommentary || 'Coach Analysis'}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold transition cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-bold">Coach</span>
          </button>
        )}

        <button
          onClick={() => {
            haptics.tap();
            onOpenMoveSheet();
          }}
          title="Open Full Move List"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.08] text-zinc-300 text-[10px] font-bold font-mono transition cursor-pointer"
        >
          <ListOrdered className="w-3 h-3 text-[#38bdf8]" />
          <span>Moves</span>
        </button>
      </div>
    </div>
  );
};
