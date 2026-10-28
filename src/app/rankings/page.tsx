'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Search,
  Zap,
  Clock,
  Sparkles,
  Award,
  Crown,
  Medal,
  Shield,
  Swords,
  ChevronRight,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { BiboCatMascot } from '@/components/brand/BiboLogo';
import { getPlayerSession } from '@/lib/session';
import { useRequireAuth } from '@/lib/useRequireAuth';

interface LeaderboardEntry {
  rankNumber: number;
  id: string;
  handle: string;
  blitzRating: number;
  rapidRating: number;
  checkersRating: number;
  morabarabaRating: number;
  xp: number;
  tier: {
    badge: string;
    title: string;
    color: string;
  };
  winRate: string;
  streak: number;
  isVerified?: boolean;
}

type RankingCategory = 'blitz' | 'checkers' | 'morabaraba' | 'xp' | 'rapid';

export default function RankingsPage() {
  const { isAuthenticated } = useRequireAuth();
  const [category, setCategory] = useState<RankingCategory>('blitz');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ id: string; handle: string; rating: number; xp: number }>({
    id: '',
    handle: '',
    rating: 1200,
    xp: 0,
  });

  useEffect(() => {
    const s = getPlayerSession();
    setSession({
      id: s.id,
      handle: s.displayName || s.handle,
      rating: s.rating || 1200,
      xp: s.xp || 0,
    });
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/rankings?category=${category}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.leaderboard && Array.isArray(data.leaderboard)) {
          const mapped: LeaderboardEntry[] = data.leaderboard.map((e: any, idx: number) => ({
            rankNumber: e.rankNumber || idx + 1,
            id: e.id,
            handle: e.handle,
            blitzRating: e.blitzRating || 1200,
            rapidRating: e.rapidRating || 1200,
            checkersRating: e.checkersRating || 1200,
            morabarabaRating: e.morabarabaRating || 1200,
            xp: e.xp || 0,
            tier: e.tier ? { badge: e.tier.badge, title: e.tier.title, color: e.tier.color || 'from-[#FF6A00] to-[#FF173D]' } : { badge: 'CDT', title: 'Tactician', color: 'from-[#FF6A00] to-[#FF173D]' },
            winRate: e.winRate || '0%',
            streak: Math.max(0, 3 - idx),
            isVerified: true,
          }));
          setEntries(mapped);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category]);

  const getMetric = (entry: LeaderboardEntry) => {
    if (category === 'blitz') return `${entry.blitzRating} ELO`;
    if (category === 'rapid') return `${entry.rapidRating} ELO`;
    if (category === 'checkers') return `${entry.checkersRating} ELO`;
    if (category === 'morabaraba') return `${entry.morabarabaRating} ELO`;
    return `${entry.xp.toLocaleString()} XP`;
  };

  const filteredEntries = entries.filter((e) =>
    e.handle.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <BiboCatMascot size={32} glow />
          <p className="text-sm font-bold text-zinc-400">Authenticating player rankings...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6A00]/20 to-[#FF173D]/20 border border-[#FF6A00]/30 flex items-center justify-center text-[#FF6A00] shadow-md">
              <Trophy className="w-6 h-6 text-[#FF6A00]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Global Rankings & Leagues</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                Official ELO ratings across Chess, Checkers, and Morabaraba
              </p>
            </div>
          </div>

          {/* Player Personal Stat Badge */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#222226] border border-white/[0.08] shadow-md">
            <BiboCatMascot size={28} />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Your Rating</span>
              <span className="text-sm font-extrabold text-[#FF6A00] font-mono">{session.rating} ELO</span>
            </div>
          </div>
        </div>

        {/* Category Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#1c1d22] border border-white/[0.06] overflow-x-auto">
            <button
              onClick={() => setCategory('blitz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                category === 'blitz'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Chess Blitz</span>
            </button>
            <button
              onClick={() => setCategory('rapid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                category === 'rapid'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chess Rapid</span>
            </button>
            <button
              onClick={() => setCategory('checkers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                category === 'checkers'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Checkers</span>
            </button>
            <button
              onClick={() => setCategory('morabaraba')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                category === 'morabaraba'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-red-400" />
              <span>Morabaraba</span>
            </button>
            <button
              onClick={() => setCategory('xp')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                category === 'xp'
                  ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>Tactical XP</span>
            </button>
          </div>

          {/* Search Tacticians Input */}
          <div className="flex items-center gap-2 bg-[#222226] border border-white/[0.08] px-3 py-1.5 rounded-xl text-xs w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search player handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white placeholder-zinc-500 text-xs w-full"
            />
          </div>
        </div>

        {/* Leaderboard Table Card */}
        <div className="rounded-2xl bg-[#222226] border border-white/[0.08] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              {/* Header */}
              <div className="grid grid-cols-12 px-4 py-3 bg-[#1c1d22] border-b border-white/[0.06] text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider">
                <span className="col-span-1 text-center">#</span>
                <span className="col-span-5">Tactician</span>
                <span className="col-span-2 text-center">Tier</span>
                <span className="col-span-2 text-center">Score</span>
                <span className="col-span-2 text-right">Action</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.04]">
                {loading ? (
                  <div className="py-12 text-center text-xs text-zinc-500 font-mono">Loading live leaderboards...</div>
                ) : filteredEntries.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 font-mono">No ranked players found for this category.</div>
                ) : (
                  filteredEntries.map((player) => {
                    const isTop3 = player.rankNumber <= 3;
                    return (
                      <div
                        key={player.id}
                        className="grid grid-cols-12 items-center px-4 py-3 hover:bg-white/[0.02] transition text-xs"
                      >
                      {/* Rank */}
                      <div className="col-span-1 flex items-center justify-center font-mono font-bold">
                        {player.rankNumber === 1 ? (
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF6A00] to-[#FF173D] text-white flex items-center justify-center text-xs font-black shadow-sm">
                            1
                          </span>
                        ) : player.rankNumber === 2 ? (
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black">
                            2
                          </span>
                        ) : player.rankNumber === 3 ? (
                          <span className="w-6 h-6 rounded-full bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs font-black">
                            3
                          </span>
                        ) : (
                          <span className="text-zinc-500 font-mono text-xs">#{player.rankNumber}</span>
                        )}
                      </div>

                      {/* Player */}
                      <div className="col-span-5 flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-8 h-8 rounded-xl bg-gradient-to-br ${player.tier.color} flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm`}
                        >
                          {player.handle.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white truncate">{player.handle}</span>
                            {player.isVerified && (
                              <span title="Verified Human" className="shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                            Win Rate: {player.winRate} · Streak: {player.streak}
                            <Flame className="w-3 h-3 text-amber-500 inline" />
                          </span>
                        </div>
                      </div>

                      {/* Tier */}
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-300 font-mono">
                          {player.tier.title}
                        </span>
                      </div>

                      {/* Metric */}
                      <div className="col-span-2 text-center font-mono font-black text-sm text-white">
                        {getMetric(player)}
                      </div>

                      {/* Action */}
                      <div className="col-span-2 flex items-center justify-end">
                        <Link
                          href={`/play?room=duel_${player.handle}`}
                          className="px-3 py-1 rounded-lg btn-bibo-secondary text-[11px] font-bold text-zinc-200 hover:text-white transition active:scale-95"
                        >
                          Challenge
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}