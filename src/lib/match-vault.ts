import { GameId } from './games/types';
import { getPlayerSession, savePlayerSession, PlayerSession } from './session';

// Resilient offline-first match archive vault & background synchronizer

export interface VaultMatch {
  id: string;
  gameId?: GameId;
  variant?: string;
  whiteId: string;
  blackId: string;
  whiteHandle: string;
  blackHandle: string;
  timeControl: string;
  winnerId: string | null;
  resultType: string;
  pgn: string;
  finalFen: string;
  rated: boolean;
  ratingDelta: number;
  synced: boolean;
  createdAt: string;
}

const VAULT_KEY = 'bibo_match_vault';
const LEGACY_VAULT_KEY = 'obscura_match_vault';

export function getLocalMatches(): VaultMatch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VAULT_KEY) || localStorage.getItem(LEGACY_VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMatchToVault(match: Omit<VaultMatch, 'synced'>): VaultMatch {
  const matches = getLocalMatches();
  const entry: VaultMatch = {
    ...match,
    synced: false,
  };

  // Avoid duplicates
  const filtered = matches.filter((m) => m.id !== match.id);
  const updated = [entry, ...filtered].slice(0, 100); // keep last 100

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
    } catch {
      // ignore quota
    }
  }

  // Attempt immediate background sync
  syncPendingMatches();

  return entry;
}

export async function syncPendingMatches(): Promise<void> {
  if (typeof window === 'undefined') return;
  const matches = getLocalMatches();
  const pending = matches.filter((m) => !m.synced);
  if (pending.length === 0) return;

  const session = getPlayerSession();

  for (const match of pending) {
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: match.gameId || 'chess',
          variant: match.variant || 'standard',
          whiteId: match.whiteId,
          blackId: match.blackId,
          timeControl: match.timeControl,
          winnerId: match.winnerId,
          resultType: match.resultType,
          pgn: match.pgn,
          finalFen: match.finalFen,
          rated: match.rated,
        }),
      });

      if (res.ok) {
        match.synced = true;
        const data = await res.json().catch(() => null);
        if (data?.elo && session.id) {
          const isWhite = match.whiteId === session.id;
          const isBlack = match.blackId === session.id;
          const eloInfo = isWhite ? data.elo.white : isBlack ? data.elo.black : null;
          if (eloInfo) {
            const field = data.elo.ratingField;
            const updates: Partial<PlayerSession> = {
              rating: eloInfo.newRating,
            };
            if (field === 'checkersRating') updates.checkersRating = eloInfo.newRating;
            else if (field === 'morabarabaRating') updates.morabarabaRating = eloInfo.newRating;
            else updates.chessRating = eloInfo.newRating;

            savePlayerSession(updates);
          }
        }
      }
    } catch {
      // Network drop, will retry on next sync
    }
  }

  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(matches));
  } catch {
    // ignore
  }
}

export function migrateVaultGuestMatches(newUserId: string, newHandle: string): void {
  if (typeof window === 'undefined') return;
  const matches = getLocalMatches();
  let changed = false;

  const updated = matches.map((m) => {
    let mod = false;
    let whiteId = m.whiteId;
    let whiteHandle = m.whiteHandle;
    let blackId = m.blackId;
    let blackHandle = m.blackHandle;
    let winnerId = m.winnerId;

    if (whiteId.startsWith('guest_')) {
      whiteId = newUserId;
      whiteHandle = newHandle;
      mod = true;
    }
    if (blackId.startsWith('guest_')) {
      blackId = newUserId;
      blackHandle = newHandle;
      mod = true;
    }
    if (winnerId && winnerId.startsWith('guest_')) {
      winnerId = newUserId;
      mod = true;
    }

    if (mod) {
      changed = true;
      return {
        ...m,
        whiteId,
        whiteHandle,
        blackId,
        blackHandle,
        winnerId,
        synced: false,
      };
    }
    return m;
  });

  if (changed) {
    try {
      localStorage.setItem(VAULT_KEY, JSON.stringify(updated));
      syncPendingMatches();
    } catch {
      // ignore
    }
  }
}

// Auto-sync whenever internet connectivity restores
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingMatches();
  });
}
