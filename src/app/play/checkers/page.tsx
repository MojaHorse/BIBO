'use client';

import React from 'react';
import { LockedArenaView } from '@/components/LockedArenaView';

export default function CheckersPage() {
  return (
    <LockedArenaView
      title="Checkers Arena Locked"
      discipline="American Checkers"
      reason="Checkers board interaction, jump validation, and multi-capture logic are undergoing engineering calibration and are temporarily locked."
      recommendedHref="/play/chess"
      recommendedLabel="Play Chess Arena"
      secondaryHref="/play/morabaraba"
      secondaryLabel="Play Morabaraba"
    />
  );
}
