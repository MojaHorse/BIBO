'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Swords,
  Crown,
  Shield,
  Radio,
  Bot,
  Users,
  Gamepad2,
  X,
  Check,
  Sparkles,
  Trophy,
  Clock,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BiboCatMascot } from '@/components/brand/BiboLogo';
import { getPlayerSession } from '@/lib/session';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { haptics } from '@/lib/haptics';
import { MultiplayerModal } from '@/components/MultiplayerModal';

type GameDiscipline = 'chess' | 'checkers' | 'morabaraba';
type OpponentMode = 'ranked' | 'bot' | 'friend';

interface TimePreset {
  mins: number;
  label: string;
  tag: string;
  icon: string;
  popular?: boolean;
}

const GAME_TIME_PRESETS: Record<GameDiscipline, TimePreset[]> = {
  chess: [
    { mins: 1, label: '1 min', tag: 'Bullet', icon: '⚡' },
    { mins: 3, label: '3 min', tag: 'Blitz', icon: '🔥', popular: true },
    { mins: 5, label: '5 min', tag: 'Rapid Blitz', icon: '⚔️' },
    { mins: 10, label: '10 min', tag: 'Rapid', icon: '⏱️' },
  ],
  checkers: [
    { mins: 3, label: '3 min', tag: 'Blitz Draughts', icon: '⚡', popular: true },
    { mins: 5, label: '5 min', tag: 'Standard', icon: '⚔️' },
    { mins: 10, label: '10 min', tag: 'Match Play', icon: '⏱️' },
  ],
  morabaraba: [
    { mins: 3, label: '3 min', tag: 'Action Duel', icon: '⚡' },
    { mins: 5, label: '5 min', tag: 'Kraal Standard', icon: '⚔️', popular: true },
    { mins: 10, label: '10 min', tag: 'Traditional', icon: '⏱️' },
  ],
};

const BOT_TIERS: Record<GameDiscipline, { id: string; label: string; sub: string }[]> = {
  chess: [
    { id: 'easy', label: 'Novice', sub: '450 ELO' },
    { id: 'medium', label: 'Tactical', sub: '1200 ELO' },
    { id: 'hard', label: 'Master', sub: '2200 ELO' },
  ],
  checkers: [
    { id: 'easy', label: 'Casual', sub: 'Basic Captures' },
    { id: 'medium', label: 'Tactical', sub: 'Forced Jumps' },
    { id: 'hard', label: 'Draughts King', sub: 'Multi-Jumps' },
  ],
  morabaraba: [
    { id: 'easy', label: 'Herder', sub: 'Novice Kraal' },
    { id: 'medium', label: 'Strategist', sub: 'Mill Defense' },
    { id: 'hard', label: 'Kraal Master', sub: 'Spoke Control' },
  ],
};

function PlayHubContent() {
  const { isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Backward compatibility: If someone visited /play?room=xyz or /play?play=true, redirect to /play/chess
  useEffect(() => {
    const room = searchParams.get('room');
    const play = searchParams.get('play');
    if (room) {
      router.replace(`/play/chess?room=${room}`);
    } else if (play === 'true') {
      router.replace('/play/chess');
    }
  }, [searchParams, router]);

  // Selections
  const [selectedGame, setSelectedGame] = useState<GameDiscipline>('chess');
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('ranked');
  const [botDifficulty, setBotDifficulty] = useState<string>('medium');
  const [selectedMinutes, setSelectedMinutes] = useState<number>(3);
  const [joinRoomCode, setJoinRoomCode] = useState<string>('');
  const [multiplayerModalOpen, setMultiplayerModalOpen] = useState(false);

  // Matchmaking Queue State
  const [searchState, setSearchState] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [matchedOpponent, setMatchedOpponent] = useState<{ handle: string; rating: number } | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchPollRef = useRef<NodeJS.Timeout | null>(null);
  const currentUser = getPlayerSession();

  const stopSearchTimers = useCallback(() => {
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (searchPollRef.current) clearInterval(searchPollRef.current);
    searchTimerRef.current = null;
    searchPollRef.current = null;
  }, []);

  const handleCancelSearch = useCallback(async () => {
    haptics.tap();
    stopSearchTimers();
    setSearchState('idle');
    setSearchSeconds(0);
    try {
      await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', player: currentUser }),
      });
    } catch {
      // ignore
    }
  }, [currentUser, stopSearchTimers]);

  const onMatchSuccess = useCallback(
    (foundRoomId: string, opponent: any) => {
      stopSearchTimers();
      setSearchState('matched');
      setMatchedOpponent(opponent || { handle: 'Tactician Opponent', rating: 1200 });

      setTimeout(() => {
        router.push(`/play/${selectedGame}?room=${foundRoomId}`);
      }, 1200);
    },
    [selectedGame, router, stopSearchTimers]
  );

  const handleStartRankedQueue = async () => {
    stopSearchTimers();
    setSearchState('searching');
    setSearchSeconds(0);
    setMatchedOpponent(null);

    searchTimerRef.current = setInterval(() => {
      setSearchSeconds((s) => s + 1);
    }, 1000);

    try {
      const joinRes = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          player: currentUser,
          gameId: selectedGame,
          timeControlMinutes: selectedMinutes,
        }),
      });

      if (!joinRes.ok) {
        setSearchState('idle');
        stopSearchTimers();
        return;
      }

      const joinData = await joinRes.json();
      if (joinData.status === 'matched') {
        onMatchSuccess(joinData.roomId, joinData.opponent);
        return;
      }

      // Poll queue
      searchPollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch('/api/matchmaking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'poll', player: currentUser }),
          });
          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === 'matched') {
              onMatchSuccess(pollData.roomId, pollData.opponent);
            }
          }
        } catch {
          // ignore
        }
      }, 2000);
    } catch {
      setSearchState('idle');
      stopSearchTimers();
    }
  };

  const handleLaunchMatch = () => {
    haptics.tap();

    if (opponentMode === 'ranked') {
      handleStartRankedQueue();
      return;
    }

    if (opponentMode === 'bot') {
      router.push(`/play/${selectedGame}?mode=bot&difficulty=${botDifficulty}&mins=${selectedMinutes}`);
      return;
    }

    if (opponentMode === 'friend') {
      if (joinRoomCode.trim()) {
        router.push(`/play/${selectedGame}?room=${joinRoomCode.trim().toUpperCase()}`);
      } else {
        setMultiplayerModalOpen(true);
      }
    }
  };

  // Reset time preset default when discipline changes
  useEffect(() => {
    const presets = GAME_TIME_PRESETS[selectedGame];
    const popular = presets.find((p) => p.popular) || presets[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedMinutes(popular.mins);
  }, [selectedGame]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm font-bold text-zinc-400">Authenticating Play Hub session...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-4 py-4 px-3 sm:px-6 animate-in fade-in select-none">
      {/* 1. Play Hub Header */}
      <div className="flex flex-col items-center text-center gap-1">
        <BiboCatMascot size={46} glow />
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sora">
          BIBO Play Hub
        </h1>
        <p className="text-xs text-zinc-400 font-medium max-w-sm">
          Select your discipline, pick your opponent, and enter the arena
        </p>
      </div>

      {/* 2. What are we playing? (3 Game Cards) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
          1. Choose Discipline
        </span>
        <div className="grid grid-cols-3 gap-2">
          {/* Chess */}
          <button
            onClick={() => {
              haptics.tap();
              setSelectedGame('chess');
            }}
            className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer relative active:scale-95 ${
              selectedGame === 'chess'
                ? 'bg-gradient-to-b from-[#2a2322] to-[#1c1d22] border-[#FF6A00] shadow-[0_0_16px_rgba(255,106,0,0.2)] ring-1 ring-[#FF6A00]/50'
                : 'bg-[#18191e] border-white/[0.06] hover:border-white/[0.14] text-zinc-400'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                selectedGame === 'chess' ? 'bg-[#FF6A00]/25 text-[#FF6A00]' : 'bg-white/5 text-zinc-400'
              }`}
            >
              <Swords className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className={`font-black text-xs ${selectedGame === 'chess' ? 'text-white' : 'text-zinc-300'}`}>
                Chess
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">8x8 Tactical</span>
            </div>
            {selectedGame === 'chess' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF6A00] ring-2 ring-[#171719]" />
            )}
          </button>

          {/* Checkers */}
          <Link
            href="/play/checkers"
            className="p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer relative active:scale-95 bg-[#18191e] border-white/[0.06] hover:border-amber-500/40 text-zinc-400 group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold bg-amber-500/10 text-amber-400/80 group-hover:text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-center">
              <span className="font-black text-xs text-zinc-300 group-hover:text-amber-400 flex items-center gap-1">
                <span>Checkers</span>
                <Lock className="w-2.5 h-2.5 text-amber-400" />
              </span>
              <span className="text-[10px] text-amber-400/70 font-mono font-medium">Locked</span>
            </div>
          </Link>

          {/* Morabaraba */}
          <button
            onClick={() => {
              haptics.tap();
              setSelectedGame('morabaraba');
            }}
            className={`p-3 rounded-2xl border flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer relative active:scale-95 ${
              selectedGame === 'morabaraba'
                ? 'bg-gradient-to-b from-[#2a1c22] to-[#1c1d22] border-[#FF173D] shadow-[0_0_16px_rgba(255,23,61,0.2)] ring-1 ring-[#FF173D]/50'
                : 'bg-[#18191e] border-white/[0.06] hover:border-white/[0.14] text-zinc-400'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                selectedGame === 'morabaraba' ? 'bg-[#FF173D]/25 text-[#FF173D]' : 'bg-white/5 text-zinc-400'
              }`}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className={`font-black text-xs ${selectedGame === 'morabaraba' ? 'text-white' : 'text-zinc-300'}`}>
                Morabaraba
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">Kraal Mills</span>
            </div>
            {selectedGame === 'morabaraba' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#FF173D] ring-2 ring-[#171719]" />
            )}
          </button>
        </div>
      </div>

      {/* 3. Opponent Mode Selector */}
      <div className="flex flex-col gap-2 bg-[#1c1d22] border border-white/[0.08] rounded-2xl p-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
            2. Match Mode
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {opponentMode === 'ranked'
              ? `${currentUser.rating} ELO · Rated`
              : opponentMode === 'bot'
              ? 'Tactician Sparring'
              : 'Private Room'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#121316] border border-white/[0.06] rounded-xl text-xs font-bold">
          <button
            onClick={() => {
              haptics.tap();
              setOpponentMode('ranked');
            }}
            className={`py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              opponentMode === 'ranked'
                ? 'btn-bibo-primary shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Ranked</span>
          </button>

          <button
            onClick={() => {
              haptics.tap();
              setOpponentMode('bot');
            }}
            className={`py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              opponentMode === 'bot'
                ? 'btn-bibo-primary shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>VS Bot</span>
          </button>

          <button
            onClick={() => {
              haptics.tap();
              setOpponentMode('friend');
            }}
            className={`py-2 px-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
              opponentMode === 'friend'
                ? 'btn-bibo-primary shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Friend</span>
          </button>
        </div>

        {/* Dynamic Contextual Options: Bot Strength */}
        {opponentMode === 'bot' && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06] animate-in fade-in">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Bot Strength</span>
            <div className="grid grid-cols-3 gap-1.5">
              {BOT_TIERS[selectedGame].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => {
                    haptics.tap();
                    setBotDifficulty(tier.id);
                  }}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer active:scale-95 ${
                    botDifficulty === tier.id
                      ? 'bg-white/15 text-white border-white/30 shadow-xs'
                      : 'bg-[#121316] text-zinc-400 border-white/[0.06] hover:text-zinc-200'
                  }`}
                >
                  <span className="font-bold text-xs block">{tier.label}</span>
                  <span className="text-[9px] text-zinc-500 font-mono block leading-none mt-0.5">{tier.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Contextual Options: Friend Room Join */}
        {opponentMode === 'friend' && (
          <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06] animate-in fade-in">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter 6-char Room Code..."
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="flex-1 bg-[#121316] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono uppercase tracking-wider outline-none focus:border-[#FF6A00]"
              />
              <button
                disabled={!joinRoomCode.trim()}
                onClick={handleLaunchMatch}
                className="px-3.5 py-2 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] text-xs font-bold text-white disabled:opacity-40 transition cursor-pointer"
              >
                Join
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Or leave empty to generate a shareable private room link.
            </p>
          </div>
        )}
      </div>

      {/* 4. Game-Calibrated Time Control Presets */}
      <div className="flex flex-col gap-2 bg-[#1c1d22] border border-white/[0.08] rounded-2xl p-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
            3. Time Control
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">Per player clock</span>
        </div>

        <div
          className={`grid gap-2 ${
            GAME_TIME_PRESETS[selectedGame].length === 4 ? 'grid-cols-4' : 'grid-cols-3'
          }`}
        >
          {GAME_TIME_PRESETS[selectedGame].map((tc) => {
            const isSelected = selectedMinutes === tc.mins;

            return (
              <button
                key={tc.mins}
                onClick={() => {
                  haptics.tap();
                  setSelectedMinutes(tc.mins);
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer relative active:scale-95 ${
                  isSelected
                    ? 'bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00] shadow-[0_0_12px_rgba(255,106,0,0.25)] ring-1 ring-[#FF6A00]/60'
                    : 'bg-[#121316] text-zinc-400 border-white/[0.06] hover:border-white/[0.12] hover:text-white'
                }`}
              >
                <span className="text-sm">{tc.icon}</span>
                <span className="font-extrabold text-xs text-white">{tc.label}</span>
                <span className="text-[9px] font-mono text-zinc-400 leading-none">{tc.tag}</span>
                {tc.popular && !isSelected && (
                  <span className="absolute -top-1.5 px-1 py-0.2 rounded-full bg-[#FF6A00]/30 border border-[#FF6A00]/50 text-[8px] font-bold text-[#FF6A00]">
                    Hot
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Hero Launch / Queue CTA */}
      <div className="pt-1">
        {searchState === 'idle' ? (
          <button
            onClick={handleLaunchMatch}
            className="w-full py-4 px-5 rounded-2xl btn-bibo-primary text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xl active:scale-[0.98] transition font-sora"
          >
            <Gamepad2 className="w-5 h-5 shrink-0" />
            <span>
              {opponentMode === 'ranked'
                ? `Find Opponent (${selectedMinutes}m ${selectedGame.toUpperCase()})`
                : opponentMode === 'bot'
                ? `Start vs Bot (${BOT_TIERS[selectedGame].find((b) => b.id === botDifficulty)?.label || 'Tactical'})`
                : joinRoomCode.trim()
                ? `Join Room ${joinRoomCode}`
                : `Create Private Room`}
            </span>
          </button>
        ) : searchState === 'searching' ? (
          <div className="w-full p-4 rounded-2xl bg-[#1c1d22] border-2 border-[#FF6A00] flex items-center justify-between shadow-[0_0_24px_rgba(255,106,0,0.3)] animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <span className="absolute inset-0 rounded-full border-2 border-[#FF6A00] animate-ping" />
                <span className="w-3 h-3 rounded-full bg-[#FF6A00] animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-extrabold text-sm text-white">Searching for tactician...</span>
                <span className="font-mono text-xs text-zinc-400">
                  {selectedGame.toUpperCase()} • {selectedMinutes}m • {searchSeconds}s
                </span>
              </div>
            </div>

            <button
              onClick={handleCancelSearch}
              className="px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4 text-zinc-400" />
              <span>Cancel</span>
            </button>
          </div>
        ) : (
          <div className="w-full p-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center gap-2.5 text-white font-black text-sm shadow-[0_0_24px_rgba(34,197,94,0.3)] animate-in zoom-in-95">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Matched with {matchedOpponent?.handle || 'Tactician'}! Entering Arena...</span>
          </div>
        )}
      </div>

      {/* Direct Arena Quick Links */}
      <div className="flex items-center justify-center gap-4 text-xs font-semibold text-zinc-500 pt-1">
        <span>Direct Arenas:</span>
        <Link href="/play/chess" className="hover:text-white transition flex items-center gap-1">
          <span>Chess</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
        <span>·</span>
        <Link href="/play/checkers" className="hover:text-white transition flex items-center gap-1">
          <span>Checkers</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
        <span>·</span>
        <Link href="/play/morabaraba" className="hover:text-white transition flex items-center gap-1">
          <span>Morabaraba</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Multiplayer Room Creation Modal */}
      <MultiplayerModal
        isOpen={multiplayerModalOpen}
        onClose={() => setMultiplayerModalOpen(false)}
        gameId={selectedGame}
        gameTitle={`BIBO ${selectedGame === 'chess' ? 'Chess' : selectedGame === 'checkers' ? 'Checkers' : 'Morabaraba'}`}
        currentUser={currentUser}
        onRoomCreated={(rId) => {
          setMultiplayerModalOpen(false);
          router.push(`/play/${selectedGame}?room=${rId}`);
        }}
      />
    </div>
  );
}

export default function PlayHubPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="min-h-[70vh] bg-[#171719] text-zinc-400 flex items-center justify-center font-mono text-xs">Loading Play Hub...</div>}>
        <PlayHubContent />
      </Suspense>
    </AppShell>
  );
}
