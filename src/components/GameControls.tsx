'use client';

import React from 'react';
import {
  Volume2,
  VolumeX,
  Bot,
  User,
  RotateCcw,
  RefreshCw,
  Undo2,
  Flag,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

interface GameControlsProps {
  onNewGame: (timeMinutes: number) => void;
  onFlipBoard: () => void;
  onResign: () => void;
  onDrawOffer: () => void;
  onUndo: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  vsBot: boolean;
  onToggleVsBot: () => void;
  botDifficulty: 'easy' | 'medium' | 'hard';
  onChangeBotDifficulty: (diff: 'easy' | 'medium' | 'hard') => void;
  gameOver: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onNewGame,
  onFlipBoard,
  onResign,
  onDrawOffer,
  onUndo,
  soundEnabled,
  onToggleSound,
  vsBot,
  onToggleVsBot,
  botDifficulty,
  onChangeBotDifficulty,
  gameOver,
}) => {
  return (
    <div className="flex flex-col gap-2.5 bg-[#16171b] border border-white/[0.06] rounded-2xl p-3 text-[#f3f4f6] shadow-lg">
      {/* Header Deck: Mode & Bot Difficulty */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleVsBot}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
              vsBot
                ? 'bg-[#38bdf8] text-black font-bold'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {vsBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            <span>{vsBot ? 'VS BOT' : 'LOCAL'}</span>
          </button>
        </div>

        {/* Bot Skill Level Selector */}
        {vsBot && (
          <div className="flex items-center gap-0.5 bg-[#1c1d22] p-0.5 rounded-lg border border-white/[0.06] text-[10px]">
            {(
              [
                { id: 'easy', label: 'EASY' },
                { id: 'medium', label: 'MED' },
                { id: 'hard', label: 'HARD' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                onClick={() => onChangeBotDifficulty(d.id)}
                className={`px-2 py-0.5 rounded-md font-bold uppercase transition ${
                  botDifficulty === d.id
                    ? 'bg-white/20 text-white'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute audio' : 'Enable audio'}
          className="p-1 rounded-lg bg-[#1c1d22] hover:bg-[#23252c] text-zinc-400 hover:text-white transition"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#22c55e]" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
        </button>
      </div>

      {/* Time Control Presets */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 w-14">
          <Clock className="w-3 h-3 text-[#ffcc00]" />
          <span>CLOCK:</span>
        </div>
        <div className="grid grid-cols-4 gap-1 flex-1">
          {[
            { label: '1m', min: 1 },
            { label: '3m', min: 3 },
            { label: '5m', min: 5 },
            { label: '10m', min: 10 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => onNewGame(preset.min)}
              className="py-1 rounded-lg bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.04] text-[10px] font-semibold text-zinc-300 hover:text-white transition text-center"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Commands */}
      <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/[0.06]">
        <button
          onClick={() => onNewGame(5)}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-[#1c1d22] hover:bg-[#23252c] text-[10px] font-bold uppercase text-zinc-300 hover:text-white transition"
          title="Start fresh match"
        >
          <RotateCcw className="w-3 h-3" />
          <span>NEW</span>
        </button>

        <button
          onClick={onFlipBoard}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-[#1c1d22] hover:bg-[#23252c] text-[10px] font-bold uppercase text-zinc-300 hover:text-white transition"
          title="Flip board orientation"
        >
          <RefreshCw className="w-3 h-3" />
          <span>FLIP</span>
        </button>

        <button
          onClick={onUndo}
          disabled={gameOver}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-[#1c1d22] hover:bg-[#23252c] text-[10px] font-bold uppercase text-zinc-300 hover:text-white transition disabled:opacity-30"
          title="Undo last move"
        >
          <Undo2 className="w-3 h-3" />
          <span>UNDO</span>
        </button>

        <button
          onClick={onResign}
          disabled={gameOver}
          className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-[#e60012]/15 hover:bg-[#e60012] text-[#ff4d5a] hover:text-white border border-[#e60012]/30 text-[10px] font-bold uppercase transition disabled:opacity-30"
          title="Concede match"
        >
          <Flag className="w-3 h-3" />
          <span>RESIGN</span>
        </button>
      </div>
    </div>
  );
};
