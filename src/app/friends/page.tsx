'use client';

import React from 'react';
import { LockedArenaView } from '@/components/LockedArenaView';

export default function FriendsPage() {
  return (
    <LockedArenaView
      title="Social Hub Locked"
      discipline="Tactician Network"
      reason="Friend lobbies, tactical duels, and live presence are temporarily locked while multiplayer social infrastructure is upgraded."
      recommendedHref="/play/chess"
      recommendedLabel="Enter Chess Arena"
      secondaryHref="/play/morabaraba"
      secondaryLabel="Play Morabaraba"
    />
  );
}
