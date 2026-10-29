'use client';

import React from 'react';
import { LockedArenaView } from '@/components/LockedArenaView';

export default function PuzzlesPage() {
  return (
    <LockedArenaView
      title="Puzzles Arena Locked"
      discipline="Tactical Puzzles"
      reason="The tactical puzzle trainer, daily challenges, and rush modes are temporarily locked while puzzle datasets and ratings undergo recalibration."
      recommendedHref="/play/chess"
      recommendedLabel="Enter Chess Arena"
      secondaryHref="/play/morabaraba"
      secondaryLabel="Play Morabaraba"
    />
  );
}
