'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Play, X, Zap } from 'lucide-react';
import { useActiveMatch } from '@/lib/active-match';
import { DisciplineIcon } from '@/components/icons/DisciplineIcon';

export const ActiveMatchBanner: React.FC = () => {
  const pathname = usePathname();
  const { activeMatch, clearActiveMatch } = useActiveMatch();

  if (!activeMatch) return null;

  // Don't show the banner if already on the active match screen
  if (pathname === activeMatch.url || pathname.startsWith(activeMatch.url.split('?')[0])) {
    return null;
  }

  const gameTitle =
    activeMatch.gameId === 'chess'
      ? 'Chess'
      : activeMatch.gameId === 'checkers'
      ? 'Checkers'
      : 'Morabaraba';

  return (
    <div className="w-full bg-gradient-to-r from-[#FF6A00]/15 via-[#FF173D]/15 to-[#FF6A00]/15 border-b border-[#FF6A00]/30 px-3 py-2 sm:px-6 sm:py-2.5 flex items-center justify-between gap-3 shadow-lg z-30 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6A00] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FF6A00]"></span>
        </span>

        <DisciplineIcon gameId={activeMatch.gameId} size={16} />

        <div className="flex items-center gap-1.5 truncate">
          <span className="text-xs font-black text-white uppercase tracking-wider">
            {gameTitle} in Progress
          </span>
          <span className="text-zinc-400 text-xs hidden sm:inline">·</span>
          <span className="text-xs text-zinc-300 truncate">
            vs <strong className="text-white font-bold">{activeMatch.opponentHandle}</strong>
            {activeMatch.opponentRating ? ` (${activeMatch.opponentRating})` : ''}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={activeMatch.url}
          className="flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Resume Game</span>
        </Link>

        <button
          onClick={() => clearActiveMatch()}
          title="Dismiss banner"
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
