'use client';

import React from 'react';
import { CoachCommentary } from '@/lib/chess-coach';
import { Lightbulb, RotateCcw, AlertTriangle, CheckCircle, GraduationCap, BookOpen, Bot } from 'lucide-react';

export interface GenericCoachCommentary {
  type: 'brilliant' | 'good' | 'warning' | 'blunder' | 'opening' | 'hint';
  title: string;
  message: string;
  suggestedMove?: any;
  suggestedAction?: any;
}

interface CoachCardProps {
  commentary: GenericCoachCommentary | null;
  onAskHint: () => void;
  onTakeBack?: () => void;
  loadingHint?: boolean;
  coachModeActive: boolean;
  onToggleCoachMode: () => void;
  title?: string;
  subtitle?: string;
}

export const CoachCard: React.FC<CoachCardProps> = ({
  commentary,
  onAskHint,
  onTakeBack,
  loadingHint = false,
  coachModeActive,
  onToggleCoachMode,
  title = 'COACH ENGINE',
  subtitle = 'In-Engine Tactical Guidance',
}) => {
  const getIcon = (type?: GenericCoachCommentary['type']) => {
    switch (type) {
      case 'blunder':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#ff334b] shrink-0" />;
      case 'opening':
        return <BookOpen className="w-4 h-4 text-[#00c8f8] shrink-0" />;
      case 'hint':
        return <Lightbulb className="w-4 h-4 text-[#ffcc00] shrink-0" />;
      default:
        return <CheckCircle className="w-4 h-4 text-[#10e080] shrink-0" />;
    }
  };

  const getBorderColor = (type?: GenericCoachCommentary['type']) => {
    switch (type) {
      case 'blunder':
      case 'warning':
        return 'border-[#e60012]/40 bg-[#e60012]/10 text-white';
      case 'opening':
        return 'border-[#38bdf8]/40 bg-[#38bdf8]/10 text-white';
      case 'hint':
        return 'border-[#ffcc00]/40 bg-[#ffcc00]/10 text-white';
      default:
        return 'border-white/[0.06] bg-[#1c1d22] text-zinc-300';
    }
  };

  return (
    <div className="flex flex-col gap-2.5 bg-[#16171b] border border-white/[0.06] rounded-2xl p-3 shadow-lg">
      {/* Header Deck */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ffcc00]/20 text-[#ffcc00] flex items-center justify-center font-bold">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-xs text-white block">
              {title}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium block">
              {subtitle}
            </span>
          </div>
        </div>

        <button
          onClick={onToggleCoachMode}
          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md transition ${
            coachModeActive
              ? 'bg-[#22c55e] text-black'
              : 'bg-white/10 text-zinc-400 hover:text-white'
          }`}
        >
          {coachModeActive ? 'ON' : 'OFF'}
        </button>
      </div>

      {coachModeActive ? (
        <div className="flex flex-col gap-2.5">
          {/* Coach Speech / Commentary Box */}
          <div
            className={`p-2.5 rounded-xl border transition-all text-xs ${getBorderColor(
              commentary?.type
            )}`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-bold mb-1">
              {getIcon(commentary?.type)}
              <span className="uppercase tracking-wide text-white">
                {commentary?.title || 'Coach Guidance'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed font-normal">
              &ldquo;
              {commentary?.message ||
                'Make your move. I will evaluate positional nuances, warn you of tactical threats, and explain opening lines.'}
              &rdquo;
            </p>
          </div>

          {/* Coach Interactive Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAskHint}
              disabled={loadingHint}
              className="flex-1 py-1.5 px-3 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-[#ffcc00]/30 text-xs font-semibold text-[#ffcc00] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Lightbulb className="w-3.5 h-3.5 text-[#ffcc00]" />
              <span>{loadingHint ? 'Calculating...' : 'Request Coach Hint'}</span>
            </button>

            {commentary?.type === 'blunder' && onTakeBack && (
              <button
                onClick={onTakeBack}
                className="py-1.5 px-3 rounded-xl bg-[#e60012] hover:bg-[#ff1a2b] text-white text-xs font-bold transition flex items-center justify-center gap-1"
                title="Undo move and try finding a better alternative"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500 py-1 font-medium">
          Enable Coach to receive move-by-move pedagogical feedback and blunder warnings.
        </p>
      )}
    </div>
  );
};
