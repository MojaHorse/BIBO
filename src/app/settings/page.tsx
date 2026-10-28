'use client';

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import {
  Settings,
  Volume2,
  VolumeX,
  Palette,
  Check,
  RotateCcw,
  Sliders,
  Shield,
  Play,
  Volume1,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useSettings, BoardTheme, SoundTheme } from '@/lib/settings-context';
import { ChessBoard } from '@/components/ChessBoard';
import { soundManager } from '@/lib/chess-sound';
import { getPlayerSession } from '@/lib/session';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [session, setSession] = useState<{ id: string; handle: string }>({ id: '', handle: '' });
  const [previewChess] = useState<Chess>(
    () => new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2')
  );

  useEffect(() => {
    const s = getPlayerSession();
    setSession(s);
  }, []);

  const handleTestSound = (type: 'move' | 'capture' | 'check' | 'victory') => {
    if (type === 'move') soundManager.playMove();
    else if (type === 'capture') soundManager.playCapture();
    else if (type === 'check') soundManager.playCheck();
    else if (type === 'victory') soundManager.playSuccess();
  };

  const boardThemes: { id: BoardTheme; label: string; desc: string; preview: string }[] = [
    {
      id: 'noir',
      label: 'Noir Obsidian',
      desc: 'High-contrast dark OLED aesthetic. Jet black & cream.',
      preview: 'bg-[#1e1e1e]',
    },
    {
      id: 'wood',
      label: 'Boxwood Timber',
      desc: 'Warm walnut and birch tournament timber.',
      preview: 'bg-[#b58863]',
    },
    {
      id: 'slate',
      label: 'Slate Console',
      desc: 'Cool architectural slate gray with soft limestone accents.',
      preview: 'bg-[#475569]',
    },
  ];

  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 select-none font-sans">
        {/* Console Settings Header */}
        <div className="bg-[#16171b] border border-white/[0.06] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#22242b] border border-white/10 flex items-center justify-center text-white">
              <Settings className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                System Preferences
              </h1>
              <p className="text-xs text-zinc-400 font-medium">
                Hardware Themes, Acoustic FX & Engine Ergonomics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1d22] border border-white/[0.06] font-mono text-xs">
            <span className="text-zinc-500 font-bold">OS:</span>
            <span className="font-bold text-zinc-300">v2.0 OLED</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Board Theme Customization */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Board Materials */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                <Palette className="w-4 h-4 text-[#38bdf8]" />
                <span className="font-extrabold uppercase text-xs tracking-wider text-white">
                  Board Material Palette
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {boardThemes.map((theme) => {
                  const isSelected = settings.boardTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => updateSettings({ boardTheme: theme.id })}
                      className={`p-3.5 rounded-xl border flex flex-col items-start text-left gap-1.5 transition ${
                        isSelected
                          ? 'border-[#22c55e] bg-[#22c55e]/10'
                          : 'border-white/[0.06] bg-[#1c1d22] hover:bg-[#22242b]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className={`w-4 h-4 rounded-full border border-white/20 ${theme.preview}`} />
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#22c55e]" />}
                      </div>
                      <span className="font-bold text-xs text-white">{theme.label}</span>
                      <span className="text-[10px] text-zinc-400 leading-tight">{theme.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio & Synthesizer Preferences */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                <Volume2 className="w-4 h-4 text-[#22c55e]" />
                <span className="font-extrabold uppercase tracking-wider text-white">
                  Acoustic Soundscapes
                </span>
              </div>

              {/* Master Audio Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#1c1d22] border border-white/[0.04] rounded-xl">
                <div className="flex flex-col">
                  <span className="font-bold text-white text-xs">Master Audio FX</span>
                  <span className="text-[11px] text-zinc-400">Physical piece clicks and time warnings</span>
                </div>
                <button
                  onClick={() => {
                    const next = !settings.soundEnabled;
                    updateSettings({ soundEnabled: next });
                    soundManager.enabled = next;
                  }}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                    settings.soundEnabled
                      ? 'bg-[#22c55e] text-black'
                      : 'bg-white/10 text-zinc-400'
                  }`}
                >
                  {settings.soundEnabled ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              {/* Audio Audition Buttons */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Test Sound Effects
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'move', label: 'Move Piece' },
                    { id: 'capture', label: 'Capture Piece' },
                    { id: 'check', label: 'Check Alert' },
                    { id: 'victory', label: 'Victory Bell' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleTestSound(s.id as any)}
                      className="p-2 rounded-lg border border-white/[0.06] bg-[#1c1d22] hover:bg-[#23252c] flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
                    >
                      <Play className="w-3 h-3 text-[#ffcc00]" />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Gameplay Ergonomics */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                <Sliders className="w-4 h-4 text-[#ffcc00]" />
                <span className="font-extrabold uppercase tracking-wider text-white">
                  Gameplay Ergonomics
                </span>
              </div>

              <div className="flex flex-col divide-y divide-white/[0.04]">
                {/* Legal Move Indicators */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">Move Destination Markers</span>
                    <span className="text-[11px] text-zinc-400">Show subtle dots on legal destination squares</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showLegalMoves}
                    onChange={(e) => updateSettings({ showLegalMoves: e.target.checked })}
                    className="w-4 h-4 accent-[#22c55e] cursor-pointer rounded"
                  />
                </div>

                {/* Auto Queen */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">Auto-Promote to Queen</span>
                    <span className="text-[11px] text-zinc-400">Automatically promote pawns to queen for fast blitz play</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoQueen}
                    onChange={(e) => updateSettings({ autoQueen: e.target.checked })}
                    className="w-4 h-4 accent-[#22c55e] cursor-pointer rounded"
                  />
                </div>

                {/* Live Stockfish Eval Bar */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">Real-time Stockfish Eval Bar</span>
                    <span className="text-[11px] text-zinc-400">Show advantage evaluation bar beside board</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showEvalBar}
                    onChange={(e) => updateSettings({ showEvalBar: e.target.checked })}
                    className="w-4 h-4 accent-[#22c55e] cursor-pointer rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Board Preview */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-xs font-bold uppercase">
                <span className="text-white">Live Material Preview</span>
                <span className="text-[10px] text-[#22c55e] font-mono">{settings.boardTheme.toUpperCase()}</span>
              </div>

              <div className="w-full max-w-[300px] mx-auto p-1">
                <ChessBoard
                  chess={previewChess}
                  orientation="w"
                  lastMove={{ from: 'e2', to: 'e4' }}
                  disabled={true}
                  onMove={() => false}
                />
              </div>

              <span className="text-[10px] text-zinc-500 text-center font-medium">
                Changes persist automatically to your browser console storage.
              </span>
            </div>

            {/* Session Vault Info */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-3.5 flex flex-col gap-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-zinc-500 border-b border-white/[0.06] pb-1 text-[10px]">
                Active Console Session
              </span>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Tactician Handle</span>
                <span className="font-bold text-white">{session.handle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Identifier</span>
                <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[160px]">{session.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
