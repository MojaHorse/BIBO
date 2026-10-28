'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { BiboCatMascot } from '@/components/brand/BiboLogo';

export default function OnboardingPage() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      title: 'Classic games. Modern play.',
      description: 'Chess, checkers and morabaraba — all in one place.',
    },
    {
      title: 'Think ahead. Challenge friends.',
      description: 'Create private rooms with instant codes or compete in global matchmaking.',
    },
    {
      title: 'Climb the leagues. Master the board.',
      description: 'Gain Tactical XP, unlock insignia tiers, and analyze matches with AI engine feedback.',
    },
  ];

  const handleNext = () => {
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#171719] text-[#F8F1E5] flex flex-col justify-between items-center p-6 sm:p-10 relative overflow-hidden select-none font-sans">
      {/* Background glow radial */}
      <div className="fixed inset-0 bg-radial from-[#FF6A00]/15 via-transparent to-transparent pointer-events-none" />

      {/* Top Header: Skip */}
      <header className="w-full max-w-sm flex items-center justify-between z-10">
        <div className="w-8" />
        <Link
          href="/"
          className="text-xs font-bold text-zinc-400 hover:text-white transition cursor-pointer"
        >
          Skip
        </Link>
      </header>

      {/* Center Hero Mascot & Headline */}
      <div className="flex flex-col items-center text-center gap-6 max-w-sm z-10 my-auto">
        <div className="relative">
          <div className="absolute -inset-4 bg-radial from-[#FF173D]/30 to-transparent blur-xl pointer-events-none" />
          <BiboCatMascot size={140} glow />
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {slides[slide].title}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed px-4">
            {slides[slide].description}
          </p>
        </div>

        {/* 3 Pagination Dots */}
        <div className="flex items-center gap-2 mt-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                slide === idx ? 'w-6 bg-[#FF6A00]' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom CTA Button */}
      <div className="w-full max-w-sm flex flex-col gap-3 z-10">
        <button
          onClick={handleNext}
          className="w-full py-3.5 px-6 rounded-2xl btn-bibo-primary text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-98 transition"
        >
          <span>{slide === slides.length - 1 ? 'Get Started' : 'Continue'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[11px] text-zinc-500 font-medium">
          THINK. PLAY. TOGETHER.
        </p>
      </div>
    </div>
  );
}