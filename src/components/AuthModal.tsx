'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { getPlayerSession } from '@/lib/session';
import { migrateVaultGuestMatches } from '@/lib/match-vault';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; handle: string; email: string; blitzRating: number; xp?: number }) => void;
  initialTab?: 'signin' | 'register';
  onOpenOnboarding?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'signin',
  onOpenOnboarding,
}) => {
  const [tab, setTab] = useState<'signin' | 'register'>(initialTab);
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const session = getPlayerSession();

  const handleGoogleAuth = () => {
    window.location.href = '/api/auth/google';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const endpoint = tab === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const body =
        tab === 'signin'
          ? { identifier: handle || email, password }
          : {
              handle,
              email,
              password,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save authenticated user
      localStorage.setItem('obscura_user', JSON.stringify(data.user));

      setSubmitted(true);

      setTimeout(() => {
        onSuccess(data.user);
        onClose();
        setSubmitted(false);
      }, 700);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Authentication error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div
        className="relative w-full sm:max-w-md bg-[#16171b] border-t sm:border border-white/[0.08] rounded-t-3xl sm:rounded-2xl text-zinc-100 p-5 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pb-2 pt-0.5">
          <div className="w-10 h-1 bg-zinc-600/60 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Supabase Auth Indicator */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
            <span className="font-mono text-[10px] uppercase text-zinc-300 font-bold tracking-wider flex items-center gap-1">
              <span>Supabase Auth</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#00e599] bg-[#00e599]/10 px-1.5 py-0.5 rounded border border-[#00e599]/20 font-bold">
            supabase_auth
          </span>
        </div>

        {/* Modal Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-tight text-white">
            {tab === 'signin' ? 'Sign into BIBO' : 'Create Tactician Account'}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Database-native authentication powered by Supabase Auth.
          </p>
        </div>

        {/* Google Human Verification CTA */}
        <div className="flex flex-col gap-2 mb-4">
          <button
            type="button"
            onClick={handleGoogleAuth}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-Bot Verification · Real Humans Only</span>
          </div>
        </div>

        <div className="relative flex py-1 items-center mb-3">
          <div className="flex-grow border-t border-white/[0.06]"></div>
          <span className="flex-shrink mx-2 font-mono text-[9px] uppercase text-zinc-500 tracking-wider">
            OR WITH PASSCODE
          </span>
          <div className="flex-grow border-t border-white/[0.06]"></div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/[0.06] mb-4 font-mono text-xs uppercase tracking-wider">
          <button
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            className={`pb-2 px-3 border-b-2 font-bold transition ${
              tab === 'signin'
                ? 'border-[#22c55e] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
            className={`pb-2 px-3 border-b-2 font-bold transition ${
              tab === 'register'
                ? 'border-[#22c55e] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 bg-[#e60012]/15 border border-[#e60012]/30 text-red-200 text-xs rounded-xl flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 text-[#ff4d5a] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#22c55e] text-black flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Authenticated</h3>
            <p className="font-mono text-xs text-zinc-400">Loading tactician profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-2.5">
              {tab === 'register' ? (
                <>
                  {onOpenOnboarding && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenOnboarding();
                      }}
                      className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-[#00e599]/10 to-transparent border border-[#00e599]/30 hover:border-[#00e599]/70 text-left transition flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white group-hover:text-[#00e599] transition">
                          <Sparkles className="w-3.5 h-3.5 text-[#00e599]" />
                          <span>Full Tactician Onboarding Wizard</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Pick custom handle, insignia piece, and calibrate starting ELO.
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#00e599] shrink-0 transform group-hover:translate-x-0.5 transition" />
                    </button>
                  )}

                  {session.xp > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#ffcc00]/10 border border-[#ffcc00]/20 flex items-center gap-2 text-[11px] font-mono text-[#ffcc00]">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#ffcc00]" />
                      <span>Preserving {session.xp.toLocaleString()} XP and match logs from your guest session.</span>
                    </div>
                  )}
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-1">
                      Tactician Handle
                    </label>
                    <input
                      type="text"
                      required
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="e.g. Kasparov_42"
                      className="w-full bg-[#111215] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full bg-[#111215] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-1">
                    Handle or Email
                  </label>
                  <input
                    type="text"
                    required
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="Handle or Email"
                    className="w-full bg-[#111215] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition"
                  />
                </div>
              )}

              <div>
                <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-1">
                  Passcode
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#111215] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-2 rounded-xl btn-primary-red text-white font-bold text-xs disabled:opacity-50 transition flex items-center justify-center gap-1.5"
              >
                <span>{loading ? 'Authenticating...' : tab === 'signin' ? 'Sign In' : 'Create Profile'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
