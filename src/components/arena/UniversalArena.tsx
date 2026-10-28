'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, Flag, Trophy, Crown, Bot, User, Clock, ShieldAlert } from 'lucide-react';
import { PlayerColor } from '@/lib/games/types';

export function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export interface ArenaPlayerStripProps {
  handle: string;
  isUser?: boolean;
  color: PlayerColor;
  isTurn: boolean;
  timeLeft: number;
  telemetryText?: string;
  badgeText?: string;
  badgeColorClass?: string;
}

export const ArenaPlayerStrip: React.FC<ArenaPlayerStripProps> = ({
  handle,
  isUser = false,
  color,
  isTurn,
  timeLeft,
  telemetryText,
  badgeText,
  badgeColorClass = 'bg-amber-500/20 text-amber-400',
}) => {
  const isWhite = color === 'w';

  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#16171b] border border-white/[0.06] text-xs w-full shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`w-3.5 h-3.5 rounded-full shrink-0 shadow ${
            isWhite
              ? 'bg-slate-200 border border-amber-300'
              : 'bg-zinc-900 border border-red-500'
          }`}
        />
        <span className="font-bold text-white truncate text-[11px] sm:text-xs">
          {handle} {isUser && <span className="text-zinc-500 font-normal">(You)</span>}
        </span>
        {isTurn && (
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold animate-pulse shrink-0 ${
              isUser ? 'bg-[#22c55e]/20 text-[#22c55e]' : badgeColorClass
            }`}
          >
            {isUser ? 'YOUR TURN' : badgeText || 'ACTIVE'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 font-mono shrink-0">
        {telemetryText && (
          <span className="text-zinc-500 text-[10px] hidden sm:inline-block">
            {telemetryText}
          </span>
        )}
        <span
          className={`px-2 py-0.5 rounded font-bold text-xs ${
            timeLeft <= 30
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
              : 'bg-black/40 text-white'
          }`}
        >
          {formatTimer(timeLeft)}
        </span>
      </div>
    </div>
  );
};

export interface ArenaMoveLogProps {
  history: string[];
  maxHeight?: string;
}

export const ArenaMoveLog: React.FC<ArenaMoveLogProps> = ({
  history,
  maxHeight = '160px',
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Group into paired rounds
  const rounds: { round: number; white?: string; black?: string }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    rounds.push({
      round: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] || undefined,
    });
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div className="bg-[#16171b] border border-white/[0.06] rounded-2xl p-3 flex flex-col gap-2 shadow-lg flex-1 min-h-[160px]">
      <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06]">
        <span className="text-xs font-bold text-zinc-300">Move Log ({history.length} ply)</span>
        <span className="text-[10px] text-zinc-500 font-mono">
          {rounds.length === 0 ? 'Ready' : `Round ${rounds.length}`}
        </span>
      </div>

      <div
        ref={scrollRef}
        style={{ maxHeight }}
        className="flex-1 overflow-y-auto no-scrollbar"
      >
        {rounds.length === 0 ? (
          <span className="text-xs text-zinc-500 italic">Game ready · First move awaits</span>
        ) : (
          <div className="flex flex-col gap-1 text-xs font-mono">
            {rounds.map((r, idx) => (
              <div
                key={r.round}
                className={`grid grid-cols-[24px_1fr_1fr] gap-2 items-center px-2 py-1 rounded transition ${
                  idx === rounds.length - 1 ? 'bg-white/10 font-bold' : 'text-zinc-300'
                }`}
              >
                <span className="text-zinc-500 font-bold text-[10px]">{r.round}.</span>
                <span className="truncate flex items-center gap-1.5 text-zinc-200">
                  <span className="w-2 h-2 rounded-full bg-slate-200 shadow-sm shrink-0 inline-block" />
                  <span className="truncate">{r.white || '—'}</span>
                </span>
                <span className="truncate flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-zinc-900 border border-red-500 shadow-sm shrink-0 inline-block" />
                  <span className="truncate">{r.black || '—'}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export interface ArenaGameOverModalProps {
  headline: string;
  subdeck: string;
  gameTitle?: string;
  onPlayAgain: () => void;
  onClose?: () => void;
}

export const ArenaGameOverModal: React.FC<ArenaGameOverModalProps> = ({
  headline,
  subdeck,
  gameTitle = 'MATCH COMPLETE',
  onPlayAgain,
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#141624] border border-white/20 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-3">
        <span className="text-xs uppercase font-extrabold tracking-widest text-[#f59e0b] px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
          {gameTitle}
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white">{headline}</h2>
        <p className="text-xs text-zinc-300 font-medium leading-relaxed">{subdeck}</p>
        <button
          onClick={onPlayAgain}
          className="w-full mt-2 py-2.5 px-4 rounded-xl btn-primary-red text-white text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>PLAY AGAIN</span>
        </button>
      </div>
    </div>
  );
};

export interface UniversalArenaShellProps {
  gameTitle: string;
  boardNode: React.ReactNode;
  topPlayerNode: React.ReactNode;
  bottomPlayerNode: React.ReactNode;
  directiveAlertNode?: React.ReactNode;
  coachNode?: React.ReactNode;
  rulesNode?: React.ReactNode;
  moveLogNode?: React.ReactNode;
  settingsNode?: React.ReactNode;
  actionButtonsNode?: React.ReactNode;
  gameOverModalNode?: React.ReactNode;
  mobileToolbarNode?: React.ReactNode;
  mobileBoardSize: number;
  desktopBoardSize: number;
}

export const UniversalArenaShell: React.FC<UniversalArenaShellProps> = ({
  boardNode,
  topPlayerNode,
  bottomPlayerNode,
  directiveAlertNode,
  coachNode,
  rulesNode,
  moveLogNode,
  settingsNode,
  actionButtonsNode,
  gameOverModalNode,
  mobileToolbarNode,
  mobileBoardSize,
  desktopBoardSize,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center p-1 sm:p-2">
      {/* 1. Desktop Arena View (>= 768px) */}
      <div className="hidden md:flex w-full max-w-6xl mx-auto h-full items-center justify-center gap-5">
        {/* Left Column: Board and Player Strips */}
        <div className="flex flex-col gap-2 items-center shrink-0">
          <div style={{ width: desktopBoardSize }}>{topPlayerNode}</div>
          <div
            style={{ width: desktopBoardSize, height: desktopBoardSize }}
            className="aspect-square shrink-0"
          >
            {boardNode}
          </div>
          {directiveAlertNode && (
            <div style={{ width: desktopBoardSize }}>{directiveAlertNode}</div>
          )}
          <div style={{ width: desktopBoardSize }}>{bottomPlayerNode}</div>
        </div>

        {/* Right Column: Tactical Command Deck */}
        <div className="flex flex-1 min-w-[280px] max-w-[380px] flex-col gap-2 overflow-y-auto pr-1 w-full h-full min-h-0">
          {coachNode}
          {rulesNode}
          {moveLogNode}
          {settingsNode}
          {actionButtonsNode}
        </div>
      </div>

      {/* 2. Mobile Arena View (< 768px) */}
      <div className="flex md:hidden flex-col flex-1 min-h-0 w-full gap-1 items-center">
        {mobileToolbarNode}
        <div style={{ width: mobileBoardSize }}>{topPlayerNode}</div>
        <div
          style={{ width: mobileBoardSize, height: mobileBoardSize }}
          className="aspect-square shrink-0"
        >
          {boardNode}
        </div>
        {directiveAlertNode && (
          <div style={{ width: mobileBoardSize }}>{directiveAlertNode}</div>
        )}
        <div style={{ width: mobileBoardSize }}>{bottomPlayerNode}</div>
        {coachNode && <div style={{ width: mobileBoardSize }}>{coachNode}</div>}
        {actionButtonsNode && <div style={{ width: mobileBoardSize }}>{actionButtonsNode}</div>}
      </div>

      {/* Game Over Modal */}
      {gameOverModalNode}
    </div>
  );
};
