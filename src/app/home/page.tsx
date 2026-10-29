'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Users,
  Trophy,
  ArrowRight,
  ChevronRight,
  Zap,
  Swords,
  Crown,
  Shield,
  Lock,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BiboCatMascot } from '@/components/brand/BiboLogo';
import { DisciplineIcon } from '@/components/icons/DisciplineIcon';
import { getPlayerSession, SESSION_UPDATED_EVENT, isAuthenticatedSession } from '@/lib/session';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useQuickPlay } from '@/lib/quick-play-context';

interface MatchItem {
  id: string;
  gameId?: string;
  whiteId?: string;
  blackId?: string;
  white?: { handle: string; blitzRating?: number };
  black?: { handle: string; blitzRating?: number };
  winnerId: string | null;
  resultType: string;
  timeControl: string;
  pgn?: string;
  finalFen?: string;
  createdAt: string;
}

export default function HomePage() {
  const { isAuthenticated } = useRequireAuth();
  const { openQuickPlay } = useQuickPlay();
  const [session, setSession] = useState<{ id: string; handle: string; rating: number; xp: number; isAuthenticated: boolean }>({
    id: '',
    handle: '',
    rating: 1200,
    xp: 0,
    isAuthenticated: false,
  });
  const [recentMatches, setRecentMatches] = useState<MatchItem[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [topPlayers, setTopPlayers] = useState<
    { rank: number; handle: string; rating: number; title: string; avatarBg: string }[]
  >([]);
  const [loadingRankings, setLoadingRankings] = useState(true);

  useEffect(() => {
    let active = true;
    const s = getPlayerSession();
    setSession({
      id: s.id,
      handle: s.displayName || s.handle,
      rating: s.rating || 1200,
      xp: s.xp || 0,
      isAuthenticated: isAuthenticatedSession(s),
    });

    const handleSync = (e: any) => {
      if (e?.detail) {
        setSession({
          id: e.detail.id,
          handle: e.detail.displayName || e.detail.handle,
          rating: e.detail.rating || 1200,
          xp: e.detail.xp || 0,
          isAuthenticated: isAuthenticatedSession(e.detail),
        });
      }
    };
    window.addEventListener(SESSION_UPDATED_EVENT as any, handleSync);

    fetch('/api/matches')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.matches && Array.isArray(data.matches)) {
          setRecentMatches(data.matches.slice(0, 5));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingMatches(false);
      });

    fetch('/api/rankings?limit=5')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.leaderboard && Array.isArray(data.leaderboard)) {
          const avatarGradients = [
            'from-[#FF6A00] to-[#FF173D]',
            'from-amber-500 to-red-500',
            'from-emerald-500 to-teal-600',
            'from-blue-500 to-indigo-600',
            'from-purple-500 to-pink-600',
          ];
          setTopPlayers(
            data.leaderboard.map((p: any, idx: number) => ({
              rank: p.rankNumber || idx + 1,
              handle: p.handle,
              rating: p.rating || p.blitzRating || 1200,
              title: p.tier?.title || 'Tactician',
              avatarBg: avatarGradients[idx % avatarGradients.length],
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingRankings(false);
      });

    return () => {
      active = false;
      window.removeEventListener(SESSION_UPDATED_EVENT as any, handleSync);
    };
  }, []);

  const cleanHandle = (handle?: string, id?: string) => {
    if (handle) {
      if (handle.startsWith('bot_')) return `Bot (${handle.replace('bot_', '')})`;
      return handle.replace(/_guest/gi, '').replace(/_test_/gi, '').replace(/_+$/, '');
    }
    if (id?.startsWith('bot_')) return `Bot (${id.replace('bot_', '')})`;
    if (id?.startsWith('guest_')) return 'Player';
    return id || 'Player';
  };

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <BiboCatMascot size={32} glow />
          <p className="text-sm font-bold text-zinc-400">Authenticating tactician dashboard...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 pb-6">
        {/* 1. Welcome Header & Primary CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sora">
              Welcome back, {session.handle || 'Tactician'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">
              Three classic disciplines. One shared arena.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {session.isAuthenticated ? (
              <>
                <button
                  onClick={() => openQuickPlay()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] hover:brightness-110 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-[#FF173D]/20 active:scale-95 transition cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Find a Game</span>
                </button>
                <Link
                  href="/friends"
                  className="px-4 py-2.5 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] text-xs sm:text-sm font-bold text-zinc-300 hover:text-white flex items-center gap-2 active:scale-95 transition cursor-pointer"
                >
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>Friends</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Locked</span>
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] hover:brightness-110 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-[#FF173D]/20 active:scale-95 transition cursor-pointer"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2.5 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] text-xs sm:text-sm font-bold text-zinc-200 hover:text-white flex items-center gap-2 active:scale-95 transition cursor-pointer"
                >
                  <span>Log In</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 3. The Three Classic Disciplines (Hero Cards) */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest font-mono">
              Choose Discipline
            </h2>
            <Link href="/play" className="text-xs font-bold text-[#FF6A00] hover:underline flex items-center gap-1">
              <span>Quick Arena</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Chess Card */}
            <Link
              href="/play/chess"
              className="group rounded-2xl bg-[#222226] hover:bg-[#27272c] border border-white/[0.08] hover:border-[#FF6A00]/40 p-5 transition-all duration-200 flex flex-col justify-between shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6A00]/20 to-[#FF173D]/20 border border-[#FF6A00]/30 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Swords className="w-6 h-6 text-[#FF6A00]" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-mono">
                  Standard 8x8
                </span>
              </div>
              <div className="mt-4 flex flex-col">
                <span className="font-extrabold text-lg text-white group-hover:text-[#FF6A00] transition font-sora">
                  Chess
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  Standard legality, Stockfish coach, and live review.
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-bold">
                <span className="text-[11px] text-zinc-500 font-mono">AI & Online</span>
                <span className="flex items-center gap-1 text-[#FF6A00]">
                  <span>Play</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </span>
              </div>
            </Link>

            {/* Checkers Card (Locked) */}
            <Link
              href="/play/checkers"
              className="group rounded-2xl bg-[#222226] hover:bg-[#27272c] border border-white/[0.08] hover:border-amber-500/40 p-5 transition-all duration-200 flex flex-col justify-between shadow-lg opacity-90 hover:opacity-100"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/30 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Crown className="w-6 h-6 text-amber-400" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked</span>
                </span>
              </div>
              <div className="mt-4 flex flex-col">
                <span className="font-extrabold text-lg text-white group-hover:text-amber-400 transition font-sora">
                  Checkers
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  Forced jumps and king crowning. Under calibration.
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-bold">
                <span className="text-[11px] text-amber-400/80 font-mono">Arena Locked</span>
                <span className="flex items-center gap-1 text-zinc-400 group-hover:text-amber-400 transition">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </span>
              </div>
            </Link>

            {/* Morabaraba Card */}
            <Link
              href="/play/morabaraba"
              className="group rounded-2xl bg-[#222226] hover:bg-[#27272c] border border-white/[0.08] hover:border-[#FF6A00]/40 p-5 transition-all duration-200 flex flex-col justify-between shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF173D]/20 to-orange-500/20 border border-[#FF173D]/30 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6 text-[#FF173D]" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-mono">
                  24-Pt Mill
                </span>
              </div>
              <div className="mt-4 flex flex-col">
                <span className="font-extrabold text-lg text-white group-hover:text-[#FF6A00] transition font-sora">
                  Morabaraba
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  Traditional African mill game: drop, slide, and fly.
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-bold">
                <span className="text-[11px] text-zinc-500 font-mono">Traditional</span>
                <span className="flex items-center gap-1 text-[#FF6A00]">
                  <span>Play</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* 4. Split Dashboard Grid: Completed Matches (Left 8) + Leaderboard (Right 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Recent Matches Vault */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="rounded-2xl bg-[#222226] border border-white/[0.08] p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                    Recent Matches
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-mono text-zinc-400">
                    Vault
                  </span>
                </div>
                <Link href="/archive" className="text-xs font-bold text-[#FF6A00] hover:underline flex items-center gap-1">
                  <span>View All</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {loadingMatches ? (
                <div className="py-8 text-center text-xs text-zinc-500 font-mono">Loading telemetry...</div>
              ) : recentMatches.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-xs text-zinc-400">No completed matches recorded yet.</p>
                  <Link href="/play" className="text-xs font-bold text-[#FF6A00] hover:underline">
                    Start a game →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {recentMatches.map((m, idx) => {
                    const whiteHandle = cleanHandle(m.white?.handle, m.whiteId);
                    const blackHandle = cleanHandle(m.black?.handle, m.blackId);
                    const isWhiteWin = m.winnerId === whiteHandle || m.winnerId === m.whiteId;
                    const resultText = m.resultType || 'Completed';
                    const isDraw =
                      resultText.toLowerCase().includes('draw') ||
                      resultText.toLowerCase().includes('stalemate');
                    const dateFormatted = new Date(m.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                    return (
                      <Link
                        key={m.id || idx}
                        href="/archive"
                        className="flex items-center justify-between py-2.5 px-2 hover:bg-white/[0.03] transition rounded-xl text-xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <DisciplineIcon gameId={m.gameId || 'chess'} size={16} />
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="font-bold text-white truncate">
                              {whiteHandle} vs {blackHandle}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {m.timeControl || '5+0'} · {resultText}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {isDraw ? (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-bold text-xs">
                              Draw
                            </span>
                          ) : isWhiteWin ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                              1 - 0
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-xs">
                              0 - 1
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                            {dateFormatted}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Top Players Leaderboard Snapshot */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <div className="rounded-2xl bg-[#222226] border border-white/[0.08] p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#FF6A00]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">Top Players</span>
                </div>
                <Link href="/compete" className="text-xs font-bold text-[#FF6A00] hover:underline">
                  Full list
                </Link>
              </div>

              <div className="flex flex-col gap-2">
                {loadingRankings ? (
                  <div className="py-6 text-center text-xs text-zinc-500 font-mono">Loading rankings...</div>
                ) : topPlayers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 font-mono">No ranked players yet.</div>
                ) : (
                  topPlayers.map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#171719] border border-white/[0.04] text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-4 text-center font-mono text-xs font-bold ${
                          player.rank === 1 ? 'text-[#FF6A00]' : player.rank === 2 ? 'text-amber-400' : 'text-zinc-500'
                        }`}>
                          #{player.rank}
                        </span>
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${player.avatarBg} flex items-center justify-center text-xs font-black text-white shrink-0`}>
                          {player.handle.slice(0, 1)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">{player.handle}</span>
                          <span className="text-[10px] text-zinc-500">{player.title}</span>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold text-zinc-200">
                        {player.rating}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Player Rating Summary */}
              {session.isAuthenticated ? (
                <div className="mt-1 p-2.5 rounded-xl bg-[#171719] border border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <BiboCatMascot size={18} />
                    <span className="text-zinc-400 font-bold">Your ELO</span>
                  </div>
                  <span className="font-mono font-bold text-white">{session.rating}</span>
                </div>
              ) : (
                <div className="mt-1 p-3 rounded-xl bg-[#171719] border border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <BiboCatMascot size={20} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-bold truncate">Track Your ELO</span>
                      <span className="text-[10px] text-zinc-500">Sign in to earn rank badges</span>
                    </div>
                  </div>
                  <Link
                    href="/signup"
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white font-bold text-[11px] shrink-0 transition"
                  >
                    Join
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
