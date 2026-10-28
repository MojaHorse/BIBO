// Persistent Tactical Puzzles Progress & Streak Tracker

export interface PuzzleProgress {
  solvedIds: string[];
  lastDailySolvedDate: string | null; // 'YYYY-MM-DD'
  dailyStreak: number;
  strikesRushHighScore: number;
  timedRushHighScore: number;
}

const BIBO_PUZZLE_KEY = 'bibo_puzzle_progress';
const LEGACY_PUZZLE_KEY = 'obscura_puzzle_progress';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function loadPuzzleProgress(): PuzzleProgress {
  if (typeof window === 'undefined') {
    return {
      solvedIds: [],
      lastDailySolvedDate: null,
      dailyStreak: 0,
      strikesRushHighScore: 0,
      timedRushHighScore: 0,
    };
  }

  try {
    const raw = localStorage.getItem(BIBO_PUZZLE_KEY) || localStorage.getItem(LEGACY_PUZZLE_KEY);
    if (!raw) {
      // Migrate legacy highscore if present
      const legacyScore = parseInt(
        localStorage.getItem('bibo_puzzle_highscore') || localStorage.getItem('obscura_puzzle_highscore') || '0',
        10
      ) || 0;
      return {
        solvedIds: [],
        lastDailySolvedDate: null,
        dailyStreak: 0,
        strikesRushHighScore: legacyScore,
        timedRushHighScore: 0,
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      solvedIds: [],
      lastDailySolvedDate: null,
      dailyStreak: 0,
      strikesRushHighScore: 0,
      timedRushHighScore: 0,
    };
  }
}

export function savePuzzleProgress(progress: PuzzleProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BIBO_PUZZLE_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function markPuzzleSolved(puzzleId: string, isDaily: boolean = false): { isNew: boolean; streak: number } {
  const progress = loadPuzzleProgress();
  const isNew = !progress.solvedIds.includes(puzzleId);

  if (isNew) {
    progress.solvedIds.push(puzzleId);
  }

  if (isDaily) {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    if (progress.lastDailySolvedDate !== today) {
      if (progress.lastDailySolvedDate === yesterday) {
        progress.dailyStreak += 1;
      } else {
        progress.dailyStreak = 1;
      }
      progress.lastDailySolvedDate = today;
    }
  }

  savePuzzleProgress(progress);
  return { isNew, streak: progress.dailyStreak };
}

export function updateRushHighScore(mode: 'strikes' | 'timed', score: number): number {
  const progress = loadPuzzleProgress();
  if (mode === 'strikes') {
    if (score > progress.strikesRushHighScore) {
      progress.strikesRushHighScore = score;
      savePuzzleProgress(progress);
      localStorage.setItem('bibo_puzzle_highscore', score.toString());
    }
    return progress.strikesRushHighScore;
  } else {
    if (score > progress.timedRushHighScore) {
      progress.timedRushHighScore = score;
      savePuzzleProgress(progress);
    }
    return progress.timedRushHighScore;
  }
}
