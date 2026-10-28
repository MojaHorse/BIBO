'use client';

import React, { useState } from 'react';
import { X, Play, ArrowRight, Gamepad2, Users, Trophy, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface WatchHowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WatchHowItWorksModal: React.FC<WatchHowItWorksModalProps> = ({ isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      num: '1',
      title: 'Choose Your Strategy Game',
      desc: 'Select from three timeless intellectual disciplines: Grandmaster Chess with Stockfish AI coach, 8x8 Draughts / Checkers, or traditional 24-point Morabaraba.',
      icon: Gamepad2,
      previewBg: 'from-amber-600/30 to-red-600/20',
      actionLabel: 'Browse Disciplines',
      highlight: 'Chess · Checkers · Morabaraba',
    },
    {
      num: '2',
      title: 'Get Matched Instantly',
      desc: 'Challenge a friend with a single instant invite link or enter the global queue to find an opponent matched directly to your Elo rating bracket.',
      icon: Users,
      previewBg: 'from-[#FF6A00]/30 to-[#FF173D]/20',
      actionLabel: 'Matchmaking Demo',
      highlight: 'Sub-second real-time sync & fair play',
    },
    {
      num: '3',
      title: 'Play, Analyse & Rise Up the Ranks',
      desc: 'Make your moves with tactile precision. Use in-game coach analysis, track your move accuracy, and climb the seasonal regional leaderboards.',
      icon: Trophy,
      previewBg: 'from-purple-600/30 to-pink-600/20',
      actionLabel: 'Enter Arena',
      highlight: 'Global leaderboards & XP progression',
    },
  ];

  const current = steps[activeStep];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-3xl bg-[#17171a] border border-white/10 p-6 sm:p-8 shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition z-10"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-6">
          {/* Header */}
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF6A00]">
              How BIBO Works
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white font-sora mt-1">
              From Opening Move to Victory
            </h3>
          </div>

          {/* Step Selector Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-black/40 border border-white/5">
            {steps.map((s, idx) => (
              <button
                key={s.num}
                onClick={() => setActiveStep(idx)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                  activeStep === idx
                    ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-mono">
                  {s.num}
                </span>
                <span className="truncate hidden sm:inline">{s.title.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Step Detail Card */}
          <div className={`p-6 sm:p-8 rounded-2xl bg-gradient-to-br ${current.previewBg} border border-white/10 relative overflow-hidden flex flex-col gap-4 min-h-[220px] justify-between`}>
            <div className="flex items-start justify-between gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-[#FF6A00] shrink-0">
                <StepIcon className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] font-mono font-bold text-zinc-300">
                Step {current.num} of 3
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-xl font-black text-white font-sora">
                {current.title}
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {current.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 text-xs font-bold text-white/90">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>{current.highlight}</span>
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`h-2 rounded-full transition-all ${
                    activeStep === idx ? 'w-8 bg-[#FF6A00]' : 'w-2 bg-white/20'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {activeStep < 2 ? (
                <button
                  onClick={() => setActiveStep((prev) => Math.min(2, prev + 1))}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 transition"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/play"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:brightness-110 transition"
                >
                  <span>Play Live Now</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
