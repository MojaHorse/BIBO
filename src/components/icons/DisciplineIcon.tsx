'use client';

import React from 'react';
import { Swords, Crown, Shield, Target } from 'lucide-react';

export type DisciplineType = 'chess' | 'checkers' | 'morabaraba' | 'puzzles' | string;

interface DisciplineIconProps {
  gameId: DisciplineType;
  className?: string;
  size?: number;
}

export const DisciplineIcon: React.FC<DisciplineIconProps> = ({
  gameId,
  className = '',
  size = 20,
}) => {
  const norm = gameId?.toLowerCase();

  switch (norm) {
    case 'chess':
      return <Swords size={size} className={`text-[#FF6A00] shrink-0 ${className}`} />;
    case 'checkers':
      return <Crown size={size} className={`text-amber-400 shrink-0 ${className}`} />;
    case 'morabaraba':
      return <Shield size={size} className={`text-[#FF173D] shrink-0 ${className}`} />;
    case 'puzzles':
      return <Target size={size} className={`text-[#38bdf8] shrink-0 ${className}`} />;
    default:
      return <Swords size={size} className={`text-zinc-400 shrink-0 ${className}`} />;
  }
};
