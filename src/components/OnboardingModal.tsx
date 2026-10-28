'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  ShieldCheck,
  Swords,
  Target,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Crown,
  Zap,
  Compass,
  Award,
} from 'lucide-react';
import { getPlayerSession, PlayerSession, savePlayerSession } from '@/lib/session';
import { PIECE_INSIGNIAS } from '@/lib/insignias';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (user: PlayerSession) => void;
  initialHandle?: string;
  isExistingUser?: boolean;
}

const PLAY_STYLES = [
  {
    id: 'Tactical Attacker',
    label: 'Tactical Attacker',
    icon: Swords,
    desc: 'Aggressive piece sacrifices, open lines, and decisive king attacks.',
  },
  {
    id: 'Positional Strategist',
    label: 'Positional Strategist',
    icon: Compass,
    desc: 'Pawn structure mastery, prophylactic defense, and endgame squeezes.',
  },
  {
    id: 'Speed Blitzkrieg',
    label: 'Speed Blitzkrieg',
    icon: Zap,
    desc: 'Fast instinctual moves, dynamic scrambles, and time-pressure flagger.',
  },
  {
    id: 'Deep Calculator',
    label: 'Deep Calculator',
    icon: Target,
    desc: 'Exhaustive tactical verification, concrete variations, high accuracy.',
  },
];

const SKILL_TIERS = [
  {
    rating: 800,
    title: 'Cadet (800 ELO)',
    desc: 'Learning core tactical motifs, openings, and fundamental coordination.',
  },
  {
    rating: 1200,
    title: 'Operator (1200 ELO)',
    desc: 'Standard competitive club player, comfortable in rapid and blitz.',
  },
  {
    rating: 1500,
    title: 'Vanguard (1500 ELO)',
    desc: 'Experienced tournament player with solid positional and tactical depth.',
  },
  {
    rating: 1800,
    title: 'Sovereign (1800+ ELO)',
    desc: 'Master candidate with advanced opening theory and endgame technique.',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialHandle = '',
  isExistingUser = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [handle, setHandle] = useState<string>(initialHandle || '');
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedPiece, setSelectedPiece] = useState<string>('knight');
  const [selectedStyle, setSelectedStyle] = useState<string>('Tactical Attacker');
  const [selectedRating, setSelectedRating] = useState<number>(1200);

  // Handle validation state
  const [checkingHandle, setCheckingHandle] = useState<boolean>(false);
  const [handleValid, setHandleValid] = useState<boolean | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [session, setSession] = useState<PlayerSession | null>(null);

  // Initialize fields once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const s = getPlayerSession();
    setSession(s);
    if (s.handle) {
      setHandle(s.handle);
    }
    if (s.displayName) {
      setDisplayName(s.displayName);
    }
    if (s.email && !email) {
      setEmail(s.email);
    }
    if (s.avatar) {
      setSelectedPiece(s.avatar);
    }
    if (s.playStyle) {
      setSelectedStyle(s.playStyle);
    }
    if (s.rating) {
      setSelectedRating(s.rating);
    }
  }, [isOpen]);

  // Debounced live handle check
  useEffect(() => {
    if (!handle || handle.length < 3) {
      setHandleValid(null);
      setHandleError(null);
      setSuggestions([]);
      return;
    }

    const currentHandle = session?.handle;
    // Current user's own handle is always valid and available
    if (currentHandle && handle.toLowerCase() === currentHandle.toLowerCase()) {
      setHandleValid(true);
      setHandleError(null);
      setSuggestions([]);
      setCheckingHandle(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingHandle(true);
      try {
        const uidParam = session?.id ? `&userId=${encodeURIComponent(session.id)}` : '';
        const curParam = currentHandle ? `&currentHandle=${encodeURIComponent(currentHandle)}` : '';
        const res = await fetch(`/api/auth/check-handle?handle=${encodeURIComponent(handle)}${uidParam}${curParam}`);
        const data = await res.json();
        if (data.valid && data.available) {
          setHandleValid(true);
          setHandleError(null);
          setSuggestions([]);
        } else {
          setHandleValid(false);
          setHandleError(data.error || 'Handle is unavailable');
          setSuggestions(data.suggestions || []);
        }
      } catch {
        setHandleValid(null);
      } finally {
        setCheckingHandle(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [handle, session]);

  if (!isOpen) return null;

  const currentPiece = PIECE_INSIGNIAS.find((p) => p.id === selectedPiece) || PIECE_INSIGNIAS[0];

  const handleFinish = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          displayName: displayName || handle,
          avatar: selectedPiece,
          playStyle: selectedStyle,
          initialRating: selectedRating,
          email: !isExistingUser && !session?.email ? email : undefined,
          password: !isExistingUser && !session?.email ? password : undefined,
          guestId: session?.id,
          guestXp: session?.xp || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Update local storage session
      const updated: PlayerSession = {
        id: data.user.id,
        handle: data.user.handle,
        displayName: data.user.displayName,
        avatar: data.user.avatar,
        playStyle: data.user.playStyle,
        email: data.user.email,
        rating: data.user.blitzRating || selectedRating,
        xp: data.user.xp || session?.xp || 0,
        isVerifiedHuman: Boolean(session?.isVerifiedHuman),
        onboarded: true,
        isAuthenticated: true,
      };

      savePlayerSession(updated);
      onComplete(updated);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to save profile');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in">
      <div
        className="relative w-full sm:max-w-xl bg-[#16171b] border-t sm:border border-white/[0.08] rounded-t-3xl sm:rounded-2xl text-zinc-100 p-4 sm:p-7 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pb-2 pt-0.5">
          <div className="w-10 h-1 bg-zinc-600/60 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition p-1"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Supabase Auth Badge & Stepper */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#00e599]">
              Tactician Enlistment Dossier
            </span>
          </div>

          {/* Stepper indicator */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className={`px-2 py-0.5 rounded ${step === 1 ? 'bg-[#00e599] text-black font-extrabold' : 'bg-white/5 text-zinc-500'}`}>
              1. Identity
            </span>
            <span className="text-zinc-600">·</span>
            <span className={`px-2 py-0.5 rounded ${step === 2 ? 'bg-[#00e599] text-black font-extrabold' : 'bg-white/5 text-zinc-500'}`}>
              2. Insignia
            </span>
            <span className="text-zinc-600">·</span>
            <span className={`px-2 py-0.5 rounded ${step === 3 ? 'bg-[#00e599] text-black font-extrabold' : 'bg-white/5 text-zinc-500'}`}>
              3. Calibrate
            </span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Tactician Handle & Names */}
          {step === 1 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Choose your Tactician Handle</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Your unique callsign for ranked matchmaking, match dispatches, and leaderboard honors.
                </p>
              </div>

              {/* Handle with live validation */}
              <div>
                <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-1">
                  Unique Handle (@username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 font-mono text-xs">
                    @
                  </div>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="Grandmaster_Alpha"
                    maxLength={20}
                    className={`w-full bg-[#111215] border rounded-xl pl-8 pr-10 py-2.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none transition ${
                      handleValid === true
                        ? 'border-[#00e599]/60 focus:border-[#00e599]'
                        : handleValid === false
                        ? 'border-red-500/60 focus:border-red-500'
                        : 'border-white/[0.08] focus:border-white/30'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {checkingHandle ? (
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    ) : handleValid === true ? (
                      <Check className="w-4 h-4 text-[#00e599]" />
                    ) : handleValid === false ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : null}
                  </div>
                </div>

                {handleValid === true && (
                  <p className="text-[10px] text-[#00e599] font-mono mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Handle is verified and available!
                  </p>
                )}

                {handleError && (
                  <p className="text-[10px] text-red-400 font-mono mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {handleError}
                  </p>
                )}

                {suggestions.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500 font-mono">Suggested:</span>
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setHandle(s)}
                        className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-[#00e599] border border-white/10 text-[10px] font-mono transition"
                      >
                        @{s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-1">
                  Tactician Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Commander Vance"
                  maxLength={30}
                  className="w-full bg-[#111215] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                />
              </div>

              {/* Email & Passcode if new unauthenticated user */}
              {!isExistingUser && !session?.email && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-1">
                      Account Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tactician@gmail.com"
                      required
                      className="w-full bg-[#111215] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-1">
                      Passcode (Min 6 chars)
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-[#111215] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition"
                    />
                  </div>
                </div>
              )}

              {/* Live Preview Card */}
              <div className="mt-1 p-3.5 rounded-xl bg-gradient-to-r from-[#1c1d22] to-[#16171b] border border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${currentPiece.color} flex items-center justify-center text-xl font-bold shadow-md border`}>
                    {currentPiece.symbol}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm">{displayName || handle || 'Tactician'}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                        VERIFIED
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">@{handle || 'handle'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-zinc-500">RATING</span>
                  <div className="text-sm font-bold font-mono text-[#00e599]">{selectedRating} ELO</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Piece Insignia & Playstyle */}
          {step === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Select your Insignia & Philosophy</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Choose the chess piece that best embodies your tactical battlefield approach.
                </p>
              </div>

              {/* Piece Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PIECE_INSIGNIAS.map((p) => {
                  const isSelected = selectedPiece === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPiece(p.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition cursor-pointer ${
                        isSelected
                          ? `bg-[#1c1d22] ${p.color} ring-1 ring-[#00e599]`
                          : 'bg-[#141518] border-white/[0.04] hover:bg-[#1a1b20] opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{p.symbol}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#00e599]" />}
                      </div>
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      <span className="text-[10px] text-zinc-400 leading-tight">{p.tagline}</span>
                    </button>
                  );
                })}
              </div>

              {/* Playstyle Selector */}
              <div>
                <label className="block font-mono text-[10px] uppercase text-zinc-400 mb-2">
                  Tactical Philosophy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PLAY_STYLES.map((st) => {
                    const isSelected = selectedStyle === st.id;
                    const Icon = st.icon;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStyle(st.id)}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.08] border-[#00e599]/60 text-white'
                            : 'bg-[#141518] border-white/[0.04] text-zinc-400 hover:text-white'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[#00e599]/20 text-[#00e599]' : 'bg-white/5 text-zinc-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate">{st.label}</span>
                          <span className="text-[10px] text-zinc-500 leading-tight mt-0.5">{st.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Skill Calibration & Final Briefing */}
          {step === 3 && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-200">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Calibrate Starting ELO Rating</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Calibrate your competitive matchmaking baseline to face appropriate tactical opponents.
                </p>
              </div>

              {/* Skill Tiers */}
              <div className="flex flex-col gap-2">
                {SKILL_TIERS.map((tier) => {
                  const isSelected = selectedRating === tier.rating;
                  return (
                    <button
                      key={tier.rating}
                      type="button"
                      onClick={() => setSelectedRating(tier.rating)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#1c1d22] border-[#00e599]/60 text-white'
                          : 'bg-[#141518] border-white/[0.04] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{tier.title}</span>
                          {isSelected && <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00e599]/20 text-[#00e599]">SELECTED</span>}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{tier.desc}</p>
                      </div>
                      <span className="text-sm font-mono font-bold text-[#00e599] shrink-0">{tier.rating}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dossier Summary Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#1b1d24] to-[#141519] border border-white/[0.08] flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase font-bold text-zinc-400">
                  Ready for Arena Commission
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{currentPiece.symbol}</span>
                    <div>
                      <div className="text-sm font-bold text-white">@{handle}</div>
                      <div className="text-xs text-zinc-400">{displayName || handle} · {selectedStyle}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-[#00e599]">{selectedRating} ELO</div>
                    <div className="text-[10px] font-mono text-zinc-500">BLITZ / RAPID</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="border-t border-white/[0.06] pt-4 mt-4 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              className="px-3.5 py-2 rounded-xl bg-[#1c1d22] hover:bg-[#23252c] text-zinc-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={step === 1 && (handleValid === false || handle.length < 3)}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="px-5 py-2 rounded-xl bg-[#00e599] hover:bg-[#00c584] text-black font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-[#00e599] hover:bg-[#00c584] text-black font-extrabold text-xs transition flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enlisting Dossier...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Complete Enlistment</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
