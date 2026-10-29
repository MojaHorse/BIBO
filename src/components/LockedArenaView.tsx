'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Swords, Shield, Home, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/AppShell';

interface LockedArenaViewProps {
  title: string;
  discipline: string;
  reason: string;
  recommendedHref?: string;
  recommendedLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export const LockedArenaView: React.FC<LockedArenaViewProps> = ({
  title,
  discipline,
  reason,
  recommendedHref = '/play/chess',
  recommendedLabel = 'Enter Chess Arena',
  secondaryHref = '/play/morabaraba',
  secondaryLabel = 'Play Morabaraba',
}) => {
  return (
    <AppShell>
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[65vh] text-center px-4 py-8">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Lock className="w-10 h-10 text-amber-400" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#141416] border border-amber-500/40 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
            Locked
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-mono mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{discipline.toUpperCase()} · UNDER CALIBRATION</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sora mb-3">
          {title}
        </h1>

        <p className="text-sm text-zinc-400 max-w-md leading-relaxed mb-8">
          {reason}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
          <Link
            href={recommendedHref}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#FF173D]/25 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Swords className="w-4 h-4" />
            <span>{recommendedLabel}</span>
          </Link>

          {secondaryHref && (
            <Link
              href={secondaryHref}
              className="w-full py-3 px-4 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Shield className="w-4 h-4 text-[#FF173D]" />
              <span>{secondaryLabel}</span>
            </Link>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.06] w-full max-w-sm flex justify-center">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
};
