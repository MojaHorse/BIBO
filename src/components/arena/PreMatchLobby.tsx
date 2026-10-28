'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GameId, PlayerColor } from '@/lib/games/types';
import { getPlayerSession, isAuthenticatedSession } from '@/lib/session';
import { haptics } from '@/lib/haptics';
import {
  ArrowLeft,
  Swords,
  Crown,
  Shield,
  Zap,
  Bot,
  Users,
  Smartphone,
  Clock,
  Radio,
  Check,
  ChevronRight,
  BookOpen,
  Trophy,
  Sparkles,
} from 'lucide-react';

export type LobbyOpponentMode = 'ranked' | 'bot' | 'friend' | 'pass-and-play';

export interface PreMatchLobbyProps {
  gameId: GameId;
  title: string;
  subtitle: string;
  tagline: string;
  imageSrc?: string;
  icon: React.ElementType;
  accentColor: string;
  rules: { title: string; desc: string }[];
  botTiers: { id: string; label: string; desc: string }[];
  timePresets: { mins: number; label: string; format: string; badge?: string }[];
  userRating?: number;
  onStartMatch: (config: {
    mode: LobbyOpponentMode;
    botDifficulty: string;
    timeControlMinutes: number;
  }) => void;
  onOpenMultiplayerModal?: () => void;
}

export const PreMatchLobby: React.FC<PreMatchLobbyProps> = ({
  gameId,
  title,
  subtitle,
  tagline,
  imageSrc,
  icon: Icon,
  accentColor,
  rules,
  botTiers,
  timePresets,
  userRating = 1200,
  onStartMatch,
  onOpenMultiplayerModal,
}) => {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<LobbyOpponentMode>('bot');
  const [selectedBotTier, setSelectedBotTier] = useState<string>(botTiers[1]?.id || botTiers[0]?.id || 'medium');
  const [selectedMins, setSelectedMins] = useState<number>(timePresets[1]?.mins || timePresets[0]?.mins || 5);
  const [showRules, setShowRules] = useState<boolean>(false);

  // Matchmaking Queue State
  const [queueState, setQueueState] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [matchedOpponent, setMatchedOpponent] = useState<{
    handle: string;
    rating: number;
    roomId: string;
  } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

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

  const handleStartRankedQueue = async () => {
    haptics.move();
    setQueueState('searching');
    setSearchSeconds(0);

    timerIntervalRef.current = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);

    const session = getPlayerSession();

    try {
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          player: session,
          gameId,
          timeControlMinutes: selectedMins,
        }),
      });

      const data = await res.json();

      if (data.status === 'matched' && data.roomId) {
        onMatchFound(data.roomId, data.opponent);
        return;
      }

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
            onMatchFound(pollData.roomId, pollData.opponent);
          }
        } catch {
          // ignore
        }
      }, 1500);
    } catch {
      handleCancelQueue();
    }
  };

  const onMatchFound = (roomId: string, opponent?: { handle: string; rating: number }) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    haptics.capture();

    setMatchedOpponent({
      handle: opponent?.handle || 'Opponent',
      rating: opponent?.rating || 1200,
      roomId,
    });
    setQueueState('matched');

    setTimeout(() => {
      router.push(`/play/${gameId}?room=${roomId}`);
    }, 1200);
  };

  const handlePrimaryCTA = () => {
    haptics.move();

    const session = getPlayerSession();
    if (!isAuthenticatedSession(session)) {
      if (typeof window !== 'undefined') {
        router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      }
      return;
    }

    if (selectedMode === 'ranked') {
      handleStartRankedQueue();
      return;
    }

    if (selectedMode === 'friend') {
      if (onOpenMultiplayerModal) {
        onOpenMultiplayerModal();
      } else {
        router.push(`/play/${gameId}?action=create-room&mins=${selectedMins}`);
      }
      return;
    }

    // Bot or Pass-and-play: start active match immediately with chosen configuration
    onStartMatch({
      mode: selectedMode,
      botDifficulty: selectedBotTier,
      timeControlMinutes: selectedMins,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-5 p-3 sm:p-6 pb-16 sm:pb-24 animate-in fade-in duration-300">
      {/* Top Navigation Strip */}
      <div className="flex items-center justify-between">
        <Link
          href="/play"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#FF6A00]" />
          <span>All Disciplines</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400">Rating:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-[#222226] border border-white/10 font-mono font-bold text-xs text-white">
            {userRating}
          </span>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#1c1d22] via-[#16171b] to-[#121316] border border-white/[0.08] p-5 sm:p-7 overflow-hidden shadow-2xl">
        {/* Ambient Glow */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg"
              style={{
                backgroundColor: `${accentColor}18`,
                borderColor: `${accentColor}40`,
                boxShadow: `0 0 20px ${accentColor}20`,
              }}
            >
              <Icon className="w-7 h-7" style={{ color: accentColor }} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-wider"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}30`,
                    color: accentColor,
                  }}
                >
                  {subtitle}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                <span className="text-[10px] font-mono text-zinc-400">Tactical Arena</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 font-sora">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl font-medium leading-relaxed">
                {tagline}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowRules(!showRules)}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#FF6A00]" />
            <span>{showRules ? 'Hide Rules' : 'How to Play'}</span>
          </button>
        </div>

        {/* Collapsible Rules Summary */}
        {showRules && (
          <div className="mt-5 pt-4 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-black/30 border border-white/[0.06] text-xs"
              >
                <div className="font-bold text-white flex items-center gap-1.5 mb-1 font-sora">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
                  <span>{rule.title}</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">{rule.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Configuration Card or Queue Radar View */}
      {queueState === 'searching' ? (
        <div className="rounded-2xl bg-[#16171b] border border-white/[0.08] p-8 text-center flex flex-col items-center justify-center space-y-6 shadow-xl animate-in fade-in">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#FF6A00]/20 animate-ping" />
            <span className="absolute inset-2 rounded-full bg-[#FF6A00]/10 border border-[#FF6A00]/40 animate-pulse" />
            <div className="relative z-10 w-16 h-16 rounded-full bg-[#1c1d22] border border-[#FF6A00]/60 flex items-center justify-center shadow-lg shadow-[#FF6A00]/20">
              <Radio className="w-7 h-7 text-[#FF6A00] animate-spin" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-white tracking-wide">
              Searching Opponents...
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Matching for <span className="text-[#FF6A00] font-bold">{title}</span> · {selectedMins} min Ranked match
            </p>
            <div className="mt-3 font-mono text-sm font-bold text-zinc-300">
              Queue Elapsed: 00:{searchSeconds < 10 ? `0${searchSeconds}` : searchSeconds}
            </div>
          </div>

          <button
            onClick={handleCancelQueue}
            className="px-6 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Cancel Queue
          </button>
        </div>
      ) : queueState === 'matched' && matchedOpponent ? (
        <div className="rounded-2xl bg-[#16171b] border border-[#22C55E]/40 p-8 text-center flex flex-col items-center justify-center space-y-5 shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/20 border border-[#22C55E]/50 flex items-center justify-center shadow-lg shadow-[#22C55E]/30 animate-bounce">
            <Check className="w-8 h-8 text-[#22C55E]" />
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#22C55E] px-2 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30">
              Opponent Acquired
            </span>
            <h3 className="text-2xl font-black text-white mt-2">
              vs {matchedOpponent.handle}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Rating [{matchedOpponent.rating}] · Launching active arena...
            </p>
          </div>

          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#22C55E] animate-[pulse_1s_ease-in-out_infinite] w-full" />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#16171b] border border-white/[0.08] p-5 sm:p-7 flex flex-col gap-6 shadow-xl">
          {/* 1. Opponent Mode Tabs */}
          <div>
            <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-3 font-semibold">
              1. Choose Game Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(
                [
                  {
                    id: 'bot' as const,
                    label: 'VS AI Bot',
                    desc: 'Calibrated Sparring',
                    icon: Bot,
                    badge: undefined,
                  },
                  {
                    id: 'ranked' as const,
                    label: 'Ranked Duel',
                    desc: 'Global Matchmaking',
                    icon: Zap,
                    badge: 'XP Stakes',
                  },
                  {
                    id: 'friend' as const,
                    label: 'Play Friend',
                    desc: 'Invite Code / Room',
                    icon: Users,
                    badge: undefined,
                  },
                  {
                    id: 'pass-and-play' as const,
                    label: 'Pass & Play',
                    desc: 'Same Device Local',
                    icon: Smartphone,
                    badge: undefined,
                  },
                ]
              ).map((mode) => {
                const isSelected = selectedMode === mode.id;
                const ModeIcon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      haptics.tap();
                      setSelectedMode(mode.id);
                    }}
                    className={`p-3.5 rounded-xl border flex flex-col items-start gap-1 transition text-left relative cursor-pointer ${
                      isSelected
                        ? 'bg-[#1f2026] border-[#FF6A00] shadow-md shadow-[#FF6A00]/15'
                        : 'bg-[#141416] border-white/[0.06] hover:border-white/20 text-zinc-400'
                    }`}
                  >
                    {mode.badge && (
                      <span className="absolute top-2 right-2 text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30">
                        {mode.badge}
                      </span>
                    )}
                    <ModeIcon
                      className={`w-5 h-5 mb-1 ${
                        isSelected ? 'text-[#FF6A00]' : 'text-zinc-400'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold font-sora ${
                        isSelected ? 'text-white' : 'text-zinc-200'
                      }`}
                    >
                      {mode.label}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {mode.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Bot Difficulty (Shown when mode === 'bot') */}
          {selectedMode === 'bot' && (
            <div className="p-4 rounded-xl bg-[#141416] border border-white/[0.06] flex flex-col gap-2.5 animate-in fade-in">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                Bot Difficulty Engine Calibration:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {botTiers.map((tier) => {
                  const isSelected = selectedBotTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => {
                        haptics.tap();
                        setSelectedBotTier(tier.id);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                        isSelected
                          ? 'bg-[#FF6A00]/15 border-[#FF6A00] text-white shadow-sm'
                          : 'bg-[#1c1d22] border-white/[0.06] hover:border-white/20 text-zinc-400'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#FF6A00]' : 'text-zinc-200'
                        }`}
                      >
                        {tier.label}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-medium leading-tight">
                        {tier.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Time Control Presets */}
          <div>
            <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider block mb-3 font-semibold">
              2. Select Clock Tempo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {timePresets.map((preset) => {
                const isSelected = selectedMins === preset.mins;
                return (
                  <button
                    key={preset.mins}
                    onClick={() => {
                      haptics.tap();
                      setSelectedMins(preset.mins);
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#1f2026] border-[#FF6A00] text-white shadow-md shadow-[#FF6A00]/15'
                        : 'bg-[#141416] border-white/[0.06] hover:border-white/20 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                      <Clock
                        className={`w-3.5 h-3.5 ${
                          isSelected ? 'text-[#FF6A00]' : 'text-zinc-500'
                        }`}
                      />
                      <span>{preset.label}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-medium">
                      {preset.format}
                    </span>
                    {preset.badge && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/5 text-zinc-500 mt-0.5">
                        {preset.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Action Launch CTA */}
          <div className="pt-2">
            <button
              onClick={handlePrimaryCTA}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-[#FF173D]/30 hover:brightness-110 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 font-sora"
            >
              <span>
                {selectedMode === 'ranked'
                  ? 'Find Ranked Opponent'
                  : selectedMode === 'bot'
                  ? `Start Sparring Match (${botTiers.find((b) => b.id === selectedBotTier)?.label || 'Medium'})`
                  : selectedMode === 'friend'
                  ? 'Create Room / Invite Friend'
                  : 'Start Local Pass & Play'}
              </span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
