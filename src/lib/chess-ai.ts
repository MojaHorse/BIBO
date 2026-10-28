import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { PIECE_VALUES } from './chess-utils';

// Piece square tables for positional heuristic
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

function evaluateBoard(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw()) return 0;

  let totalEvaluation = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let val = PIECE_VALUES[piece.type] * 100;
      const squareIdx = r * 8 + c;
      const flippedIdx = (7 - r) * 8 + c;

      if (piece.type === 'p') {
        val += piece.color === 'w' ? PAWN_TABLE[squareIdx] : PAWN_TABLE[flippedIdx];
      } else if (piece.type === 'n') {
        val += piece.color === 'w' ? KNIGHT_TABLE[squareIdx] : KNIGHT_TABLE[flippedIdx];
      } else if (piece.type === 'b') {
        val += piece.color === 'w' ? BISHOP_TABLE[squareIdx] : BISHOP_TABLE[flippedIdx];
      }

      totalEvaluation += piece.color === 'w' ? val : -val;
    }
  }

  return totalEvaluation;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = chess.moves({ verbose: true }) as Move[];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const ev = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function findBestMove(
  chess: Chess,
  difficulty: 'easy' | 'medium' | 'hard'
): Move | null {
  const legalMoves = chess.moves({ verbose: true }) as Move[];
  if (legalMoves.length === 0) return null;

  // Easy: mostly random, occasionally captures
  if (difficulty === 'easy') {
    const captures = legalMoves.filter((m) => m.captured);
    if (captures.length > 0 && Math.random() < 0.6) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  // Medium: Depth 2
  // Hard: Depth 3
  const depth = difficulty === 'medium' ? 2 : 3;
  const isWhite = chess.turn() === 'w';

  let bestMove = legalMoves[0];
  let bestScore = isWhite ? -Infinity : Infinity;

  // Shuffle moves to add variety to same-score evaluations
  const shuffledMoves = [...legalMoves].sort(() => Math.random() - 0.5);

  for (const move of shuffledMoves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isWhite);
    chess.undo();

    if (isWhite) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

export interface BotThinkTimeOptions {
  difficulty: 'easy' | 'medium' | 'hard';
  timeControlMinutes: number;
  botRemainingTimeSeconds: number;
  moveCount: number;
  isInCheck: boolean;
  legalMovesCount?: number;
}

/**
 * Calculates human-like thinking delay (in milliseconds) for chess AI.
 * Simulates realistic thought process based on:
 * - Time control (bullet vs blitz vs rapid)
 * - Game phase (opening book vs middlegame/endgame)
 * - Clock situation (hurries when low on time)
 * - Position complexity (tactical checks / branch factor)
 * - Difficulty setting
 */
export function calculateBotThinkTime({
  difficulty,
  timeControlMinutes,
  botRemainingTimeSeconds,
  moveCount,
  isInCheck,
  legalMovesCount = 20,
}: BotThinkTimeOptions): number {
  // 1. Base duration based on time control (in ms)
  let baseMs: number;
  let jitterRange: number;

  if (timeControlMinutes <= 1) {
    // 1-min Bullet: snappy moves (800ms - 2000ms)
    baseMs = 1200;
    jitterRange = 600;
  } else if (timeControlMinutes <= 3) {
    // 3-min Blitz: quick club pace (1800ms - 3800ms)
    baseMs = 2400;
    jitterRange = 1000;
  } else if (timeControlMinutes <= 5) {
    // 5-min Blitz: realistic deliberation (2500ms - 5500ms)
    baseMs = 3500;
    jitterRange = 1500;
  } else if (timeControlMinutes <= 10) {
    // 10-min Rapid: deep thought (3500ms - 8000ms)
    baseMs = 5000;
    jitterRange = 2500;
  } else {
    // 15+ min / untimed: leisurely play (4500ms - 9500ms)
    baseMs = 6000;
    jitterRange = 3000;
  }

  // 2. Human jitter: Gaussian-approximated random variance
  const randOffset = (Math.random() * 2 - 1) * jitterRange;
  let thinkMs = baseMs + randOffset;

  // 3. Opening phase (First 5 moves): rapid opening book recall
  if (moveCount <= 4) {
    thinkMs *= 0.45; // ~800ms - 1.8s
  } else if (moveCount <= 8) {
    thinkMs *= 0.75;
  }

  // 4. Tactical complexity
  if (isInCheck) {
    // Escape calculation: add 600ms - 1400ms
    thinkMs += 600 + Math.random() * 800;
  } else if (legalMovesCount > 35) {
    // High branch factor: slight extra contemplation
    thinkMs += 400;
  }

  // 5. Difficulty multiplier
  if (difficulty === 'easy') {
    thinkMs *= 0.75; // Casual, instinctual
  } else if (difficulty === 'hard') {
    thinkMs *= 1.25; // Careful, calculating
  }

  // 6. Time Management & Clock Scramble (prevent bot from flagging blindly)
  if (botRemainingTimeSeconds <= 5) {
    // Panic scramble (< 5s left): 250ms - 500ms
    thinkMs = 250 + Math.random() * 250;
  } else if (botRemainingTimeSeconds <= 15) {
    // Severe time pressure (5s - 15s left): 600ms - 1200ms
    thinkMs = Math.min(thinkMs * 0.4, 600 + Math.random() * 600);
  } else if (botRemainingTimeSeconds <= 30) {
    // Moderate time pressure: cap at 1800ms
    thinkMs = Math.min(thinkMs * 0.65, 1800);
  } else if (botRemainingTimeSeconds <= 60) {
    // Mild time pressure: cap at 3000ms
    thinkMs = Math.min(thinkMs * 0.85, 3000);
  }

  // Absolute safety bounds:
  // Must be at least 400ms (so user perceives human pause)
  // Must not exceed bot remaining time - 1s
  const maxSafeMs = Math.max(400, (botRemainingTimeSeconds - 1) * 1000);
  return Math.min(Math.max(400, Math.round(thinkMs)), maxSafeMs);
}
