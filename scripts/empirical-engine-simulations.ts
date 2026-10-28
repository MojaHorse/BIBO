import { CheckersEngine } from '../src/lib/checkers-engine';
import { MorabarabaEngine } from '../src/lib/morabaraba-engine';
import { Chess } from 'chess.js';
import { findBestMove } from '../src/lib/chess-ai';

interface MatchResult {
  game: string;
  variant?: string;
  whiteDifficulty: 'easy' | 'medium' | 'hard';
  blackDifficulty: 'easy' | 'medium' | 'hard';
  winner: 'w' | 'b' | 'draw';
  plies: number;
  reason: string;
}

// 1. Run Checkers Automated Match
function runCheckersMatch(
  diffW: 'easy' | 'medium' | 'hard',
  diffB: 'easy' | 'medium' | 'hard',
  maxPlies = 100
): MatchResult {
  const engine = new CheckersEngine();
  let plies = 0;

  while (plies < maxPlies) {
    const winner = engine.checkWinner();
    if (winner) {
      return {
        game: 'Checkers',
        variant: 'american-8x8',
        whiteDifficulty: diffW,
        blackDifficulty: diffB,
        winner,
        plies,
        reason: `${winner === 'w' ? 'White' : 'Black'} won by piece wipeout or stalemate blockade`,
      };
    }

    const currentTurn = engine.getTurn();
    const diff = currentTurn === 'w' ? diffW : diffB;
    const move = engine.findBestMove(diff);

    if (!move) {
      // Stalemate / no legal moves
      const win = currentTurn === 'w' ? 'b' : 'w';
      return {
        game: 'Checkers',
        variant: 'american-8x8',
        whiteDifficulty: diffW,
        blackDifficulty: diffB,
        winner: win,
        plies,
        reason: `${win === 'w' ? 'White' : 'Black'} won: opponent had no legal moves`,
      };
    }

    const res = engine.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
    plies++;

    if (!res.success) {
      throw new Error(`Checkers illegal bot move: ${JSON.stringify(move)}`);
    }
  }

  return {
    game: 'Checkers',
    variant: 'american-8x8',
    whiteDifficulty: diffW,
    blackDifficulty: diffB,
    winner: 'draw',
    plies,
    reason: `Draw: reached ply limit (${maxPlies}) without decisive termination`,
  };
}

// 2. Run Morabaraba Automated Match
function runMorabarabaMatch(
  variant: 'standard-24' | 'koti-25',
  diffW: 'easy' | 'medium' | 'hard',
  diffB: 'easy' | 'medium' | 'hard',
  maxPlies = 120
): MatchResult {
  const engine = new MorabarabaEngine(undefined, variant);
  let plies = 0;

  while (plies < maxPlies) {
    const winner = engine.checkWinner();
    if (winner) {
      return {
        game: 'Morabaraba',
        variant,
        whiteDifficulty: diffW,
        blackDifficulty: diffB,
        winner,
        plies,
        reason: `${winner === 'w' ? 'White' : 'Black'} won: opponent reduced to <3 cows or blocked`,
      };
    }

    const currentTurn = engine.getTurn();
    const diff = currentTurn === 'w' ? diffW : diffB;
    const action = engine.findBestBotAction(diff);

    if (!action) {
      const win = currentTurn === 'w' ? 'b' : 'w';
      return {
        game: 'Morabaraba',
        variant,
        whiteDifficulty: diffW,
        blackDifficulty: diffB,
        winner: win,
        plies,
        reason: `${win === 'w' ? 'White' : 'Black'} won: opponent had no legal moves`,
      };
    }

    if (action.type === 'place' && action.to) {
      const res = engine.placeCow(action.to);
      plies++;
      if (!res.success) throw new Error(`Morabaraba illegal place action: ${action.to}`);
    } else if (action.type === 'move' && action.from && action.to) {
      const res = engine.moveCow(action.from, action.to);
      plies++;
      if (!res.success) throw new Error(`Morabaraba illegal move action: ${action.from}->${action.to}`);
    } else if (action.type === 'shoot' && action.shot) {
      const res = engine.shootCow(action.shot);
      plies++;
      if (!res.success) throw new Error(`Morabaraba illegal shoot action: ${action.shot}`);
    }
  }

  return {
    game: 'Morabaraba',
    variant,
    whiteDifficulty: diffW,
    blackDifficulty: diffB,
    winner: 'draw',
    plies,
    reason: `Draw: reached ply limit (${maxPlies}) in position struggle`,
  };
}

// 3. Run Chess Automated Match
function runChessMatch(
  diffW: 'easy' | 'medium',
  diffB: 'easy' | 'medium',
  maxPlies = 70
): MatchResult {
  const chess = new Chess();
  let plies = 0;

  while (plies < maxPlies && !chess.isGameOver()) {
    const isWhite = chess.turn() === 'w';
    const diff = isWhite ? diffW : diffB;
    const move = findBestMove(chess, diff);

    if (!move) break;

    chess.move(move);
    plies++;
  }

  let winner: 'w' | 'b' | 'draw' = 'draw';
  let reason = `Draw: reached ply limit (${maxPlies})`;

  if (chess.isCheckmate()) {
    winner = chess.turn() === 'w' ? 'b' : 'w';
    reason = `Checkmate: ${winner === 'w' ? 'White' : 'Black'} won`;
  } else if (chess.isStalemate()) {
    winner = 'draw';
    reason = 'Stalemate';
  } else if (chess.isThreefoldRepetition()) {
    winner = 'draw';
    reason = 'Threefold repetition';
  } else if (chess.isInsufficientMaterial()) {
    winner = 'draw';
    reason = 'Insufficient material';
  }

  return {
    game: 'Chess',
    variant: 'standard',
    whiteDifficulty: diffW,
    blackDifficulty: diffB,
    winner,
    plies,
    reason,
  };
}

async function main() {
  console.log('=== STARTING EMPIRICAL ENGINE SIMULATION SUITE ===\n');

  // --- CHECKERS SUITE ---
  console.log('--- Checkers Empirical Matches ---');
  const checkersResults: MatchResult[] = [];
  // Swapped color pairs: Easy vs Easy, Medium vs Medium, Hard vs Hard, Medium vs Easy
  checkersResults.push(runCheckersMatch('easy', 'easy'));
  checkersResults.push(runCheckersMatch('easy', 'easy'));
  checkersResults.push(runCheckersMatch('medium', 'medium'));
  checkersResults.push(runCheckersMatch('medium', 'easy')); // Medium White vs Easy Black
  checkersResults.push(runCheckersMatch('easy', 'medium')); // Easy White vs Medium Black

  for (const r of checkersResults) {
    console.log(`[Checkers] W(${r.whiteDifficulty}) vs B(${r.blackDifficulty}) -> Winner: ${r.winner} (${r.plies} plies) [${r.reason}]`);
  }

  // --- MORABARABA SUITE ---
  console.log('\n--- Morabaraba Standard-24 & Koti-25 Empirical Matches ---');
  const morabarabaResults: MatchResult[] = [];
  // Standard-24: Swapped colors
  morabarabaResults.push(runMorabarabaMatch('standard-24', 'easy', 'easy'));
  morabarabaResults.push(runMorabarabaMatch('standard-24', 'medium', 'medium'));
  morabarabaResults.push(runMorabarabaMatch('standard-24', 'medium', 'easy')); // Medium White vs Easy Black
  morabarabaResults.push(runMorabarabaMatch('standard-24', 'easy', 'medium')); // Easy White vs Medium Black
  // Koti-25: Swapped colors
  morabarabaResults.push(runMorabarabaMatch('koti-25', 'easy', 'easy'));
  morabarabaResults.push(runMorabarabaMatch('koti-25', 'medium', 'medium'));

  for (const r of morabarabaResults) {
    console.log(`[Morabaraba ${r.variant}] W(${r.whiteDifficulty}) vs B(${r.blackDifficulty}) -> Winner: ${r.winner} (${r.plies} plies) [${r.reason}]`);
  }

  // --- CHESS SUITE ---
  console.log('\n--- Chess Empirical Matches ---');
  const chessResults: MatchResult[] = [];
  chessResults.push(runChessMatch('easy', 'easy'));
  chessResults.push(runChessMatch('medium', 'easy')); // Medium White vs Easy Black
  chessResults.push(runChessMatch('easy', 'medium')); // Easy White vs Medium Black

  for (const r of chessResults) {
    console.log(`[Chess] W(${r.whiteDifficulty}) vs B(${r.blackDifficulty}) -> Winner: ${r.winner} (${r.plies} plies) [${r.reason}]`);
  }

  console.log('\n=== EMPIRICAL SIMULATION SUITE COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error);
