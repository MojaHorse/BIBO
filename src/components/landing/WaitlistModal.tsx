'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, Gamepad2, Smartphone, Monitor } from 'lucide-react';
import { BiboCatMascot, BiboLogo } from '@/components/brand/BiboLogo';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [preferredGame, setPreferredGame] = useState<'chess' | 'checkers' | 'morabaraba' | 'all'>('all');
  const [device, setDevice] = useState<'mobile' | 'desktop' | 'both'>('both');
  const [submitted, setSubmitted] = useState(false);
  const [queueNumber, setQueueNumber] = useState(1428);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    // Persist waitlist signups in localStorage for local demo
    try {
      const waitlist = JSON.parse(localStorage.getItem('bibo_waitlist') || '[]');
      const newEntry = {
        name,
        email,
        preferredGame,
        device,
        timestamp: new Date().toISOString(),
      };
      waitlist.push(newEntry);
      localStorage.setItem('bibo_waitlist', JSON.stringify(waitlist));
      setQueueNumber(1420 + waitlist.length);
    } catch {
      // fallback
    }

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#17171a] border border-white/10 p-6 sm:p-8 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 bg-gradient-to-b from-[#FF6A00]/25 to-transparent blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#FF6A00] to-[#FF173D] flex items-center justify-center shadow-lg shadow-[#FF173D]/30 animate-bounce">
              <CheckCircle2 className="w-9 h-9 text-white" />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FF6A00]">
                You are on the list!
              </span>
              <h3 className="text-2xl font-black text-white font-sora">
                Welcome to the BIBO Vanguard
              </h3>
              <p className="text-sm text-zinc-300 max-w-sm mt-1">
                Thanks {name || 'Player'}! We saved your spot. You are queue member:
              </p>
            </div>

            <div className="px-5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-medium">Waitlist Position:</span>
              <span className="text-xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] to-[#FF173D]">
                #{queueNumber.toLocaleString()}
              </span>
            </div>

            <div className="w-full pt-4 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="/play"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition"
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Test Web Alpha Now</span>
              </a>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <img
                src="/logos/horizontal_logo_light.png"
                alt="BIBO"
                className="h-8 w-auto object-contain"
              />
              <span className="text-[10px] font-bold text-[#FF6A00] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-[#FF6A00]/10 border border-[#FF6A00]/20">
                Early Access
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Be the first to access our upcoming cross-platform release with matchmaking, verified ratings, and African strategy tournaments.
            </p>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Ndlovu"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6A00] text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                  Email Address <span className="text-[#FF173D]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF6A00] text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                  Favorite Game
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: 'All 3' },
                    { id: 'chess', label: 'Chess' },
                    { id: 'checkers', label: 'Checkers' },
                    { id: 'morabaraba', label: 'Morabaraba' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setPreferredGame(g.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                        preferredGame === g.id
                          ? 'bg-[#FF6A00]/20 border-[#FF6A00] text-white'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider block mb-1.5">
                  Preferred Device
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mobile', label: 'Mobile', icon: Smartphone },
                    { id: 'desktop', label: 'Desktop', icon: Monitor },
                    { id: 'both', label: 'Both', icon: Sparkles },
                  ].map((d) => {
                    const Icon = d.icon;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDevice(d.id as any)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                          device === d.id
                            ? 'bg-[#FF6A00]/20 border-[#FF6A00] text-white'
                            : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF173D]/25 hover:shadow-[#FF173D]/40 hover:brightness-110 active:scale-[0.99] transition"
              >
                <span>Join Waitlist</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
              <span>No spam. Instant notification when early beta expands.</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
