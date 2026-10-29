'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuickPlay } from '@/lib/quick-play-context';
import { GameId, PlayerColor } from '@/lib/games/types';
import { getPlayerSession, isAuthenticatedSession } from '@/lib/session';
import { haptics } from '@/lib/haptics';
import {
  Swords,
  Crown,
  Shield,
  Zap,
  Bot,
  Users,
  Clock,
  Radio,
  X,
  Check,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Lock,
} from 'lucide-react';

type MatchMode = 'ranked' | 'bot' | 'friend';

interface BotTier {
  id: string;
  label: string;
  desc: string;
}

const GAME_TIME_PRESETS: Record<
  GameId,
  { mins: number; label: string; format: string; badge?: string }[]
> = {
  chess: [
    { mins: 1, label: '1 min', format: 'Bullet', badge: 'Ultra Fast' },
    { mins: 3, label: '3 min', format: 'Blitz', badge: 'Popular' },
    { mins: 5, label: '5 min', format: 'Blitz', badge: 'Standard' },
    { mins: 10, label: '10 min', format: 'Rapid', badge: 'Tactical' },
  ],
  checkers: [
    { mins: 3, label: '3 min', format: 'Blitz Draughts', badge: 'Fast' },
    { mins: 5, label: '5 min', format: 'Standard 8x8', badge: 'Popular' },
    { mins: 10, label: '10 min', format: 'Classic Match', badge: 'Strategy' },
  ],
  morabaraba: [
    { mins: 3, label: '3 min', format: 'Action Duel', badge: 'Fast' },
    { mins: 5, label: '5 min', format: 'Kraal Speed', badge: 'Standard' },
    { mins: 10, label: '10 min', format: 'Traditional 24', badge: 'Classic' },
  ],
};

const BOT_TIERS: Record<GameId, BotTier[]> = {
  chess: [
    { id: 'easy', label: 'ELO 450', desc: 'Novice sparring bot' },
    { id: 'medium', label: 'ELO 1200', desc: 'Tactical club bot' },
    { id: 'hard', label: 'ELO 2200', desc: 'Stockfish grandmaster' },
  ],
  checkers: [
    { id: 'easy', label: 'Novice', desc: 'Gentle jumps' },
    { id: 'medium', label: 'Tactical', desc: 'King trapper' },
    { id: 'hard', label: 'Master', desc: 'Full alpha-beta depth' },
  ],
  morabaraba: [
    { id: 'easy', label: 'Herder', desc: 'Open board placement' },
    { id: 'medium', label: 'Tactician', desc: 'Triad / flike hunter' },
    { id: 'hard', label: 'Elder', desc: 'Kraal territory master' },
  ],
};

export const QuickPlayDrawer: React.FC = () => {
  const router = useRouter();
  const { isOpen, initialGame, closeQuickPlay } = useQuickPlay();

  const [selectedGame, setSelectedGame] = useState<GameId>(initialGame || 'chess');
  const [selectedMode, setSelectedMode] = useState<MatchMode>('ranked');
  const [selectedMins, setSelectedMins] = useState<number>(5);
  const [selectedBotTier, setSelectedBotTier] = useState<string>('medium');

  // Matchmaking Queue Lifecycle State
  const [queueState, setQueueState] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [matchedOpponent, setMatchedOpponent] = useState<{
    handle: string;
    rating: number;
    role: PlayerColor;
    roomId: string;
  } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync default initial game when drawer opens
  useEffect(() => {
    if (initialGame) {
      setSelectedGame(initialGame);
    }
  }, [initialGame]);

  // Adjust preset when game changes
  useEffect(() => {
    const presets = GAME_TIME_PRESETS[selectedGame];
    if (!presets.some((p) => p.mins === selectedMins)) {
      setSelectedMins(presets[1]?.mins || presets[0]?.mins || 5);
    }
  }, [selectedGame, selectedMins]);

  // Clean intervals on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleCancelQueue = async () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    pollIntervalRef.current = null;
    timerIntervalRef.current = null;

    try {
      const session = getPlayerSession();
      await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', player: session }),
      });
    } catch {
      // ignore
    }

    setQueueState('idle');
    setSearchSeconds(0);
    haptics.tap();
  };

  const handleClose = async () => {
    if (queueState === 'searching') {
      await handleCancelQueue();
    }
    closeQuickPlay();
  };

  const handleStartMatchmaking = async () => {
    haptics.move();

    const session = getPlayerSession();
    if (!isAuthenticatedSession(session)) {
      closeQuickPlay();
      router.push(`/login?redirect=${encodeURIComponent(`/play/${selectedGame}`)}`);
      return;
    }

    if (selectedMode === 'bot') {
      // Launch bot arena directly with clean query parameters
      closeQuickPlay();
      router.push(`/play/${selectedGame}?mode=bot&difficulty=${selectedBotTier}&mins=${selectedMins}`);
      return;
    }

    if (selectedMode === 'friend') {
      // Open game arena with room creation modal trigger
      closeQuickPlay();
      router.push(`/play/${selectedGame}?action=create-room&mins=${selectedMins}`);
      return;
    }

    // Ranked Multiplayer Queue
    setQueueState('searching');
    setSearchSeconds(0);

    timerIntervalRef.current = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);

    try {
      // 1. Initial Join Queue Request
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          player: session,
          gameId: selectedGame,
          timeControlMinutes: selectedMins,
        }),
      });

      const data = await res.json();

      if (data.status === 'matched' && data.roomId) {
        onMatchFound(data.roomId, data.role || 'w', data.opponent);
        return;
      }

      // 2. Poll every 1.5 seconds for match pairing
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch('/api/matchmaking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'poll',
              player: session,
            }),
          });
          const pollData = await pollRes.json();

          if (pollData.status === 'matched' && pollData.roomId) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            onMatchFound(pollData.roomId, pollData.role || 'w', pollData.opponent);
          }
        } catch {
          // ignore transient poll failure
        }
      }, 1500);
    } catch {
      handleCancelQueue();
    }
  };

  const onMatchFound = (
    roomId: string,
    role: PlayerColor,
    opponent?: { handle: string; rating: number }
  ) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    haptics.capture();

    setMatchedOpponent({
      handle: opponent?.handle || 'Opponent',
      rating: opponent?.rating || 1200,
      role,
      roomId,
    });
    setQueueState('matched');

    // 1.2s countdown animation, then navigate directly to authoritative match route
    setTimeout(() => {
      closeQuickPlay();
      setQueueState('idle');
      router.push(`/play/${selectedGame}?room=${roomId}`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Drawer Container */}
      <div
        className="relative w-full sm:max-w-xl bg-[#16171b] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col z-10 animate-in slide-in-from-bottom duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95 max-h-[92dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Drag Pill */}
        <div className="sm:hidden flex justify-center pb-2 pt-0.5">
          <div className="w-10 h-1 bg-zinc-600/60 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-pulse" />
            <h2 className="text-base font-black text-white uppercase tracking-wider font-sora">
              Quick Play Launch
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. STATE: SEARCHING (RADAR VIEW) */}
        {queueState === 'searching' && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-6 animate-in fade-in">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[#FF6A00]/20 animate-ping" />
              <span className="absolute inset-2 rounded-full bg-[#FF6A00]/10 border border-[#FF6A00]/40 animate-pulse" />
              <div className="relative z-10 w-16 h-16 rounded-full bg-[#1c1d22] border border-[#FF6A00]/60 flex items-center justify-center shadow-lg shadow-[#FF6A00]/20">
                <Radio className="w-7 h-7 text-[#FF6A00] animate-spin" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-white tracking-wide">
                Searching Tacticians...
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Queueing for{' '}
                <span className="text-[#FF6A00] font-bold uppercase">{selectedGame}</span> ·{' '}
                {selectedMins} min Ranked match
              </p>
              <div className="mt-3 font-mono text-sm font-bold text-zinc-300">
                Elapsed: 00:{searchSeconds < 10 ? `0${searchSeconds}` : searchSeconds}
              </div>
            </div>

            <button
              onClick={handleCancelQueue}
              className="px-6 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              Cancel Search
            </button>
          </div>
        )}

        {/* 2. STATE: MATCH FOUND */}
        {queueState === 'matched' && matchedOpponent && (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/20 border border-[#22C55E]/50 flex items-center justify-center shadow-lg shadow-[#22C55E]/30 animate-bounce">
              <Check className="w-8 h-8 text-[#22C55E]" />
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#22C55E] px-2 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30">
                Match Established!
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                vs {matchedOpponent.handle}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Rating [{matchedOpponent.rating}] · Playing as{' '}
                <span className="text-white font-bold">
                  {matchedOpponent.role === 'w' ? 'White / First' : 'Black / Second'}
                </span>
              </p>
            </div>

            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#22C55E] animate-[pulse_1s_ease-in-out_infinite] w-full" />
            </div>
            <span className="text-[11px] text-zinc-500">Entering match arena...</span>
          </div>
        )}

        {/* 3. STATE: IDLE SELECTION VIEW */}
        {queueState === 'idle' && (
          <div className="space-y-4">
            {/* Discipline Selector */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                Select Discipline
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'chess', title: 'Chess', icon: Swords, color: '#38bdf8' },
                    { id: 'checkers', title: 'Checkers', icon: Crown, color: '#f59e0b' },
                    { id: 'morabaraba', title: 'Morabaraba', icon: Shield, color: '#22c55e' },
                  ] as const
                ).map((g) => {
                  const Icon = g.icon;
                  const isSelected = selectedGame === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        haptics.tap();
                        setSelectedGame(g.id);
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#1c1d22] border-[#FF6A00] shadow-md shadow-[#FF6A00]/15'
                          : 'bg-[#141416] border-white/[0.06] hover:border-white/20 text-zinc-400'
                      }`}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: isSelected ? '#FF6A00' : g.color }}
                      />
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-zinc-300'
                        }`}
                      >
                        {g.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Selector */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                Opponent Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'ranked', label: 'Ranked', icon: Zap, desc: 'Public queue' },
                    { id: 'bot', label: 'Bot Spar', icon: Bot, desc: 'Solo practice' },
                    { id: 'friend', label: 'Friend', icon: Users, desc: 'Room invite' },
                  ] as const
                ).map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        haptics.tap();
                        setSelectedMode(m.id);
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#FF6A00]/15 border-[#FF6A00] text-white'
                          : 'bg-[#141416] border-white/[0.06] hover:border-white/20 text-zinc-400'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FF6A00]' : 'text-zinc-400'}`} />
                      <span className="text-xs font-bold">{m.label}</span>
                      <span className="text-[9px] text-zinc-500">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bot Difficulty Selector (Only if mode === 'bot') */}
            {selectedMode === 'bot' && (
              <div className="p-3 rounded-xl bg-[#141416] border border-white/[0.06] space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">
                  Engine Calibration:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {BOT_TIERS[selectedGame].map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedBotTier(tier.id)}
                      className={`py-1.5 px-2 rounded-lg text-center border text-xs font-bold transition cursor-pointer ${
                        selectedBotTier === tier.id
                          ? 'bg-[#FF6A00]/20 border-[#FF6A00] text-white'
                          : 'bg-[#1c1d22] border-white/[0.06] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>{tier.label}</div>
                      <div className="text-[9px] font-normal text-zinc-500 truncate">{tier.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Time Control Selector */}
            <div>
              <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block mb-2">
                Time Control Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GAME_TIME_PRESETS[selectedGame].map((preset) => {
                  const isSelected = selectedMins === preset.mins;
                  return (
                    <button
                      key={preset.mins}
                      onClick={() => {
                        haptics.tap();
                        setSelectedMins(preset.mins);
                      }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-0.5 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#1c1d22] border-[#FF6A00] text-white shadow-sm'
                          : 'bg-[#141416] border-white/[0.06] hover:border-white/20 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-mono font-bold text-xs">
                        <Clock className="w-3 h-3 text-[#FF6A00]" />
                        <span>{preset.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {preset.format}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Primary CTA */}
            <div className="pt-2">
              <button
                onClick={handleStartMatchmaking}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-extrabold uppercase tracking-wider shadow-lg shadow-[#FF173D]/30 hover:brightness-110 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 font-sora text-sm"
              >
                <span>
                  {selectedMode === 'ranked'
                    ? 'Find Ranked Opponent'
                    : selectedMode === 'bot'
                    ? 'Launch Solo Practice'
                    : 'Create Match Room'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
