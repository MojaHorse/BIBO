'use client';

import React from 'react';
import {
  RotateCcw,
  ScrollText,
  SlidersHorizontal,
  Swords,
  GraduationCap,
} from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface MobileThumbBarProps {
  onFlip: () => void;
  onOpenCoach?: () => void;
  hasCoach?: boolean;
  coachHasTip?: boolean;
  onOpenScorebook: () => void;
  moveCount?: number;
  onOpenActions: () => void;
  onNewGame?: () => void;
  gameActive: boolean;
  gameOver: boolean;
}

export const MobileThumbBar: React.FC<MobileThumbBarProps> = ({
  onFlip,
  onOpenCoach,
  hasCoach = true,
  coachHasTip = false,
  onOpenScorebook,
  moveCount = 0,
  onOpenActions,
  onNewGame,
  gameActive,
  gameOver,
}) => {
  return (
    <div
      className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-2xl bg-[#16171b]/95 border border-white/[0.08] backdrop-blur-md text-xs h-12 shrink-0 select-none shadow-lg shadow-black/40"
    >
      {/* 1. Coach (disabled/hidden if no coach functionality) */}
      {hasCoach ? (
        <button
          onClick={() => {
            haptics.tap();
            onOpenCoach?.();
          }}
          title="Open Coach & Position Analysis"
          className="flex-1 h-9 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.06] text-zinc-300 transition cursor-pointer active:scale-95 relative"
        >
          <div className="relative">
            <GraduationCap className="w-4 h-4 text-[#ffcc00]" />
            {coachHasTip && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight text-white leading-none">Coach</span>
        </button>
      ) : (
        <button
          disabled
          className="flex-1 h-9 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1c1d22]/40 border border-white/[0.03] text-zinc-600 opacity-40 cursor-not-allowed"
        >
          <GraduationCap className="w-4 h-4 text-zinc-600" />
          <span className="text-[10px] font-bold tracking-tight text-zinc-600 leading-none">Coach</span>
        </button>
      )}

      {/* 2. Moves (Scorebook) */}
      <button
        onClick={() => {
          haptics.tap();
          onOpenScorebook();
        }}
        title="Open Match Scorebook"
        className="flex-1 h-9 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.06] text-zinc-300 transition cursor-pointer active:scale-95"
      >
        <ScrollText className="w-4 h-4 text-[#38bdf8]" />
        <span className="text-[10px] font-bold tracking-tight text-white leading-none">
          {moveCount > 0 ? `${Math.ceil(moveCount / 2)} moves` : 'Moves'}
        </span>
      </button>

      {/* 3. Flip Board */}
      <button
        onClick={() => {
          haptics.tap();
          onFlip();
        }}
        title="Flip Board View"
        className="flex-1 h-9 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.06] text-zinc-300 transition cursor-pointer active:scale-95"
      >
        <RotateCcw className="w-4 h-4 text-zinc-400" />
        <span className="text-[10px] font-bold tracking-tight text-zinc-300 leading-none">Flip</span>
      </button>

      {/* 4. Actions / Rematch */}
      {gameOver && onNewGame ? (
        <button
          onClick={() => {
            haptics.tap();
            onNewGame();
          }}
          title="Start Rematch"
          className="flex-1 h-9 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-gradient-to-r from-[#22c55e] to-emerald-400 text-black font-extrabold border border-emerald-300 transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
        >
          <Swords className="w-4 h-4 text-black" />
          <span className="text-[10px] font-black tracking-tight text-black leading-none">Rematch</span>
        </button>
      ) : (
        <button
          onClick={() => {
            haptics.tap();
            onOpenActions();
          }}
          title="Actions, Draw, Resign & Settings"
          className="flex-1 h-9 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.06] text-zinc-300 transition cursor-pointer active:scale-95"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#FF6A00]" />
          <span className="text-[10px] font-bold tracking-tight text-white leading-none">Actions</span>
        </button>
      )}
    </div>
  );
};
