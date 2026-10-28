'use client';

import React from 'react';
import { formatTime } from '@/lib/chess-utils';
import { Shield, User, Bot, CheckCircle2, Clock } from 'lucide-react';

export interface ArenaPlayerStripProps {
  name: string;
  rating?: number | string;
  colorRole: 'white' | 'black';
  isActive: boolean;
  timeLeft: number;
  scoreOrCaptured?: React.ReactNode;
  isThinking?: boolean;
  isVerifiedHuman?: boolean;
  badge?: string;
  floatingReaction?: string | null;
  className?: string;
  containerWidth?: number;
}

export const ArenaPlayerStrip: React.FC<ArenaPlayerStripProps> = ({
  name,
  rating,
  colorRole,
  isActive,
  timeLeft,
  scoreOrCaptured,
  isThinking = false,
  isVerifiedHuman = false,
  badge,
  floatingReaction,
  className = '',
  containerWidth,
}) => {
  const isWhite = colorRole === 'white';
  const isLowTime = timeLeft < 30 && timeLeft > 0;

  return (
    <div
      style={containerWidth ? { width: containerWidth, maxWidth: '100%' } : undefined}
      className={`flex items-center justify-between px-2.5 py-1 rounded-xl transition-all duration-150 h-9 shrink-0 select-none ${
        isActive
          ? isWhite
            ? 'bg-[#1c1d22] border border-[#38bdf8]/60 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
            : 'bg-[#1c1d22] border border-[#e60012]/60 shadow-[0_0_12px_rgba(230,0,18,0.15)]'
          : 'bg-[#16171b] border border-white/[0.07]'
      } ${className}`}
    >
      {/* Left: Player identity */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
            isWhite
              ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/35'
              : 'bg-[#e60012]/20 text-[#e60012] border border-[#e60012]/35'
          }`}
        >
          {badge?.includes('BOT') ? (
            <Bot className="w-3 h-3" />
          ) : isWhite ? (
            <Shield className="w-3 h-3" />
          ) : (
            <User className="w-3 h-3" />
          )}
        </div>

        <div className="flex items-center gap-1.5 min-w-0 relative">
          <span className="font-bold text-xs tracking-tight text-white truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[180px]">
            {name}
          </span>

          {floatingReaction && (
            <span className="animate-bounce bg-[#222226] border border-[#FF6A00]/60 text-xs px-1.5 py-0.5 rounded-full shadow-lg shadow-[#FF6A00]/20 flex items-center justify-center shrink-0">
              {floatingReaction}
            </span>
          )}

          {isVerifiedHuman && (
            <span title="Verified Human Tactician" className="text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            </span>
          )}

          {rating !== undefined && (
            <span className="font-mono text-[10px] text-zinc-400 shrink-0">
              [{rating}]
            </span>
          )}

          {badge && (
            <span className="hidden xs:inline-block font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 border border-white/10 shrink-0">
              {badge}
            </span>
          )}

          {isThinking && (
            <span className="font-mono text-[9px] font-bold uppercase bg-[#e60012] text-white px-1.5 py-0.5 rounded animate-pulse shrink-0">
              Thinking
            </span>
          )}
        </div>
      </div>

      {/* Right: Score/Captured + Digital Timer */}
      <div className="flex items-center gap-2 shrink-0">
        {scoreOrCaptured && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
            {scoreOrCaptured}
          </div>
        )}

        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-xs tracking-wider transition-colors ${
            isLowTime
              ? 'bg-red-500/25 border border-red-500/50 text-red-400 animate-pulse'
              : isActive
              ? 'bg-black/60 text-white border border-white/10'
              : 'bg-black/30 text-zinc-400 border border-white/[0.04]'
          }`}
        >
          {isLowTime && <Clock className="w-2.5 h-2.5 text-red-400 shrink-0" />}
          <span>{formatTime(Math.max(0, timeLeft))}</span>
        </div>
      </div>
    </div>
  );
};
