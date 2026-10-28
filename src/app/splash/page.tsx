'use client';

import React from 'react';
import Link from 'next/link';
import { BiboCatMascot, BiboFullLogo } from '@/components/brand/BiboLogo';

export default function SplashScreen() {
  return (
    <Link
      href="/"
      className="min-h-screen w-full bg-gradient-to-br from-[#FF6A00] to-[#FF173D] text-white flex flex-col items-center justify-between p-8 select-none"
    >
      <div className="w-8" />

      <div className="flex flex-col items-center gap-3 text-center">
        <BiboFullLogo size={170} variant="white" glow className="drop-shadow-2xl" />
        <span className="text-[11px] font-extrabold tracking-widest text-white/90 uppercase font-mono">
          CHESS · CHECKERS · MORABARABA
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-bold tracking-widest text-white/80 font-mono">
          THINK. PLAY. TOGETHER.
        </span>
        <span className="text-[10px] text-white/60 animate-pulse font-mono">
          Tap anywhere to enter
        </span>
      </div>
    </Link>
  );
}