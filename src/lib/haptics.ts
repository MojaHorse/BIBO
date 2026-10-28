// Mobile Haptic Feedback Engine for Tactile Physical Gaming Console Feel

export const haptics = {
  // Light haptic tap for piece clicks, board navigation, tab switches
  tap: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // ignore
      }
    }
  },

  // Medium physical pulse for normal move drop
  move: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(14);
      } catch {
        // ignore
      }
    }
  },

  // Satisfying double-pulse for piece captures
  capture: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([18, 40, 22]);
      } catch {
        // ignore
      }
    }
  },

  // Sharp alert pulse for check
  check: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 50, 45]);
      } catch {
        // ignore
      }
    }
  },

  // Grand triumph sequence on victory / checkmate
  victory: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40, 60, 80]);
      } catch {
        // ignore
      }
    }
  },

  // Subdued double pulse on defeat
  defeat: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([50, 80, 50]);
      } catch {
        // ignore
      }
    }
  },
};
