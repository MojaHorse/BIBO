'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Gamepad2,
  Trophy,
  Users,
  User,
  Swords,
  Crown,
  Shield,
  Target,
  Archive,
  Settings,
  Volume2,
  VolumeX,
  Search,
  Coins,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  LogIn,
  Bell,
  Sparkles,
  Lock,
} from 'lucide-react';
import { BiboLogo, BiboCatMascot } from '@/components/brand/BiboLogo';
import {
  getPlayerSession,
  PlayerSession,
  SESSION_UPDATED_EVENT,
  savePlayerSession,
  clearPlayerSession,
  isAuthenticatedSession,
} from '@/lib/session';
import { getRankFromXp } from '@/lib/progression';
import { getInsignia } from '@/lib/insignias';
import { useSettings } from '@/lib/settings-context';
import { useArenaMode } from '@/lib/arena-mode-context';
import { useQuickPlay } from '@/lib/quick-play-context';
import { AuthModal } from '@/components/AuthModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { soundManager } from '@/lib/chess-sound';
import { ActiveMatchBanner } from '@/components/ActiveMatchBanner';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, updateSettings } = useSettings();
  const { isInActiveMatch } = useArenaMode();
  const { openQuickPlay } = useQuickPlay();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [session, setSession] = useState<PlayerSession>(() => getPlayerSession());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register'>('signin');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Sync session across entire app in real time
  useEffect(() => {
    const s = getPlayerSession();
    setSession(s);

    const handleSync = (e: any) => {
      if (e?.detail) {
        setSession(e.detail);
      }
    };
    window.addEventListener(SESSION_UPDATED_EVENT as any, handleSync);

    // Sync signed Google/OAuth session from server if available
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          const u = data.user;
          const updated: PlayerSession = {
            id: u.id,
            handle: u.handle,
            displayName: u.displayName || u.handle,
            avatar: u.avatar || 'knight',
            playStyle: u.playStyle || 'Tactical',
            rating: u.blitzRating || 1200,
            xp: typeof u.xp === 'number' ? u.xp : (s.xp || 0),
            email: u.email,
            isVerifiedHuman: Boolean(u.isVerifiedHuman),
            avatarUrl: u.avatarUrl,
            onboarded: Boolean(u.onboarded),
            isAuthenticated: true,
          };
          savePlayerSession(updated);
        } else if (data && data.authenticated === false && s.isAuthenticated) {
          clearPlayerSession();
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT as any, handleSync);
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    clearPlayerSession();
    router.push('/login');
  };

  // 1. Play Disciplines & Arenas
  const playNavItems = [
    { href: '/home', label: 'Home', icon: Home, isActive: (p: string) => p === '/home' || p === '/' },
    { href: '/play', label: 'Play Hub', icon: Gamepad2, badge: 'All', isActive: (p: string) => p === '/play' },
    { href: '/play/chess', label: 'Chess Arena', icon: Swords, badge: 'Live', isActive: (p: string) => p === '/play/chess' },
    { href: '/play/checkers', label: 'Checkers', icon: Crown, badge: '8x8', isActive: (p: string) => p === '/play/checkers' },
    { href: '/play/morabaraba', label: 'Morabaraba', icon: Shield, badge: '24-Pt', isActive: (p: string) => p === '/play/morabaraba' },
    { href: '/puzzles', label: 'Puzzles', icon: Target, badge: 'Locked', isLocked: true, isActive: (p: string) => p === '/puzzles' },
  ];

  // 2. Community & Vault Destinations
  const communityNavItems = [
    { href: '/compete', label: 'Compete & Ranks', icon: Trophy, isActive: (p: string) => p === '/compete' || p === '/rankings' },
    { href: '/friends', label: 'Friends', icon: Users, badge: 'Locked', isLocked: true, isActive: (p: string) => p === '/friends' },
    { href: '/archive', label: 'Match Vault', icon: Archive, isActive: (p: string) => p === '/archive' },
    { href: '/settings', label: 'Settings', icon: Settings, isActive: (p: string) => p === '/settings' },
  ];

  const mobileNavItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/play', label: 'Play', icon: Gamepad2 },
    { href: '/compete', label: 'Compete', icon: Trophy },
    { href: '/friends', label: 'Friends', icon: Users, isLocked: true },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const rankInfo = getRankFromXp(session.xp);
  const currentInsignia = getInsignia(session.avatar);

  const toggleSound = () => {
    const next = !settings.soundEnabled;
    updateSettings({ soundEnabled: next });
    soundManager.enabled = next;
  };

  // Prevent outer elastic bounce and accidental document scrolling during active matches
  useEffect(() => {
    if (isInActiveMatch) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehaviorY = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.overscrollBehaviorY = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.overscrollBehaviorY = '';
    };
  }, [isInActiveMatch]);

  return (
    <div
      suppressHydrationWarning
      className={`bg-[#171719] text-[#F8F1E5] font-sans flex ${
        isInActiveMatch
          ? 'h-dvh max-h-dvh overflow-hidden w-full'
          : 'min-h-screen w-full'
      }`}
    >
      {/* 1. Desktop Left Sidebar (Collapsible for Maximum Arena Space) */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 bg-[#141416] border-r border-white/[0.06] select-none sticky top-0 h-screen z-40 transition-all duration-200 ${
          sidebarCollapsed ? 'w-16 p-2 items-center' : 'w-60 p-3.5'
        }`}
      >
        <div className={`flex flex-col gap-4 w-full ${sidebarCollapsed ? 'items-center' : ''}`}>
          {/* Brand & Collapse Toggle */}
          <div className="flex items-center justify-between w-full px-1">
            <Link href="/" className="flex items-center gap-2 py-1 group">
              {sidebarCollapsed ? (
                <BiboCatMascot size={32} glow />
              ) : (
                <BiboLogo size="sm" glow />
              )}
            </Link>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Primary Quick Action: Quick Play */}
          <div className="w-full px-1">
            <button
              onClick={() => openQuickPlay()}
              title="Quick Play Matchmaking"
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-extrabold uppercase tracking-wider shadow-lg shadow-[#FF173D]/25 hover:brightness-110 active:scale-[0.98] transition cursor-pointer font-sora ${
                sidebarCollapsed ? 'p-2.5' : 'py-2.5 px-3 text-xs'
              }`}
            >
              <Gamepad2 className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Quick Play</span>}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 w-full overflow-y-auto max-h-[calc(100vh-230px)] pr-0.5">
            {!sidebarCollapsed && (
              <div className="pt-1 pb-1 px-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Disciplines</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00]" />
              </div>
            )}

            {playNavItems.map((item) => {
              const isActive = item.isActive ? item.isActive(pathname) : pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`relative flex items-center rounded-xl text-xs font-semibold transition group ${
                    sidebarCollapsed
                      ? 'justify-center p-2.5'
                      : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'text-white bg-[#222226] shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-[#FF6A00] to-[#FF173D]" />
                  )}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#FF6A00]' : 'text-zinc-400 group-hover:text-white'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge && (
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                        item.isLocked
                          ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
                          : 'bg-white/5 border border-white/10 text-zinc-400 group-hover:text-zinc-300'
                      }`}
                    >
                      {item.isLocked && <Lock className="w-2.5 h-2.5" />}
                      <span>{item.badge}</span>
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Community & Vault Section */}
            {!sidebarCollapsed && (
              <div className="pt-3 pb-1 px-3 flex items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">Community & Vault</span>
              </div>
            )}

            {communityNavItems.map((item) => {
              const isActive = item.isActive ? item.isActive(pathname) : pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`relative flex items-center rounded-xl text-xs font-semibold transition group ${
                    sidebarCollapsed
                      ? 'justify-center p-2.5'
                      : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'text-white bg-[#222226] shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-[#FF6A00] to-[#FF173D]" />
                  )}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#FF6A00]' : 'text-zinc-400 group-hover:text-white'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && item.badge && (
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 ${
                        item.isLocked
                          ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
                          : 'bg-white/5 border border-white/10 text-zinc-400 group-hover:text-zinc-300'
                      }`}
                    >
                      {item.isLocked && <Lock className="w-2.5 h-2.5" />}
                      <span>{item.badge}</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Audio & Profile */}
        <div className={`flex flex-col gap-2 pt-3 border-t border-white/[0.06] w-full ${sidebarCollapsed ? 'items-center' : ''}`}>
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={settings.soundEnabled ? "Audio Effects: ON" : "Audio Effects: OFF"}
            className={`flex items-center rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] transition ${
              sidebarCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-[#22c55e]" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
              {!sidebarCollapsed && <span>Audio Effects</span>}
            </div>
            {!sidebarCollapsed && (
              <span className="text-[10px] text-zinc-500 font-mono">
                {settings.soundEnabled ? 'ON' : 'OFF'}
              </span>
            )}
          </button>

          {/* User Profile or Sign In Callout */}
          {isAuthenticatedSession(session) ? (
            <Link
              href="/profile"
              title={`${session.displayName || session.handle} (${session.rating} ELO)`}
              className={`flex items-center rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.06] transition overflow-hidden ${
                sidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2 gap-2'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${currentInsignia.color} border flex items-center justify-center text-sm font-bold shrink-0 shadow-sm`}>
                  {currentInsignia.symbol}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-xs font-bold text-white truncate">{session.displayName || session.handle}</span>
                      {session.isVerifiedHuman && (
                        <span title="Verified Human (Google)" className="text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono truncate">@{session.handle} · {session.rating} ELO</span>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-[#38bdf8] shrink-0">
                  {rankInfo.tier.badge}
                </span>
              )}
            </Link>
          ) : (
            <div className={`flex flex-col gap-1.5 w-full ${sidebarCollapsed ? 'items-center' : ''}`}>
              <Link
                href="/login"
                className={`w-full py-2.5 px-3 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] border border-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition flex items-center justify-between ${
                  sidebarCollapsed ? 'p-2 justify-center' : ''
                }`}
                title={sidebarCollapsed ? "Sign In" : undefined}
              >
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-[#FF6A00]" />
                  {!sidebarCollapsed && <span>Sign In</span>}
                </div>
                {!sidebarCollapsed && <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Main Page Container */}
      <div className={`flex-1 flex flex-col min-w-0 ${isInActiveMatch ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-screen'}`}>
        {/* Mobile Top Header (Clean Brand Mascot Header & Quick Game Switcher) - Hidden during focused active matches */}
        {!isInActiveMatch && (
          <header className="md:hidden flex items-center justify-between px-3 py-2 bg-[#141416] border-b border-white/[0.08] sticky top-0 z-40">
            <Link href="/" className="flex items-center gap-1.5 shrink-0 py-0.5">
              <BiboLogo size="xs" glow />
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticatedSession(session) && (
                <Link
                  href="/compete"
                  title="Tournaments & XP"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#222226] border border-white/[0.08] text-xs font-mono text-zinc-300"
                >
                  <Coins className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span className="font-bold text-white text-[11px]">{session.xp.toLocaleString()} XP</span>
                </Link>
              )}

              {!isAuthenticatedSession(session) ? (
                <Link
                  href="/login"
                  className="px-3 py-1 rounded-lg btn-bibo-primary text-xs font-black shadow-sm active:scale-95"
                >
                  Sign In
                </Link>
              ) : (
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#222226] border border-white/[0.08] text-xs font-bold text-zinc-300 active:scale-95"
                >
                  <div className="w-4 h-4 rounded-md bg-gradient-to-br from-[#FF6A00] to-[#FF173D] flex items-center justify-center text-[9px] font-bold text-white">
                    {session.handle.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="max-w-[70px] truncate">{session.displayName || session.handle}</span>
                </Link>
              )}
            </div>
          </header>
        )}

        {/* Top Desktop Bar: Clean Search & Quick Stats (Hidden only during active matches) */}
        {!isInActiveMatch && (
          <div className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-white/[0.06] bg-[#171719]">
            {/* Clean Search Input */}
            <div className="flex items-center gap-2.5 bg-[#222226] px-3.5 py-1.5 rounded-xl border border-white/[0.06] text-xs text-zinc-400 w-80">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search players, openings..."
                className="bg-transparent border-none outline-none text-[#F8F1E5] placeholder-zinc-500 text-xs w-full"
                readOnly
              />
            </div>

            {/* Quick Balance, Status & Auth Controls */}
            <div className="flex items-center gap-2.5">
              {isAuthenticatedSession(session) && (
                <Link
                  href="/compete"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.06] text-xs font-mono text-zinc-300 transition"
                >
                  <Coins className="w-3.5 h-3.5 text-[#FF6A00]" />
                  <span className="font-bold text-white">{session.xp.toLocaleString()} XP</span>
                  <span className="text-[10px] text-zinc-500">· {rankInfo.tier.title}</span>
                </Link>
              )}

              {isAuthenticatedSession(session) ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    href="/profile"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] text-xs font-bold text-[#F8F1E5] transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>{session.displayName || session.handle}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 rounded-xl bg-[#222226] hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="px-3.5 py-1.5 rounded-xl bg-[#222226] hover:bg-[#2a2a30] border border-white/[0.08] text-xs font-bold text-zinc-200 hover:text-white transition cursor-pointer"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-1.5 rounded-xl btn-bibo-primary text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Match Persistent Reconnection Banner */}
        <ActiveMatchBanner />

        {/* Main Content Area */}
        <main
          className={`flex-1 min-h-0 ${
            isInActiveMatch
              ? 'p-0 md:p-3 h-full overflow-hidden md:overflow-y-auto flex flex-col'
              : 'p-3 sm:p-6 md:p-8 pb-[calc(env(safe-area-inset-bottom,0px)+72px)] md:pb-8 overflow-y-auto flex flex-col'
          }`}
        >
          {children}
        </main>

        {/* Mobile Bottom Bar (Safe-Area Inset Aware) - Hidden during focused active matches */}
        {!isInActiveMatch && (
          <nav
            className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141416]/95 border-t border-white/[0.08] px-3 pt-2 z-40 flex items-center justify-around backdrop-blur-md"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
          >
            {mobileNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                    isActive
                      ? 'text-[#FF6A00] font-bold bg-white/[0.04]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF6A00]' : 'text-zinc-400'}`} />
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                  {item.isLocked && (
                    <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#141416]" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Global Human Verification Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onSuccess={() => setSession(getPlayerSession())}
      />

      {/* Global Onboarding & Tactician Enlistment Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onComplete={(u) => setSession(u)}
      />
    </div>
  );
};
