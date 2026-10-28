'use client';

import React from 'react';
import { Color, PieceSymbol } from 'chess.js';
import { getPieceAssetPath, formatTime } from '@/lib/chess-utils';
import { getRankFromXp } from '@/lib/progression';
import { Clock, User, Shield, Bot, Flame, CheckCircle2 } from 'lucide-react';

interface PlayerCardProps {
  name: string;
  color: Color;
  rating?: number;
  xp?: number;
  isActive: boolean;
  timeLeft: number;
  capturedPieces: PieceSymbol[];
  materialAdvantage: number;
  isThinking?: boolean;
  isVerifiedHuman?: boolean;
  floatingReaction?: string | null;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  color,
  rating = 1500,
  xp,
  isActive,
  timeLeft,
  capturedPieces,
  materialAdvantage,
  isThinking,
  isVerifiedHuman,
  floatingReaction,
}) => {
  const isOpponentColor = color === 'w' ? 'b' : 'w';
  const isLowTime = timeLeft < 30 && timeLeft > 0;
  const isJoyconBlue = color === 'w';

  return (
    <div
      className={`flex items-center justify-between px-2.5 py-1 rounded-xl transition-all duration-150 h-8 shrink-0 ${
        isActive
          ? isJoyconBlue
            ? 'bg-[#1c1d22] border border-[#38bdf8]/50 shadow-sm'
            : 'bg-[#1c1d22] border border-[#e60012]/50 shadow-sm'
          : 'bg-[#16171b] border border-white/[0.06]'
      }`}
    >
      {/* Player identification */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
            isJoyconBlue
              ? 'bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30'
              : 'bg-[#e60012]/20 text-[#e60012] border border-[#e60012]/30'
          }`}
        >
          {isJoyconBlue ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
        </div>

        <div className="flex items-center gap-1.5 min-w-0 relative">
          <span className="font-bold text-xs tracking-tight text-white truncate max-w-[120px] sm:max-w-[150px]">
            {name}
          </span>
          {floatingReaction && (
            <span className="animate-bounce bg-[#222226] border border-[#FF6A00]/60 text-sm px-1.5 py-0.5 rounded-full shadow-lg shadow-[#FF6A00]/20 flex items-center justify-center shrink-0">
              {floatingReaction}
            </span>
          )}
          {isVerifiedHuman && (
            <span title="Google Verified Human Tactician" className="text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            </span>
          )}
          <span className="font-mono text-[10px] text-zinc-400">
            [{rating}]
          </span>
          {xp !== undefined && (
            <span
              title={getRankFromXp(xp).tier.title}
              className="hidden sm:inline-block font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-[#ffcc00] border border-[#ffcc00]/20"
            >
              {getRankFromXp(xp).tier.badge}
            </span>
          )}
          {isThinking && (
            <span className="font-mono text-[9px] font-bold uppercase bg-[#e60012] text-white px-1.5 py-0.5 rounded animate-pulse">
              Thinking
            </span>
          )}
        </div>
      </div>

      {/* Captured pieces & Clock */}
      <div className="flex items-center gap-1.5 shrink-0">
        {capturedPieces.length > 0 && (
          <div className="flex items-center gap-0.5">
            <div className="hidden xs:flex items-center">
              {capturedPieces.slice(-4).map((piece, i) => (
                <img
                  key={i}
                  src={getPieceAssetPath(isOpponentColor, piece)}
                  alt={piece}
                  className="w-3.5 h-3.5 -ml-1.5 first:ml-0 object-contain drop-shadow"
                />
              ))}
            </div>
            {materialAdvantage > 0 && (
              <span className="font-mono text-[9px] font-bold text-[#22c55e] bg-[#22c55e]/15 border border-[#22c55e]/30 rounded px-1">
                +{materialAdvantage}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {isActive && (
            <span
              className={`w-1.5 h-1.5 rounded-full animate-ping ${
                isJoyconBlue ? 'bg-[#38bdf8]' : 'bg-[#e60012]'
              }`}
            />
          )}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs tracking-wider tabular-nums transition-all ${
              isActive
                ? isLowTime
                  ? 'bg-[#e60012] text-white animate-pulse'
                  : isJoyconBlue
                  ? 'bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8]'
                  : 'bg-[#e60012]/15 border border-[#e60012]/40 text-[#ff4d5a]'
                : 'bg-[#1c1d22] text-zinc-400 border border-white/[0.06]'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
