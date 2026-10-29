// Stable client session manager for persistent authenticated user identity

export const SESSION_UPDATED_EVENT = 'obscura_session_updated';

export interface PlayerSession {
  id: string;
  handle: string;
  displayName?: string;
  rating: number;
  chessRating?: number;
  checkersRating?: number;
  morabarabaRating?: number;
  xp: number;
  email?: string;
  isVerifiedHuman?: boolean;
  avatarUrl?: string;
  avatar?: string;
  playStyle?: string;
  onboarded?: boolean;
  isAuthenticated?: boolean;
}

export function isAuthenticatedSession(session?: PlayerSession | null): boolean {
  if (!session) return false;
  return Boolean((session.isAuthenticated ?? true) && session.id && !session.id.startsWith('guest_'));
}

export function broadcastSessionUpdate(session: PlayerSession) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_UPDATED_EVENT, { detail: session }));
  }
}

export function clearPlayerSession() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('obscura_user');
      localStorage.removeItem('obscura_xp');
      localStorage.removeItem('obscura_guest_id');
      localStorage.removeItem('obscura_guest_handle');
    } catch {
      // ignore
    }
    const emptySession: PlayerSession = {
      id: '',
      handle: '',
      rating: 1200,
      xp: 0,
      isAuthenticated: false,
      isVerifiedHuman: false,
    };
    broadcastSessionUpdate(emptySession);
  }
}

export function savePlayerSession(updates: Partial<PlayerSession>): PlayerSession {
  const current = getPlayerSession();
  const merged: PlayerSession = {
    ...current,
    ...updates,
    rating: updates.rating ?? current.rating,
    chessRating: updates.chessRating ?? current.chessRating ?? updates.rating ?? current.rating,
    checkersRating: updates.checkersRating ?? current.checkersRating ?? 1200,
    morabarabaRating: updates.morabarabaRating ?? current.morabarabaRating ?? 1200,
    xp: updates.xp ?? current.xp,
    isAuthenticated: Boolean(updates.id ? !updates.id.startsWith('guest_') : current.isAuthenticated),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('obscura_user', JSON.stringify(merged));
      localStorage.setItem('obscura_xp', String(merged.xp));
    } catch {
      // ignore
    }
    broadcastSessionUpdate(merged);
  }

  return merged;
}

export function getPlayerSession(): PlayerSession {
  if (typeof window === 'undefined') {
    return { id: '', handle: '', rating: 1200, xp: 0, isAuthenticated: false, isVerifiedHuman: false };
  }

  const savedXp = parseInt(localStorage.getItem('obscura_xp') || '0', 10) || 0;

  // Check registered user
  try {
    const userStr = localStorage.getItem('obscura_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u.handle === 'VerifiedTactician' || u.email === 'human.tactician@bibo.internal' || u.id === 'demo_user') {
        try {
          localStorage.removeItem('obscura_user');
          localStorage.removeItem('obscura_xp');
        } catch {
          // ignore
        }
        return { id: '', handle: '', rating: 1200, xp: 0, isAuthenticated: false, isVerifiedHuman: false };
      }
      if (u.id && u.handle && !u.id.startsWith('guest_')) {
        return {
          id: u.id,
          handle: u.handle,
          displayName: u.displayName || u.handle,
          rating: u.blitzRating || u.rating || 1200,
          chessRating: u.chessRating || u.blitzRating || u.rating || 1200,
          checkersRating: u.checkersRating || 1200,
          morabarabaRating: u.morabarabaRating || 1200,
          xp: typeof u.xp === 'number' ? u.xp : savedXp,
          email: u.email,
          isVerifiedHuman: Boolean(u.isVerifiedHuman),
          avatarUrl: u.avatarUrl,
          avatar: u.avatar || 'knight',
          playStyle: u.playStyle || 'Tactical',
          onboarded: Boolean(u.onboarded),
          isAuthenticated: true,
        };
      }
    }
  } catch {
    // fallback
  }

  // Clean up any lingering legacy guest keys from client storage
  try {
    localStorage.removeItem('obscura_guest_id');
    localStorage.removeItem('obscura_guest_handle');
  } catch {
    // ignore
  }

  return {
    id: '',
    handle: '',
    rating: 1200,
    xp: 0,
    isAuthenticated: false,
    isVerifiedHuman: false,
    avatar: 'knight',
    playStyle: 'Tactical',
  };
}

export function addSessionXp(amount: number): number {
  if (typeof window === 'undefined') return 0;
  const current = parseInt(localStorage.getItem('obscura_xp') || '0', 10) || 0;
  const updated = current + amount;
  localStorage.setItem('obscura_xp', updated.toString());

  // Also update registered user if present
  try {
    const userStr = localStorage.getItem('obscura_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      u.xp = (u.xp || 0) + amount;
      localStorage.setItem('obscura_user', JSON.stringify(u));
      broadcastSessionUpdate({
        ...u,
        rating: u.blitzRating || u.rating || 1200,
        xp: u.xp,
      });
    }
  } catch {
    // ignore
  }

  return updated;
}
