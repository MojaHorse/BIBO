// Standard FIDE ELO Rating calculation system

export interface EloCalculationResult {
  newRatingA: number;
  newRatingB: number;
  deltaA: number;
  deltaB: number;
}

/**
 * Calculates new ELO ratings after a match.
 * @param ratingA Current rating of Player A
 * @param ratingB Current rating of Player B
 * @param scoreA Score of Player A: 1 for win, 0.5 for draw, 0 for loss
 * @param k K-factor (default 32)
 */
export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: 1 | 0.5 | 0,
  k: number = 32
): EloCalculationResult {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  const scoreB = (1 - scoreA) as 1 | 0.5 | 0;

  const deltaA = Math.round(k * (scoreA - expectedA));
  const deltaB = Math.round(k * (scoreB - expectedB));

  return {
    newRatingA: Math.max(100, ratingA + deltaA),
    newRatingB: Math.max(100, ratingB + deltaB),
    deltaA,
    deltaB,
  };
}
