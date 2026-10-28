'use client';

import { useState, useEffect } from 'react';
import { GameId } from './games/types';

export const ACTIVE_MATCH_EVENT = 'bibo_active_match_updated';
const ACTIVE_MATCH_KEY = 'bibo_active_match_session';

export interface ActiveMatchSession {
  gameId: GameId;
  roomId?: string;
  isOnline: boolean;
  role?: 'w' | 'b' | 'spectator';
  opponentHandle: string;
  opponentRating?: number;
  timeControlMinutes: number;
  url: string;
  startedAt: number;
  lastActiveAt: number;
}

export function setActiveMatch(session: Omit<ActiveMatchSession, 'lastActiveAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: ActiveMatchSession = {
      ...session,
      lastActiveAt: Date.now(),
    };
    localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(ACTIVE_MATCH_EVENT, { detail: payload }));
  } catch {
    // ignore
  }
}

export function getActiveMatch(): ActiveMatchSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (!raw) return null;
    const match: ActiveMatchSession = JSON.parse(raw);

    // Expire active matches older than 15 minutes
    if (Date.now() - match.lastActiveAt > 15 * 60 * 1000) {
      clearActiveMatch();
      return null;
    }

    return match;
  } catch {
    return null;
  }
}

export function clearActiveMatch(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_MATCH_KEY);
    window.dispatchEvent(new CustomEvent(ACTIVE_MATCH_EVENT, { detail: null }));
  } catch {
    // ignore
  }
}

export function useActiveMatch() {
  const [activeMatch, setActiveMatchState] = useState<ActiveMatchSession | null>(null);

  useEffect(() => {
    setActiveMatchState(getActiveMatch());

    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ActiveMatchSession | null>;
      setActiveMatchState(custom.detail);
    };

    window.addEventListener(ACTIVE_MATCH_EVENT, handleUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === ACTIVE_MATCH_KEY) {
        setActiveMatchState(getActiveMatch());
      }
    });

    return () => {
      window.removeEventListener(ACTIVE_MATCH_EVENT, handleUpdate);
    };
  }, []);

  return {
    activeMatch,
    clearActiveMatch,
  };
}
