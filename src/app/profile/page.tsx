'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  Trophy,
  Medal,
  Sparkles,
  Zap,
  Clock,
  Flame,
  Swords,
  Crown,
  Archive,
  Target,
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  UserPlus,
  Edit3,
  ChevronRight,
} from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import {
  getPlayerSession,
  PlayerSession,
  SESSION_UPDATED_EVENT,
  savePlayerSession,
  clearPlayerSession,
  isAuthenticatedSession,
} from '@/lib/session';
import { getRankFromXp } from '@/lib/progression';
import { getInsignia, INSIGNIA_MAP } from '@/lib/insignias';
import { AuthModal } from '@/components/AuthModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { RankLadderModal } from '@/components/RankLadderModal';

interface UserProfileData {
  id: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  playStyle?: string;
  onboarded?: boolean;
  email?: string;
  isVerifiedHuman?: boolean;
  blitzRating: number;
  rapidRating: number;
  bulletRating: number;
  checkersRating: number;
  morabarabaRating: number;
  xp: number;
  createdAt?: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  puzzleHighScore: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData>({
    id: '',
    handle: 'Tactician',
    displayName: 'Tactician',
    avatar: 'knight',
    playStyle: 'Tactical',
    onboarded: false,
    blitzRating: 1200,
    rapidRating: 1200,
    bulletRating: 1200,
    checkersRating: 1200,
    morabarabaRating: 1200,
    xp: 0,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    puzzleHighScore: 0,
  });

  const [disciplineStats, setDisciplineStats] = useState({
    chess: { matches: 0, wins: 0, winRate: 0 },
    checkers: { matches: 0, wins: 0, winRate: 0 },
    morabaraba: { matches: 0, wins: 0, winRate: 0 },
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register'>('register');
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [rankLadderOpen, setRankLadderOpen] = useState<boolean>(false);

  useEffect(() => {
    const session = getPlayerSession();
    if (!isAuthenticatedSession(session)) {
      router.push('/login?redirect=/profile');
      return;
    }

    // Immediately populate profile with current local session
    setProfile((prev) => ({
      ...prev,
      id: session.id,
      handle: session.handle,
      displayName: session.displayName || session.handle,
      avatar: session.avatar || 'knight',
      playStyle: session.playStyle || 'Tactical',
      onboarded: Boolean(session.onboarded),
      email: session.email,
      isVerifiedHuman: Boolean(session.isVerifiedHuman),
      blitzRating: session.rating || 1200,
      checkersRating: session.checkersRating || 1200,
      morabarabaRating: session.morabarabaRating || 1200,
      xp: session.xp || 0,
    }));

    let savedHighScore = 0;
    try {
      savedHighScore = parseInt(
        localStorage.getItem('bibo_puzzle_highscore') ||
        localStorage.getItem('obscura_puzzle_highscore') ||
        '0',
        10
      );
    } catch {
      // ignore
    }

    // Listen to real-time session changes from OnboardingModal / match completions
    const handleSessionSync = (e: any) => {
      if (e?.detail) {
        const u = e.detail;
        setProfile((prev) => ({
          ...prev,
          id: u.id,
          handle: u.handle,
          displayName: u.displayName || u.handle,
          avatar: u.avatar || 'knight',
          playStyle: u.playStyle || 'Tactical',
          onboarded: Boolean(u.onboarded),
          email: u.email,
          isVerifiedHuman: Boolean(u.isVerifiedHuman),
          blitzRating: u.rating || prev.blitzRating,
          xp: u.xp || prev.xp,
        }));
      }
    };
    window.addEventListener(SESSION_UPDATED_EVENT as any, handleSessionSync);

    const loadUserData = async () => {
      let activeUserId = session.id;

      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const data = await meRes.json();
          if (data?.authenticated && data.user) {
            const u = data.user;
            activeUserId = u.id;
            const updated: PlayerSession = {
              id: u.id,
              handle: u.handle,
              displayName: u.displayName || u.handle,
              avatar: u.avatar || 'knight',
              playStyle: u.playStyle || 'Tactical',
              onboarded: Boolean(u.onboarded),
              rating: u.blitzRating || 1200,
              checkersRating: u.checkersRating || 1200,
              morabarabaRating: u.morabarabaRating || 1200,
              xp: typeof u.xp === 'number' ? u.xp : (session.xp || 0),
              email: u.email,
              isVerifiedHuman: Boolean(u.isVerifiedHuman),
              avatarUrl: u.avatarUrl,
              isAuthenticated: true,
            };
            savePlayerSession(updated);

            setProfile((prev) => ({
              ...prev,
              id: u.id,
              handle: u.handle,
              displayName: u.displayName || u.handle,
              avatar: u.avatar || prev.avatar,
              playStyle: u.playStyle || prev.playStyle,
              email: u.email,
              isVerifiedHuman: Boolean(u.isVerifiedHuman),
              blitzRating: u.blitzRating ?? 1200,
              checkersRating: u.checkersRating ?? 1200,
              morabarabaRating: u.morabarabaRating ?? 1200,
              xp: typeof u.xp === 'number' ? u.xp : prev.xp,
            }));
          }
        }
      } catch (err) {
        console.warn('Profile auth sync notice:', err);
      }

      if (activeUserId) {
        try {
          const matchRes = await fetch(`/api/matches?userId=${activeUserId}`);
          if (matchRes.ok) {
            const data = await matchRes.json();
            const matches = data.matches || [];
            const wins = matches.filter((m: { winnerId: string }) => m.winnerId === activeUserId).length;
            const draws = matches.filter((m: { winnerId: string | null }) => !m.winnerId).length;
            const losses = matches.length - wins - draws;

            const chessM = matches.filter((m: any) => m.gameId === 'chess');
            const checkersM = matches.filter((m: any) => m.gameId === 'checkers');
            const moraM = matches.filter((m: any) => m.gameId === 'morabaraba');

            const chessW = chessM.filter((m: any) => m.winnerId === activeUserId).length;
            const checkersW = checkersM.filter((m: any) => m.winnerId === activeUserId).length;
            const moraW = moraM.filter((m: any) => m.winnerId === activeUserId).length;

            setDisciplineStats({
              chess: {
                matches: chessM.length,
                wins: chessW,
                winRate: chessM.length > 0 ? Math.round((chessW / chessM.length) * 100) : 0,
              },
              checkers: {
                matches: checkersM.length,
                wins: checkersW,
                winRate: checkersM.length > 0 ? Math.round((checkersW / checkersM.length) * 100) : 0,
              },
              morabaraba: {
                matches: moraM.length,
                wins: moraW,
                winRate: moraM.length > 0 ? Math.round((moraW / moraM.length) * 100) : 0,
              },
            });

            setProfile((prev) => ({
              ...prev,
              matchesPlayed: matches.length,
              wins,
              draws,
              losses,
              puzzleHighScore: savedHighScore,
            }));
          }
        } catch (err) {
          console.error('Profile match fetch error:', err);
        }
      }

      setLoading(false);
    };

    loadUserData();

    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT as any, handleSessionSync);
    };
  }, [router]);

  const rankInfo = getRankFromXp(profile.xp);
  const winRate = profile.matchesPlayed > 0 ? Math.round((profile.wins / profile.matchesPlayed) * 100) : 0;

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearPlayerSession();
    router.push('/login');
  };

  const citations = [
    {
      title: 'Verified Human Tactician',
      desc: 'Authenticated genuine human via Google OAuth identity verification.',
      unlocked: Boolean(profile.isVerifiedHuman),
      icon: ShieldCheck,
    },
    {
      title: 'First Dispatch',
      desc: 'Achieve your first verified match victory.',
      unlocked: profile.wins > 0,
      icon: Swords,
    },
    {
      title: 'Tactical Recon Master',
      desc: 'Score 5 or higher in Puzzle Rush streak.',
      unlocked: profile.puzzleHighScore >= 5,
      icon: Target,
    },
    {
      title: 'Lakebase Regular',
      desc: 'Complete at least 5 recorded arena matches.',
      unlocked: profile.matchesPlayed >= 5,
      icon: Archive,
    },
    {
      title: 'Centurion Tactician',
      desc: 'Attain 2,500+ career XP.',
      unlocked: profile.xp >= 2500,
      icon: Trophy,
    },
    {
      title: 'Order of the Vanguard',
      desc: 'Attain the rank of Vanguard or higher (9,000+ XP).',
      unlocked: profile.xp >= 9000,
      icon: Medal,
    },
    {
      title: 'Legendary Sovereign',
      desc: 'Attain the rank of Legendary or higher (35,000+ XP).',
      unlocked: profile.xp >= 35000,
      icon: Sparkles,
    },
  ];

  return (
    <AppShell>
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 select-none font-sans">
        {/* Console Profile Header */}
        <div className="rounded-2xl bg-[#16171b] border border-white/[0.06] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${INSIGNIA_MAP[profile.avatar || 'knight']?.color || INSIGNIA_MAP.knight.color} border flex items-center justify-center text-2xl font-bold shadow-md shrink-0`}>
              {INSIGNIA_MAP[profile.avatar || 'knight']?.symbol || '♞'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {profile.displayName || profile.handle}
                </h1>
                <span className="text-xs font-mono text-zinc-400">@{profile.handle}</span>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30">
                  {rankInfo.tier.badge}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-white/5 text-zinc-300 border border-white/10">
                  {profile.playStyle || 'Tactical'}
                </span>
                {profile.isVerifiedHuman ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Google Verified Human</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-white/10">
                    Guest Session
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                {rankInfo.tier.league} League · Division {rankInfo.tier.division}
                {profile.email && <span className="text-zinc-500"> · {profile.email}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setRankLadderOpen(true)}
              title="Click to view all XP levels & rank ladder"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#222226] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 font-mono text-xs transition cursor-pointer"
            >
              <span className="text-zinc-400 font-bold">TOTAL XP:</span>
              <span className="font-bold text-[#FF6A00] text-sm">{profile.xp.toLocaleString()}</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <button
              onClick={() => setOnboardingOpen(true)}
              title="Edit Tactician Dossier (Handle, Callsign, Insignia, Playstyle)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-zinc-200 transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#FF6A00]" />
              <span>Edit Dossier</span>
            </button>

            {profile.isVerifiedHuman || profile.email ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSignOut}
                  title="Sign out to Guest Session"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-xs font-bold text-zinc-300 hover:text-red-400 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthModalTab('signin');
                    setAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-[#28282e] border border-white/10 text-xs font-bold text-zinc-300 transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthModalTab('register');
                    setAuthModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl btn-bibo-primary text-xs font-extrabold transition shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Google & Account Creation Upgrade Banner (When Guest / Not Verified) */}
        {!profile.isVerifiedHuman && !profile.email && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Upgrade Guest to Permanent Tactician Account</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">Preserves XP & Matches</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Save your XP, unlock ranked multiplayer, and verify genuine human tactician presence.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => {
                  setAuthModalTab('register');
                  setAuthModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm active:scale-[0.99] cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-black" />
                <span>Create Account</span>
              </button>
              <a
                href="/api/auth/google"
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs transition flex items-center gap-2 shadow-sm shrink-0 active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </a>
            </div>
          </div>
        )}

        {/* Rank Standing & Progress Banner */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 sm:p-5 flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div>
              <span className="text-lg font-bold text-white">
                {rankInfo.tier.title}
              </span>
              <p className="text-xs text-zinc-400 font-medium">
                Level status across all chess disciplines
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {rankInfo.nextTier && (
                <span className="text-xs text-zinc-400">
                  Next Rank: <strong className="text-white">{rankInfo.nextTier.title}</strong> ({rankInfo.nextTier.minXp.toLocaleString()} XP)
                </span>
              )}
              <button
                onClick={() => setRankLadderOpen(true)}
                title="View all XP levels and rank tiers"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222226] hover:bg-white/[0.08] border border-white/10 text-xs font-bold text-[#FF6A00] transition active:scale-95 cursor-pointer shadow-sm"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>View All Ranks</span>
              </button>
            </div>
          </div>

          {/* Division Meter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-semibold text-zinc-400">
              <span>Division Advancement</span>
              <span className="text-[#22c55e]">{rankInfo.progressPercent}%</span>
            </div>
            <div className="w-full bg-[#1c1d22] h-2.5 rounded-full overflow-hidden border border-white/[0.04]">
              <div
                className="bg-[#22c55e] h-full rounded-full transition-all duration-500"
                style={{ width: `${rankInfo.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Core Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-[#222226] border border-white/[0.08] text-center flex flex-col items-center justify-center shadow-lg">
            <span className="text-2xl sm:text-3xl font-black text-white font-sora">
              {profile.matchesPlayed}
            </span>
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1">Games</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#222226] border border-white/[0.08] text-center flex flex-col items-center justify-center shadow-lg">
            <span className="text-2xl sm:text-3xl font-black text-[#22C55E] font-sora">
              {profile.wins}
            </span>
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1">Wins</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#222226] border border-white/[0.08] text-center flex flex-col items-center justify-center shadow-lg">
            <div className="flex items-center gap-1">
              <span className="text-2xl sm:text-3xl font-black text-[#FF6A00] font-sora">
                {profile.puzzleHighScore}
              </span>
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider mt-1">Streak</span>
          </div>
        </div>

        {/* Rating Across Disciplines */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Chess Rating Card */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#222226] flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6A00]/25 to-[#FF173D]/25 border border-[#FF6A00]/40 flex items-center justify-center shadow-sm">
                <Swords className="w-5 h-5 text-[#FF6A00]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white">Chess</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {disciplineStats.chess.matches > 0
                    ? `${disciplineStats.chess.winRate}% win rate`
                    : 'No matches yet'}
                </span>
              </div>
            </div>
            <span className="text-xl font-black text-white font-sora">
              {profile.blitzRating || 1200}
            </span>
          </div>

          {/* Checkers Rating Card */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#222226] flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/25 to-red-500/25 border border-amber-500/40 flex items-center justify-center shadow-sm">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white">Checkers</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {disciplineStats.checkers.matches > 0
                    ? `${disciplineStats.checkers.winRate}% win rate`
                    : 'No matches yet'}
                </span>
              </div>
            </div>
            <span className="text-xl font-black text-white font-sora">
              {profile.checkersRating || 1200}
            </span>
          </div>

          {/* Morabaraba Rating Card */}
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#222226] flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/25 to-orange-500/25 border border-red-500/40 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-[#FF173D]" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-white">Morabaraba</span>
                <span className="text-xs text-zinc-400 font-mono">
                  {disciplineStats.morabaraba.matches > 0
                    ? `${disciplineStats.morabaraba.winRate}% win rate`
                    : 'No matches yet'}
                </span>
              </div>
            </div>
            <span className="text-xl font-black text-white font-sora">
              {profile.morabarabaRating || 1200}
            </span>
          </div>
        </div>

        {/* Achievements Showcase */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#222226] p-4 sm:p-5 flex flex-col gap-3.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FF6A00]" />
              <span className="font-extrabold text-sm text-white font-sora">Achievements</span>
            </div>
            <span className="text-xs text-zinc-400 font-mono">
              {[profile.wins >= 1, profile.matchesPlayed >= 5, profile.xp >= 500, profile.puzzleHighScore >= 5, profile.xp >= 10000].filter(Boolean).length} of 5
            </span>
          </div>

          <div className="flex items-center justify-around sm:justify-start gap-4 py-2 overflow-x-auto">
            {[
              { id: 1, title: 'First Strike', unlocked: profile.wins >= 1 },
              { id: 2, title: 'Tactician', unlocked: profile.matchesPlayed >= 5 },
              { id: 3, title: 'Centurion', unlocked: profile.xp >= 500 },
              { id: 4, title: 'Streak Star', unlocked: profile.puzzleHighScore >= 5 },
              { id: 5, title: 'Grandmaster', unlocked: profile.xp >= 10000 },
            ].map((star) => (
              <div key={star.id} className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition shadow-md border ${
                    star.unlocked
                      ? 'bg-gradient-to-br from-amber-500/25 to-[#FF6A00]/25 border-amber-400/50 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-white/5 border-white/10 text-zinc-600 grayscale opacity-40'
                  }`}
                >
                  ⭐
                </div>
                <span className={`text-[10px] font-bold font-mono ${star.unlocked ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {star.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Combat Record Statistics */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 sm:p-5 flex flex-col gap-3">
          <span className="font-extrabold uppercase tracking-wider text-xs text-zinc-400 border-b border-white/[0.06] pb-2">
            Match Telemetry Summary
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-[#1c1d22] border border-white/[0.04]">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Matches</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{profile.matchesPlayed}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#1c1d22] border border-white/[0.04]">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Victories</span>
              <span className="text-xl font-bold text-[#22c55e] mt-0.5 block">{profile.wins}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#1c1d22] border border-white/[0.04]">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Draws</span>
              <span className="text-xl font-bold text-zinc-400 mt-0.5 block">{profile.draws}</span>
            </div>

            <div className="p-3 rounded-xl bg-[#1c1d22] border border-white/[0.04]">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Win Ratio</span>
              <span className="text-xl font-bold text-[#ffcc00] mt-0.5 block">{winRate}%</span>
            </div>
          </div>
        </div>

        {/* Console Achievements (Medals Case) */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#16171b] p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2">
              <Medal className="w-4 h-4 text-[#ffcc00]" />
              <span className="font-extrabold text-xs sm:text-sm text-white">
                Career Badges & Honors
              </span>
            </div>
            <span className="text-xs text-zinc-400">
              {citations.filter((c) => c.unlocked).length} of {citations.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {citations.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition ${
                    c.unlocked
                      ? 'border-white/[0.08] bg-[#1c1d22]'
                      : 'border-white/[0.04] bg-[#16171b] opacity-40'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      c.unlocked
                        ? 'bg-[#22242b] border border-white/10 text-white'
                        : 'bg-white/5 text-zinc-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white truncate">{c.title}</span>
                      {c.unlocked && <CheckCircle className="w-3 h-3 text-[#22c55e] shrink-0" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 leading-tight mt-0.5">{c.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <AuthModal
          isOpen={authModalOpen}
          initialTab={authModalTab}
          onClose={() => setAuthModalOpen(false)}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          onSuccess={(u) => {
            setAuthModalOpen(false);
            setProfile((prev) => ({
              ...prev,
              id: u.id,
              handle: u.handle,
              email: u.email,
              blitzRating: u.blitzRating || prev.blitzRating,
              xp: u.xp || prev.xp,
            }));
          }}
        />

        <OnboardingModal
          isOpen={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onComplete={(updatedUser) => {
            setOnboardingOpen(false);
            setProfile((prev) => ({
              ...prev,
              id: updatedUser.id,
              handle: updatedUser.handle,
              displayName: updatedUser.displayName || updatedUser.handle,
              avatar: updatedUser.avatar || 'knight',
              playStyle: updatedUser.playStyle || 'Tactical',
              blitzRating: updatedUser.rating,
              xp: updatedUser.xp,
              email: updatedUser.email,
              isVerifiedHuman: updatedUser.isVerifiedHuman,
              onboarded: true,
            }));
          }}
          isExistingUser={Boolean(profile.email || profile.isVerifiedHuman)}
        />
        <RankLadderModal
          isOpen={rankLadderOpen}
          onClose={() => setRankLadderOpen(false)}
          currentXp={profile.xp}
        />
      </div>
    </AppShell>
  );
}
