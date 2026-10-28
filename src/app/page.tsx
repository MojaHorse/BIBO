'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  Shield,
  Smartphone,
  ArrowRight,
  Crown,
  Play,
  Gamepad2,
  Users,
  Trophy,
  Calendar,
  Star,
  Menu,
  X,
  ChevronRight,
  Disc,
  Grid3X3,
  Check,
} from 'lucide-react';
import { BiboCatMascot, BiboLogo } from '@/components/brand/BiboLogo';
import { WaitlistModal } from '@/components/landing/WaitlistModal';
import { WatchHowItWorksModal } from '@/components/landing/WatchHowItWorksModal';
import { LandingBotPreview } from '@/components/landing/LandingBotPreview';

export default function LandingPage() {
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'games', 'how-it-works', 'about', 'waitlist'];
      const scrollPos = window.scrollY + 200;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e11] text-[#F8F1E5] font-sans antialiased selection:bg-[#FF173D] selection:text-white flex flex-col">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. NAVBAR
      ────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#070608]/85 border-b border-white/[0.06] transition-all">
        <div className="max-w-[1680px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logos/horizontal_logo_light.png"
              alt="BIBO"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            <a
              href="#home"
              className={`text-sm font-semibold transition relative py-1 ${
                activeSection === 'home'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Home
              {activeSection === 'home' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D]" />
              )}
            </a>
            <a
              href="#games"
              className={`text-sm font-semibold transition relative py-1 ${
                activeSection === 'games'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Games
              {activeSection === 'games' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D]" />
              )}
            </a>
            <a
              href="#about"
              className={`text-sm font-semibold transition relative py-1 ${
                activeSection === 'about'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              About
              {activeSection === 'about' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D]" />
              )}
            </a>
            <a
              href="#news"
              className={`text-sm font-semibold transition relative py-1 ${
                activeSection === 'news'
                  ? 'text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              News
              {activeSection === 'news' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D]" />
              )}
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white text-xs sm:text-sm font-black shadow-lg shadow-[#FF173D]/25 hover:shadow-[#FF173D]/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Play Now</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#121216] px-6 py-5 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-150">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold text-white py-1 flex items-center justify-between"
            >
              <span>Home</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </a>
            <a
              href="#games"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold text-zinc-300 py-1 flex items-center justify-between"
            >
              <span>Games</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold text-zinc-300 py-1 flex items-center justify-between"
            >
              <span>About</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </a>
            <a
              href="#news"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold text-zinc-300 py-1 flex items-center justify-between"
            >
              <span>News</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </a>
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/home"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-center font-bold text-sm text-white"
              >
                Launch Game Arena
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ──────────────────────────────────────────────────────────────────────────
            2. HERO SECTION (Full-Bleed Cinematic Background Image)
        ────────────────────────────────────────────────────────────────────────── */}
        <section
          id="home"
          className="relative min-h-[calc(100vh-80px)] flex items-center overflow-hidden bg-[#070608]"
        >
          {/* Full-Bleed Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/landing/hero-gameboard.png"
              alt="BIBO 3D Cat Mascot, Chess King, Checkers Disc, and Morabaraba Board"
              fetchPriority="high"
              className="w-full h-full object-cover object-[78%_center] lg:object-center select-none pointer-events-none"
            />
            {/* Responsive Gradient Overlays */}
            {/* Mobile / Tablet overlay: darker so left text remains 100% legible against mascot glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#070608]/90 via-[#070608]/75 to-[#070608]/90 lg:hidden pointer-events-none" />
            {/* Desktop overlay: smooth horizontal feathering into artwork on the right */}
            <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[#070608] via-[#070608]/75 via-48% to-transparent pointer-events-none" />
            {/* Bottom blend into the Classics section */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0e0e11] to-transparent pointer-events-none" />
          </div>

          <div className="relative z-10 max-w-[1680px] mx-auto px-6 sm:px-10 lg:px-16 w-full py-16 lg:py-24">
            {/* Left Content Column */}
            <div className="max-w-2xl lg:max-w-xl xl:max-w-2xl flex flex-col gap-6 sm:gap-7">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2">
                <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.25em] text-[#FF6A00] uppercase">
                  THINK. PLAY. TOGETHER.
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[80px] font-black text-white tracking-tight leading-[1.04] font-sora">
                Three classic games.{' '}
                <span className="bg-gradient-to-r from-[#FF6A00] via-[#FF4A1C] to-[#FF173D] bg-clip-text text-transparent block sm:inline">
                  One place to play.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg lg:text-xl text-zinc-300 leading-relaxed font-normal max-w-xl">
                Challenge friends, compete globally and be part of a growing community of players. Chess, Checkers and Morabaraba — all in one place.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => setWaitlistOpen(true)}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-extrabold text-base sm:text-lg flex items-center gap-2.5 shadow-xl shadow-[#FF173D]/25 hover:shadow-[#FF173D]/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                >
                  <span>Join Waitlist</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <a
                  href="#games"
                  className="px-8 py-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-white font-bold text-base sm:text-lg transition"
                >
                  Explore Games
                </a>
              </div>

              {/* Feature Micro-Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/[0.08]">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-300 font-medium">
                  <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Play with friends or new opponents</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-300 font-medium">
                  <Shield className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Fair play &amp; secure</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-300 font-medium">
                  <Smartphone className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Web based (Desktop, Tablet, Mobile)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────────────
            2.5. PLAYABLE BOT PREVIEW (Public instant access, zero guest persistence)
        ────────────────────────────────────────────────────────────────────────── */}
        <section id="preview" className="relative bg-[#070608] py-12 sm:py-16 px-4 sm:px-8 lg:px-16 border-t border-white/[0.06]">
          <div className="max-w-[1680px] mx-auto">
            <LandingBotPreview />
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────────────
            3. SECTION 2: THE CLASSICS (Warm Cream / Beige Background)
        ────────────────────────────────────────────────────────────────────────── */}
        <section id="games" className="relative bg-[#F4EFEA] text-[#171719] py-20 sm:py-28 lg:py-32">
          <div className="max-w-[1680px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              {/* Left Column: Heading & Exploration link */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FF6A00]">
                  THE CLASSICS
                </span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#171719] tracking-tight leading-[1.08] font-sora">
                  Three timeless games, reimagined.
                </h2>
                <p className="text-base sm:text-lg text-zinc-600 leading-relaxed font-normal">
                  From the strategy of chess to the mind games of checkers and the tactical depth of morabaraba — find your favourite, or try them all.
                </p>

                <div className="pt-2">
                  <Link
                    href="/home"
                    className="inline-flex items-center gap-2 text-base font-extrabold text-[#FF6A00] hover:text-[#FF173D] group transition"
                  >
                    <span>Explore all games</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              {/* Right 3 Cards Grid */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* 1. CHESS */}
                <div className="rounded-3xl bg-[#EFE8DE] border border-black/[0.04] p-3.5 flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="aspect-[4/3] rounded-2xl bg-black overflow-hidden relative">
                    <img
                      src="/landing/chess-king.png"
                      alt="Glossy White King Chess Piece"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3 pt-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#171719] mb-0.5">
                        <Crown className="w-4 h-4 fill-current text-[#171719]" />
                        <h3 className="text-lg font-black font-sora">Chess</h3>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">Strategy. Logic. Victory.</p>
                    </div>
                    <Link
                      href="/play/chess"
                      className="w-8 h-8 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shrink-0 hover:bg-[#FF173D] hover:scale-110 active:scale-95 transition shadow-sm"
                      aria-label="Play Chess"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* 2. CHECKERS */}
                <div className="rounded-3xl bg-[#EFE8DE] border border-black/[0.04] p-3.5 flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="aspect-[4/3] rounded-2xl bg-black overflow-hidden relative">
                    <img
                      src="/landing/checkers-board.png"
                      alt="Tactile Checkers Draughts Pieces"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3 pt-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#171719] mb-0.5">
                        <Disc className="w-4 h-4 fill-current text-[#171719]" />
                        <h3 className="text-lg font-black font-sora">Checkers</h3>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">Simple moves. Deep strategy.</p>
                    </div>
                    <Link
                      href="/play/checkers"
                      className="w-8 h-8 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shrink-0 hover:bg-[#FF173D] hover:scale-110 active:scale-95 transition shadow-sm"
                      aria-label="Play Checkers"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* 3. MORABARABA */}
                <div className="rounded-3xl bg-[#EFE8DE] border border-black/[0.04] p-3.5 flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="aspect-[4/3] rounded-2xl bg-black overflow-hidden relative">
                    <img
                      src="/landing/morabaraba-board.png"
                      alt="African Morabaraba Board Game"
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3 pt-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[#171719] mb-0.5">
                        <Grid3X3 className="w-4 h-4 text-[#171719]" />
                        <h3 className="text-lg font-black font-sora">Morabaraba</h3>
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">Think ahead. Make a mill.</p>
                    </div>
                    <Link
                      href="/play/morabaraba"
                      className="w-7 h-7 rounded-full bg-[#FF6A00] text-white flex items-center justify-center shrink-0 hover:bg-[#FF173D] hover:scale-110 active:scale-95 transition shadow-sm"
                      aria-label="Play Morabaraba"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────────────
            4. SECTION 3: HOW IT WORKS (Dark Background)
        ────────────────────────────────────────────────────────────────────────── */}
        <section id="how-it-works" className="relative bg-[#0e0e11] text-[#F8F1E5] py-20 sm:py-28 lg:py-32 border-t border-white/[0.06]">
          <div className="max-w-[1680px] mx-auto px-6 sm:px-10 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column: Heading, Intro & Watch trigger */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FF6A00]">
                  HOW IT WORKS
                </span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] font-sora">
                  Get playing in three easy steps.
                </h2>
                <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
                  It&apos;s simple. Choose a game, find an opponent, and start playing.
                </p>

                <div className="pt-2">
                  <button
                    onClick={() => setHowItWorksOpen(true)}
                    className="inline-flex items-center gap-2.5 text-base font-extrabold text-[#FF6A00] hover:text-[#FF173D] transition cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full border border-[#FF6A00] flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                    <span>Watch how it works</span>
                  </button>
                </div>
              </div>

              {/* Right Steps (1, 2, 3 with connecting indicators) */}
              <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 relative">
                {/* Step 1 */}
                <div className="flex-1 flex flex-col items-center text-center p-8 rounded-3xl bg-[#141417] border border-white/[0.06] hover:border-white/[0.12] transition-all w-full group">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white flex items-center justify-center text-xs font-black font-mono shadow-md mb-4">
                    1
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[#FF6A00] mb-3 group-hover:scale-110 transition-transform">
                    <Gamepad2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-black text-white font-sora mb-1">Choose a game</h4>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Pick from Chess, Checkers or Morabaraba.
                  </p>
                </div>

                {/* Arrow Divider 1 */}
                <div className="hidden sm:block text-zinc-600 font-bold">
                  <ArrowRight className="w-6 h-6 text-zinc-500" />
                </div>

                {/* Step 2 */}
                <div className="flex-1 flex flex-col items-center text-center p-8 rounded-3xl bg-[#141417] border border-white/[0.06] hover:border-white/[0.12] transition-all w-full group">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white flex items-center justify-center text-xs font-black font-mono shadow-md mb-4">
                    2
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[#FF6A00] mb-3 group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-black text-white font-sora mb-1">Find an opponent</h4>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Play with friends or get matched instantly.
                  </p>
                </div>

                {/* Arrow Divider 2 */}
                <div className="hidden sm:block text-zinc-600 font-bold">
                  <ArrowRight className="w-6 h-6 text-zinc-500" />
                </div>

                {/* Step 3 */}
                <div className="flex-1 flex flex-col items-center text-center p-8 rounded-3xl bg-[#141417] border border-white/[0.06] hover:border-white/[0.12] transition-all w-full group">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white flex items-center justify-center text-xs font-black font-mono shadow-md mb-4">
                    3
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[#FF6A00] mb-3 group-hover:scale-110 transition-transform">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <h4 className="text-lg font-black text-white font-sora mb-1">Start playing</h4>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Make your move and show what you&apos;ve got.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────────────
            5. SECTION 4: COMMUNITY (Split 50/50 Banner)
        ────────────────────────────────────────────────────────────────────────── */}
        <section id="about" className="relative w-full overflow-hidden border-t border-b border-white/[0.06]">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Half: Warm Ambient Player Photo with Cursive Script Overlay */}
            <div className="relative min-h-[440px] sm:min-h-[540px] lg:min-h-[640px] xl:min-h-[700px] bg-zinc-900 overflow-hidden flex items-start">
              <img
                src="/landing/community-laptop.png"
                alt="Play Together. Grow Together."
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-left sm:object-center filter brightness-95"
              />
            </div>

            {/* Right Half: Community Features on Warm Cream/Sand Background */}
            <div className="bg-[#F4EFEA] text-[#171719] p-8 sm:p-14 lg:p-20 xl:p-24 flex flex-col justify-center gap-7">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FF6A00]">
                  MORE THAN JUST GAMES
                </span>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#171719] tracking-tight leading-[1.08] font-sora mt-2">
                  A community of thinkers, not just players.
                </h2>
                <p className="text-base sm:text-lg text-zinc-700 leading-relaxed mt-4 font-normal max-w-xl">
                  Connect with friends, join tournaments, climb the leaderboards and be part of a community that loves classic games as much as you do.
                </p>
              </div>

              {/* 4 Feature Points with Icons */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-6 pt-2">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-[#FF6A00] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-[#171719]">
                    Friends &amp; Invitations
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-[#FF6A00] shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-[#171719]">
                    Leaderboards
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-[#FF6A00] shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-[#171719]">
                    Tournaments
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-[#FF6A00] shrink-0">
                    <Star className="w-5 h-5" />
                  </div>
                  <span className="text-sm sm:text-base font-bold text-[#171719]">
                    Achievements
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────────────────────
            6. SECTION 5: FINAL CTA / WAITLIST BANNER
        ────────────────────────────────────────────────────────────────────────── */}
        <section id="waitlist" className="relative py-28 sm:py-36 lg:py-44 bg-[#0a0a0c] overflow-hidden text-center flex items-center justify-center">
          {/* Left Flank (Chess pieces on dark board) */}
          <div className="absolute left-0 top-0 bottom-0 w-1/3 max-w-md pointer-events-none opacity-60 hidden md:block">
            <img
              src="/landing/cta-left-flank.jpg"
              alt=""
              loading="lazy"
              className="w-full h-full object-cover object-left"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0a0a0c]/80 to-[#0a0a0c]" />
          </div>

          {/* Right Flank (Morabaraba pieces) */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 max-w-md pointer-events-none opacity-60 hidden md:block">
            <img
              src="/landing/cta-right-flank.jpg"
              alt=""
              loading="lazy"
              className="w-full h-full object-cover object-right"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0a0a0c]/80 to-[#0a0a0c]" />
          </div>

          {/* Center Ambient Radial Glow */}
          <div className="absolute inset-0 bg-radial from-[#FF6A00]/15 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto px-6 flex flex-col items-center gap-6">
            {/* BIBO Mascot + Logo */}
            <div className="flex items-center justify-center">
              <img
                src="/logos/horizontal_logo_light.png"
                alt="BIBO"
                className="h-10 sm:h-14 w-auto object-contain drop-shadow-[0_0_24px_rgba(255,106,0,0.45)]"
              />
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight font-sora">
              Ready to make your move?
            </h2>

            {/* Join Waitlist Button */}
            <div className="pt-2">
              <button
                onClick={() => setWaitlistOpen(true)}
                className="px-9 py-4 rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-2xl shadow-[#FF173D]/30 hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <span>Join Waitlist</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm sm:text-base text-zinc-400 font-medium">
              Be the first to know when BIBO launches.
            </p>
          </div>
        </section>
      </main>

      {/* ──────────────────────────────────────────────────────────────────────────
          7. FOOTER
      ────────────────────────────────────────────────────────────────────────── */}
      <footer id="news" className="bg-[#070709] border-t border-white/[0.06] text-zinc-400 py-14">
        <div className="max-w-[1680px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col gap-10">
          {/* Top Row: Logo, Links, Socials */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logos/horizontal_logo_light.png"
                alt="BIBO"
                className="h-8 w-auto object-contain"
              />
            </Link>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-semibold text-zinc-400">
              <a href="#home" className="hover:text-white transition">Home</a>
              <a href="#games" className="hover:text-white transition">Games</a>
              <a href="#about" className="hover:text-white transition">About</a>
              <a href="#news" className="hover:text-white transition">News</a>
              <a href="mailto:contact@bibo.gg" className="hover:text-white transition">Contact</a>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4 text-zinc-400">
              {/* X / Twitter */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center hover:text-white transition"
                aria-label="Twitter / X"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center hover:text-white transition"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center hover:text-white transition"
                aria-label="YouTube"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>

              {/* Discord */}
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center hover:text-white transition"
                aria-label="Discord"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Bottom Row: Copyright & Legal */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.06] text-xs sm:text-sm text-zinc-500">
            <span>&copy; 2026 BIBO. All rights reserved.</span>
            <div className="flex items-center gap-8">
              <a href="#" className="hover:text-zinc-300 transition">Privacy</a>
              <a href="#" className="hover:text-zinc-300 transition">Terms</a>
              <a href="#" className="hover:text-zinc-300 transition">Help</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODALS
      ────────────────────────────────────────────────────────────────────────── */}
      <WaitlistModal
        isOpen={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
      />

      <WatchHowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />
    </div>
  );
}
