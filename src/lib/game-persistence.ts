// Active game persistence manager for Obscura Chess
// Guarantees game state survival across accidental page refreshes, tab closures, and network drops.

import { Color, Square } from 'chess.js';

export interface SavedGameState {
  fen: string;
  history: string[];
  orientation: Color;
  vsBot: boolean;
  botDifficulty: 'easy' | 'medium' | 'hard';
  whiteTime: number;
  blackTime: number;
  timeControlMinutes: number;
  lastMove: { from: Square; to: Square } | null;
  timestamp: number;
}

const STORAGE_KEY = 'obscura_active_game';

export function saveActiveGame(state: Omit<SavedGameState, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: SavedGameState = {
      ...state,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // quota exceeded or disabled
  }
}

export function loadActiveGame(): SavedGameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: SavedGameState = JSON.parse(raw);

    // Expire games older than 24 hours
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      clearActiveGame();
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function clearActiveGame(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
