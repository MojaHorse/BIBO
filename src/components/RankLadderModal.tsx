'use client';

import React from 'react';
import { X, Trophy, CheckCircle2, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { RANK_TIERS, RankTier, getRankFromXp } from '@/lib/progression';

interface RankLadderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentXp: number;
}

const LEAGUE_COLORS: Record<string, { bg: string; border: string; text: string; badgeBg: string }> = {
  Cadet: {
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
    text: 'text-zinc-300',
    badgeBg: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40',
  },
  Operative: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  Strategist: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-400',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  Vanguard: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  Grandmaster: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  Legendary: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  Apex: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    text: 'text-teal-300',
    badgeBg: 'bg-teal-500/20 text-teal-200 border-teal-500/40',
  },
};

export const RankLadderModal: React.FC<RankLadderModalProps> = ({
  isOpen,
  onClose,
  currentXp,
}) => {
  if (!isOpen) return null;

  const currentRank = getRankFromXp(currentXp);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#141416] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#18191e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6A00]/20 border border-[#FF6A00]/40 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#FF6A00]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white font-sora">
                Tactician Rank Ladder
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Current Standing: <strong className="text-[#FF6A00]">{currentXp.toLocaleString()} XP</strong> ({currentRank.tier.title})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Ladder */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-3 space-y-1">
          {RANK_TIERS.map((tier) => {
            const isCurrent = currentRank.tier.badge === tier.badge;
            const isUnlocked = currentXp >= tier.minXp;
            const leagueStyle = LEAGUE_COLORS[tier.league] || LEAGUE_COLORS.Cadet;

            return (
              <div
                key={tier.badge}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-[#1f2128] border-[#FF6A00] shadow-[0_0_20px_rgba(255,106,0,0.15)] ring-1 ring-[#FF6A00]/50'
                    : isUnlocked
                    ? 'bg-[#18191e] border-white/[0.08] hover:border-white/[0.14]'
                    : 'bg-[#121315]/70 border-white/[0.04] opacity-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 border ${
                      isCurrent
                        ? 'bg-[#FF6A00]/25 text-[#FF6A00] border-[#FF6A00]/50'
                        : isUnlocked
                        ? leagueStyle.badgeBg
                        : 'bg-white/5 text-zinc-600 border-white/5'
                    }`}
                  >
                    {isCurrent ? (
                      <Sparkles className="w-5 h-5" />
                    ) : isUnlocked ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white truncate">
                        {tier.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${leagueStyle.badgeBg}`}
                      >
                        {tier.badge}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-mono font-extrabold px-2 py-0.2 rounded-full bg-[#FF6A00] text-white uppercase tracking-wider shadow-xs">
                          Current Rank
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-400 font-medium">
                      {tier.league} League · Division {tier.division}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span className={`text-xs font-bold block ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>
                    {tier.minXp.toLocaleString()} XP
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    {isUnlocked && !isCurrent
                      ? 'Attained'
                      : isCurrent
                      ? `${currentRank.progressPercent}% to next`
                      : `${(tier.minXp - currentXp).toLocaleString()} XP needed`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-white/[0.08] bg-[#18191e] flex items-center justify-between text-xs text-zinc-400">
          <span>Earn XP by playing Chess, Checkers, and Morabaraba matches.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
