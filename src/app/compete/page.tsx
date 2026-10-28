'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Trophy,
  Flame,
  Clock,
  Users,
  Swords,
  Crown,
  Shield,
  Search,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Medal,
  Play,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BiboCatMascot } from '@/components/brand/BiboLogo';
import { getPlayerSession } from '@/lib/session';
import { useRequireAuth } from '@/lib/useRequireAuth';

interface Tournament {
  id: string;
  title: string;
  gameId: 'chess' | 'checkers' | 'morabaraba';
  gameName: string;
  icon: any;
  status: 'upcoming' | 'live' | 'completed';
  timeLabel: string;
  playersJoined: number;
  maxPlayers: number;
  format: string;
  timeControl: string;
  prizeXp: number;
  joined?: boolean;
}

interface LeaderboardEntry {
  rankNumber: number;
  id: string;
  handle: string;
  rating: number;
  game: string;
  xp: number;
  winRate: string;
  streak: number;
}

function CompeteContent() {
  const { isAuthenticated } = useRequireAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<'upcoming' | 'live' | 'leaderboard'>('upcoming');
  const [leaderboardGame, setLeaderboardGame] = useState<'chess' | 'checkers' | 'morabaraba'>('chess');
  const [session, setSession] = useState<{ id: string; handle: string; rating: number; xp: number }>({
    id: '',
    handle: '',
    rating: 1200,
    xp: 0,
  });

  useEffect(() => {
    if (tabParam === 'leaderboard' || tabParam === 'live' || tabParam === 'upcoming') {
      setTab(tabParam);
    }
  }, [tabParam]);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    const s = getPlayerSession();
    setSession({
      id: s.id,
      handle: s.displayName || s.handle,
      rating: s.rating || 1200,
      xp: s.xp || 0,
    });

    setLoadingLeaderboard(true);
    // Fetch live database rankings
    fetch(`/api/rankings?category=${leaderboardGame}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list = data?.leaderboard || data?.entries;
        if (list && Array.isArray(list)) {
          const mapped = list.map((e: any, idx: number) => ({
            rankNumber: e.rankNumber || idx + 1,
            id: e.id,
            handle: e.handle,
            rating: e.rating || e.blitzRating || 1200,
            game: leaderboardGame === 'chess' ? 'Chess' : leaderboardGame === 'checkers' ? 'Checkers' : 'Morabaraba',
            xp: e.xp || 0,
            winRate: e.winRate || `${Math.min(75, 45 + (idx < 3 ? 15 : 5))}%`,
            streak: Math.max(0, 3 - idx),
          }));
          setLeaderboardData(mapped);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingLeaderboard(false);
      });
  }, [leaderboardGame]);

  const handleJoinTournament = (tId: string) => {
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tId) {
          const nextJoined = !t.joined;
          return {
            ...t,
            joined: nextJoined,
            playersJoined: nextJoined ? t.playersJoined + 1 : t.playersJoined - 1,
          };
        }
        return t;
      })
    );
  };

  const filteredTournaments = tournaments.filter((t) => {
    if (tab === 'upcoming') return t.status === 'upcoming';
    if (tab === 'live') return t.status === 'live';
    return true;
  });

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <BiboCatMascot size={32} glow />
          <p className="text-sm font-bold text-zinc-400">Authenticating arena rankings...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 pb-8">
        {/* Header (Matching Screen 8: Tournaments) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#FF6A00]" />
              <h1 className="text-2xl font-black text-white tracking-tight font-sora">Tournaments</h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">
              Join competitive brackets, gain tactical rating, and prove your rank.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-xl bg-[#222226] border border-white/[0.08]">
            <button
              onClick={() => setTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                tab === 'upcoming'
                  ? 'btn-bibo-primary shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setTab('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                tab === 'live'
                  ? 'btn-bibo-primary shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span>Live</span>
            </button>
            <button
              onClick={() => setTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                tab === 'leaderboard'
                  ? 'btn-bibo-primary shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Leaderboards
            </button>
          </div>
        </div>

        {tab !== 'leaderboard' ? (
          /* Tournaments View (Screen 8) */
          <div className="flex flex-col gap-4">
            {filteredTournaments.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-400 rounded-2xl bg-[#222226] border border-white/[0.06]">
                No tournaments currently scheduled in this category. Check back shortly!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTournaments.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl bg-[#222226] border border-white/[0.08] hover:border-white/[0.16] p-5 flex flex-col justify-between gap-4 transition shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6A00]/20 to-[#FF173D]/20 border border-[#FF6A00]/30 flex items-center justify-center text-[#FF6A00]">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <h2 className="text-sm font-extrabold text-white leading-tight">{t.title}</h2>
                            <span className="text-[11px] text-zinc-400 font-mono">{t.gameName} · {t.timeControl}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.status === 'live'
                            ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 animate-pulse'
                            : 'bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30'
                        }`}>
                          {t.status === 'live' ? 'Live Now' : 'Upcoming'}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-3 p-2.5 rounded-xl bg-[#171719] border border-white/[0.04] text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-zinc-500 font-medium">Format</span>
                          <span className="font-bold text-white text-[11px]">{t.format}</span>
                        </div>
                        <div className="flex flex-col text-center">
                          <span className="text-[10px] text-zinc-500 font-medium">Joined</span>
                          <span className="font-bold text-[#FF6A00] text-[11px]">
                            {t.playersJoined} / {t.maxPlayers}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-zinc-500 font-medium">Prize</span>
                          <span className="font-bold text-amber-400 text-[11px]">+{t.prizeXp} XP</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{t.timeLabel}</span>
                        </span>

                        <button
                          onClick={() => handleJoinTournament(t.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                            t.joined
                              ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40'
                              : 'btn-bibo-primary shadow-sm'
                          }`}
                        >
                          {t.joined ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Joined
                            </span>
                          ) : t.status === 'live' ? (
                            'View Bracket'
                          ) : (
                            'Join'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Leaderboards View */
          <div className="flex flex-col gap-4">
            {/* Discipline Pills */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLeaderboardGame('chess')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  leaderboardGame === 'chess'
                    ? 'btn-bibo-primary'
                    : 'bg-[#222226] text-zinc-400 hover:text-white'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Chess Blitz</span>
              </button>
              <button
                onClick={() => setLeaderboardGame('checkers')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  leaderboardGame === 'checkers'
                    ? 'btn-bibo-primary'
                    : 'bg-[#222226] text-zinc-400 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Checkers</span>
              </button>
              <button
                onClick={() => setLeaderboardGame('morabaraba')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  leaderboardGame === 'morabaraba'
                    ? 'btn-bibo-primary'
                    : 'bg-[#222226] text-zinc-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Morabaraba</span>
              </button>
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-[#222226] border border-white/[0.08] overflow-hidden shadow-lg">
              <div className="grid grid-cols-12 px-4 py-3 border-b border-white/[0.06] text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span className="col-span-1 text-center">Rank</span>
                <span className="col-span-5">Tactician</span>
                <span className="col-span-2 text-center">Rating</span>
                <span className="col-span-2 text-center">Win Rate</span>
                <span className="col-span-2 text-right">Streak</span>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {loadingLeaderboard ? (
                  <div className="py-8 text-center text-xs text-zinc-500 font-mono">Loading live rankings...</div>
                ) : leaderboardData.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500 font-mono">No ranked matches recorded yet in this discipline.</div>
                ) : (
                  leaderboardData.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 items-center px-4 py-3 hover:bg-white/[0.02] transition text-xs"
                    >
                      <span className={`col-span-1 text-center font-black font-mono ${
                        row.rankNumber === 1 ? 'text-[#FF6A00]' : row.rankNumber === 2 ? 'text-amber-400' : row.rankNumber === 3 ? 'text-zinc-300' : 'text-zinc-500'
                      }`}>
                        #{row.rankNumber}
                      </span>

                      <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6A00]/25 to-[#FF173D]/25 border border-[#FF6A00]/30 flex items-center justify-center text-xs font-black text-white shrink-0">
                          {row.handle.slice(0, 1)}
                        </div>
                        <span className="font-bold text-white truncate">{row.handle}</span>
                      </div>

                      <span className="col-span-2 text-center font-mono font-bold text-[#FF6A00]">
                        {row.rating}
                      </span>

                      <span className="col-span-2 text-center font-mono font-semibold text-zinc-300">
                        {row.winRate}
                      </span>

                      <div className="col-span-2 flex items-center justify-end gap-1 font-mono text-[#22C55E] font-bold">
                        <Flame className="w-3.5 h-3.5 text-[#FF6A00]" />
                        <span>{row.streak}W</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function CompetePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-500 font-mono">Loading tournaments...</div>}>
      <CompeteContent />
    </Suspense>
  );
}
