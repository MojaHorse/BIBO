// Progression & Point Economy Engine for Obscura Chess

export interface RankTier {
  league: 'Cadet' | 'Operative' | 'Strategist' | 'Vanguard' | 'Grandmaster' | 'Legendary' | 'Apex';
  division: 'III' | 'II' | 'I' | 'Ω';
  badge: string;
  title: string;
  minXp: number;
  nextTierXp: number;
  color: string;
}

export const RANK_TIERS: RankTier[] = [
  // Cadet League
  {
    league: 'Cadet',
    division: 'III',
    badge: 'CDT-III',
    title: 'Novice Analyst',
    minXp: 0,
    nextTierXp: 250,
    color: 'text-zinc-400 border-zinc-500',
  },
  {
    league: 'Cadet',
    division: 'II',
    badge: 'CDT-II',
    title: 'Field Correspondent',
    minXp: 250,
    nextTierXp: 600,
    color: 'text-zinc-300 border-zinc-400',
  },
  {
    league: 'Cadet',
    division: 'I',
    badge: 'CDT-I',
    title: 'Senior Courier',
    minXp: 600,
    nextTierXp: 1100,
    color: 'text-zinc-200 border-zinc-300',
  },

  // Operative League
  {
    league: 'Operative',
    division: 'III',
    badge: 'OPR-III',
    title: 'Field Specialist',
    minXp: 1100,
    nextTierXp: 1800,
    color: 'text-emerald-400 border-emerald-500',
  },
  {
    league: 'Operative',
    division: 'II',
    badge: 'OPR-II',
    title: 'Infiltration Agent',
    minXp: 1800,
    nextTierXp: 2700,
    color: 'text-emerald-300 border-emerald-400',
  },
  {
    league: 'Operative',
    division: 'I',
    badge: 'OPR-I',
    title: 'Covert Strategist',
    minXp: 2700,
    nextTierXp: 3800,
    color: 'text-emerald-200 border-emerald-300',
  },

  // Strategist League
  {
    league: 'Strategist',
    division: 'III',
    badge: 'STR-III',
    title: 'Cryptanalyst',
    minXp: 3800,
    nextTierXp: 5200,
    color: 'text-sky-400 border-sky-500',
  },
  {
    league: 'Strategist',
    division: 'II',
    badge: 'STR-II',
    title: 'Positional Auditor',
    minXp: 5200,
    nextTierXp: 6900,
    color: 'text-sky-300 border-sky-400',
  },
  {
    league: 'Strategist',
    division: 'I',
    badge: 'STR-I',
    title: 'Lead Director',
    minXp: 6900,
    nextTierXp: 9000,
    color: 'text-sky-200 border-sky-300',
  },

  // Vanguard League
  {
    league: 'Vanguard',
    division: 'III',
    badge: 'VGD-III',
    title: 'Senior Inquisitor',
    minXp: 9000,
    nextTierXp: 11500,
    color: 'text-purple-400 border-purple-500',
  },
  {
    league: 'Vanguard',
    division: 'II',
    badge: 'VGD-II',
    title: 'Chief Investigator',
    minXp: 11500,
    nextTierXp: 14500,
    color: 'text-purple-300 border-purple-400',
  },
  {
    league: 'Vanguard',
    division: 'I',
    badge: 'VGD-I',
    title: 'Master Inspector',
    minXp: 14500,
    nextTierXp: 18000,
    color: 'text-purple-200 border-purple-300',
  },

  // Grandmaster League
  {
    league: 'Grandmaster',
    division: 'III',
    badge: 'GM-III',
    title: 'High Tactician',
    minXp: 18000,
    nextTierXp: 22500,
    color: 'text-amber-400 border-amber-500',
  },
  {
    league: 'Grandmaster',
    division: 'II',
    badge: 'GM-II',
    title: 'Grand Marshal',
    minXp: 22500,
    nextTierXp: 28000,
    color: 'text-amber-300 border-amber-400',
  },
  {
    league: 'Grandmaster',
    division: 'I',
    badge: 'GM-I',
    title: 'Chancellor of the Board',
    minXp: 28000,
    nextTierXp: 35000,
    color: 'text-amber-200 border-amber-300',
  },

  // Legendary League
  {
    league: 'Legendary',
    division: 'III',
    badge: 'LEG-III',
    title: 'Grand Infiltrator',
    minXp: 35000,
    nextTierXp: 45000,
    color: 'text-rose-400 border-rose-500',
  },
  {
    league: 'Legendary',
    division: 'II',
    badge: 'LEG-II',
    title: 'Sovereign Tactician',
    minXp: 45000,
    nextTierXp: 60000,
    color: 'text-rose-300 border-rose-400',
  },
  {
    league: 'Legendary',
    division: 'I',
    badge: 'LEG-I',
    title: 'Lord of the Board',
    minXp: 60000,
    nextTierXp: 80000,
    color: 'text-rose-200 border-rose-300',
  },

  // Apex (Uncapped Elite)
  {
    league: 'Apex',
    division: 'Ω',
    badge: 'APEX-Ω',
    title: 'Grand Arbiter',
    minXp: 80000,
    nextTierXp: Infinity,
    color: 'text-teal-300 border-teal-400',
  },
];

export interface RankInfo {
  tier: RankTier;
  xp: number;
  xpInCurrentTier: number;
  tierRange: number;
  progressPercent: number;
  nextTier: RankTier | null;
}

/**
 * Calculates current rank, division, and progress percentage from total lifetime XP.
 */
export function getRankFromXp(xp: number): RankInfo {
  const safeXp = Math.max(0, Math.round(xp));

  let currentTier = RANK_TIERS[0];
  let nextTier: RankTier | null = RANK_TIERS[1] || null;

  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (safeXp >= RANK_TIERS[i].minXp) {
      currentTier = RANK_TIERS[i];
      nextTier = RANK_TIERS[i + 1] || null;
    } else {
      break;
    }
  }

  if (!nextTier || nextTier.nextTierXp === Infinity) {
    return {
      tier: currentTier,
      xp: safeXp,
      xpInCurrentTier: safeXp - currentTier.minXp,
      tierRange: 20000,
      progressPercent: 100,
      nextTier: null,
    };
  }

  const tierRange = nextTier.minXp - currentTier.minXp;
  const xpInCurrentTier = safeXp - currentTier.minXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentTier / tierRange) * 100)));

  return {
    tier: currentTier,
    xp: safeXp,
    xpInCurrentTier,
    tierRange,
    progressPercent,
    nextTier,
  };
}

export interface MatchXpParams {
  playerRating: number;
  opponentRating: number;
  result: 'win' | 'loss' | 'draw';
  capsAccuracy?: number;
  brilliantMovesCount?: number;
  movesCount: number;
}

export interface MatchXpBreakdown {
  totalXp: number;
  baseMatchXp: number;
  difficultyScaler: number;
  accuracyBonus: number;
  brilliantBonus: number;
}

/**
 * Calculates difficulty & opponent-scaled Match XP.
 * Anti-farming protection reduces rewards for beating lower-rated players.
 * Upset victories multiply rewards up to 2.5x.
 */
export function calculateMatchXp({
  playerRating,
  opponentRating,
  result,
  capsAccuracy,
  brilliantMovesCount = 0,
  movesCount,
}: MatchXpParams): MatchXpBreakdown {
  const ratingDiff = opponentRating - playerRating;
  // Scaler: 1.0 at equal rating, up to 2.5x for upset wins, down to 0.4x for farming beginners
  const difficultyScaler = Math.min(2.5, Math.max(0.4, Number((1 + ratingDiff / 400).toFixed(2))));

  let base = 0;
  if (result === 'win') base = 15;
  else if (result === 'draw') base = 6;
  else base = 3;

  let baseMatchXp = Math.round(base * difficultyScaler);

  // Short game penalty: fast resignations under 8 moves award halved XP
  if (movesCount < 8 && result === 'win') {
    baseMatchXp = Math.max(2, Math.round(baseMatchXp * 0.4));
  }

  // Stockfish CAPS Accuracy Precision bonuses
  let accuracyBonus = 0;
  if (capsAccuracy && capsAccuracy >= 90) accuracyBonus = 12;
  else if (capsAccuracy && capsAccuracy >= 80) accuracyBonus = 6;

  // Genuine brilliant tactical sacrifice bonus
  const brilliantBonus = brilliantMovesCount * 8;

  const totalXp = baseMatchXp + accuracyBonus + brilliantBonus;

  return {
    totalXp,
    baseMatchXp,
    difficultyScaler,
    accuracyBonus,
    brilliantBonus,
  };
}

/**
 * Calculates difficulty-scaled Puzzle XP based on puzzle ELO rating.
 */
export function calculatePuzzleXp(puzzleRating: number, firstTry: boolean = true): number {
  const base = Math.max(3, Math.round(3 + (puzzleRating - 800) / 55));
  const bonus = firstTry ? Math.max(2, Math.round(base * 0.4)) : 0;
  return base + bonus;
}
