'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, User, Mail } from 'lucide-react';
import { BiboCatMascot, BiboFullLogo } from '@/components/brand/BiboLogo';
import { savePlayerSession } from '@/lib/session';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim() || handle.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: handle.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      savePlayerSession({
        id: data.user.id,
        handle: data.user.handle,
        displayName: data.user.displayName || data.user.handle,
        email: data.user.email,
        rating: data.user.blitzRating || 1200,
        xp: 100,
        isVerifiedHuman: false,
        onboarded: true,
      });

      router.push(redirectTarget);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try a different username or email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#171719] text-[#F8F1E5] flex flex-col justify-center items-center p-4 selection:bg-[#FF6A00] selection:text-white">
      {/* Background glow */}
      <div className="fixed inset-0 bg-radial from-[#FF6A00]/10 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center gap-6 relative z-10">
        {/* Official Brand Logo */}
        <Link href="/" className="flex flex-col items-center group">
          <BiboFullLogo size={140} glow className="group-hover:scale-105 transition-transform" />
        </Link>

        <div className="w-full rounded-3xl bg-[#222226] border border-white/[0.08] p-6 sm:p-8 flex flex-col gap-5 shadow-2xl">
          <div className="text-center flex flex-col gap-1">
            <h1 className="text-xl font-black text-white">Join BIBO Arena</h1>
            <p className="text-xs text-zinc-400 font-medium">
              Create your player profile & start competing
            </p>
          </div>

          {error && (
            <div className="px-3.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Tactician Handle
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#171719] border border-white/[0.08] focus-within:border-[#FF6A00] transition">
                <User className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="e.g. TacticianPrime"
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Email
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#171719] border border-white/[0.08] focus-within:border-[#FF6A00] transition">
                <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tactician@arena.com"
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Password
              </label>
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#171719] border border-white/[0.08] focus-within:border-[#FF6A00] transition">
                <Lock className="w-4 h-4 text-zinc-500 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 w-full"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl btn-bibo-primary text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {loading ? <span>Creating Account...</span> : <span>Create Account</span>}
            </button>
          </form>

          <div className="flex items-center gap-3 my-0.5">
            <span className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">or</span>
            <span className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Alternative Auth Actions */}
          <div className="flex flex-col gap-2">
            <a
              href="/api/auth/google"
              className="w-full py-2.5 px-4 rounded-xl bg-[#171719] hover:bg-[#1d1d21] border border-white/[0.08] text-xs font-bold text-zinc-200 transition flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </a>
          </div>

          <p className="text-center text-xs text-zinc-400 mt-1">
            Already have an account?{' '}
            <Link href={redirectTarget !== '/' ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : '/login'} className="font-bold text-[#FF6A00] hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#171719]" />}>
      <SignUpContent />
    </Suspense>
  );
}
