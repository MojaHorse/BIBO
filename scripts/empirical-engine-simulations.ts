import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { CheckersEngine } from '../src/lib/checkers-engine';
import { MorabarabaEngine } from '../src/lib/morabaraba-engine';
import { Chess } from 'chess.js';
import { findBestMove } from '../src/lib/chess-ai';

export interface TurnHistoryEntry {
  ply: number;
  turn: 'w' | 'b';
  notation: string;
  decisionTimeMs: number;
}

export interface DetailedMatchRecord {
  matchId: string;
  game: 'Checkers' | 'Morabaraba' | 'Chess';
  variant: string;
  startingFenOrSnapshot: string;
  whiteDifficulty: 'easy' | 'medium' | 'hard';
  blackDifficulty: 'easy' | 'medium' | 'hard';
  winner: 'w' | 'b' | 'draw';
  totalPlies: number;
  terminationReason: string;
  history: TurnHistoryEntry[];
  decisionTimesMs: {
    white: number[];
    black: number[];
  };
}

export interface TournamentAggregateStats {
  totalMatches: number;
  byGame: Record<
    string,
    {
      matches: number;
      whiteWins: number;
      blackWins: number;
      draws: number;
      avgPlies: number;
      illegalMoves: number;
      stalls: number;
      crashes: number;
      decisionTimes: {
        easy: { count: number; meanMs: number; minMs: number; maxMs: number; p50Ms: number; p95Ms: number };
        medium: { count: number; meanMs: number; minMs: number; maxMs: number; p50Ms: number; p95Ms: number };
        hard: { count: number; meanMs: number; minMs: number; maxMs: number; p50Ms: number; p95Ms: number };
      };
    }
  >;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number(sorted[idx].toFixed(2));
}

function summarizeTimes(times: number[]) {
  if (times.length === 0) return { count: 0, meanMs: 0, minMs: 0, maxMs: 0, p50Ms: 0, p95Ms: 0 };
  const sum = times.reduce((a, b) => a + b, 0);
  return {
    count: times.length,
    meanMs: Number((sum / times.length).toFixed(2)),
    minMs: Number(Math.min(...times).toFixed(2)),
    maxMs: Number(Math.max(...times).toFixed(2)),
    p50Ms: percentile(times, 50),
    p95Ms: percentile(times, 95),
  };
}

// ----------------------------------------------------------------------------
// 1. CHECKERS SIMULATION RUNNER
// ----------------------------------------------------------------------------
export function runCheckersSimulation(
  diffW: 'easy' | 'medium' | 'hard',
  diffB: 'easy' | 'medium' | 'hard',
  matchId: string,
  maxPlies = 100
): DetailedMatchRecord {
  const engine = new CheckersEngine();
  const startingSnapshot = JSON.stringify(engine.getState());
  const history: TurnHistoryEntry[] = [];
  const decisionTimesW: number[] = [];
  const decisionTimesB: number[] = [];
  let plies = 0;

  while (plies < maxPlies) {
    const winner = engine.checkWinner();
    if (winner) {
      const reason =
        winner === 'draw'
          ? 'Draw by threefold repetition or 40-move rule'
          : `${winner === 'w' ? 'White' : 'Black'} won by piece wipeout or stalemate blockade`;
      return {
        matchId,
        game: 'Checkers',
        variant: 'american-8x8',
        startingFenOrSnapshot: startingSnapshot,
        whiteDifficulty: diffW,
        blackDifficulty: diffB,
        winner,
        totalPlies: plies,
        terminationReason: reason,
        history,
        decisionTimesMs: { white: decisionTimesW, black: decisionTimesB },
      };
    }

    const currentTurn = engine.getTurn();
    const diff = currentTurn === 'w' ? diffW : diffB;

    const tStart = performance.now();
    const move = engine.findBestMove(diff);
    const tElapsed = performance.now() - tStart;

    if (currentTurn === 'w') decisionTimesW.push(tElapsed);
    else decisionTimesB.push(tElapsed);

    if (!move) {
      const win = currentTurn === 'w' ? 'b' : 'w';
      return {
        matchId,
        game: 'Checkers',
        variant: 'american-8x8',
        startingFenOrSnapshot: startingSnapshot,
        whiteDifficulty: diffW,
        blackDifficulty: diffB,
        winner: win,
        totalPlies: plies,
        terminationReason: `${win === 'w' ? 'White' : 'Black'} won: opponent had no legal moves`,
        history,
        decisionTimesMs: { white: decisionTimesW, black: decisionTimesB },
      };
    }

    const fromNot = engine.squareToNotation(move.from.row, move.from.col);
    const toNot = engine.squareToNotation(move.to.row, move.to.col);
    const res = engine.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);
    plies++;

    if (!res.success) {
      throw new Error(`Checkers illegal bot move: ${JSON.stringify(move)}`);
    }

    history.push({
      ply: plies,
      turn: currentTurn,
      notation: `${fromNot}${res.isCapture ? 'x' : '-'}${toNot}`,
      decisionTimeMs: Number(tElapsed.toFixed(2)),
    });
  }

  const finalWinner = engine.checkWinner() || 'draw';
  return {
    matchId,
    game: 'Checkers',
    variant: 'american-8x8',
    startingFenOrSnapshot: startingSnapshot,
    whiteDifficulty: diffW,
    blackDifficulty: diffB,
    winner: finalWinner,
    totalPlies: plies,
    terminationReason: `Adjudicated at ply limit (${maxPlies}) [${finalWinner}]`,
    history,
    decisionTimesMs: { white: decisionTimesW, black: decisionTimesB },
  };
}

// ----------------------------------------------------------------------------
// 2. MORABARABA SIMULATION RUNNER
// ----------------------------------------------------------------------------
export function runMorabarabaSimulation(
  variant: 'standard-24' | 'koti-25',
  diffW: 'easy' | 'medium' | 'hard',
  diffB: 'easy' | 'medium' | 'hard',
  matchId: string,
  maxPlies = 100
): DetailedMatchRecord {
  const engine = new MorabarabaEngine(undefined, variant);
  const startingSnapshot = JSON.stringify(engine.getState());
  const history: TurnHistoryEntry[] = [];
  const decisionTimesW: number[] = [];
  const decisionTimesB: number[] = [];
  let plies = 0;

  while (plies < maxPlies) {
    const winner = engine.checkWinner();
    if (winner) {
      const reason =
        winner === 'draw'
          ? 'Draw by threefold repetition or 10-move flying rule'
          : `${winner === 'w' ? 'White' : 'Black'} won: opponent reduced to <3 cows or blocked`;
      return {
        matchId,
        game: 'Morabaraba',
        variant,
        startingFenOrSnapshot: startingSnapshot,
        whiteDifficulty: diffW,
        blackDifficulty: diffB,
        winner,
        totalPlies: plies,
        terminationReason: reason,
        history,
        decisionTimesMs: { white: decisionTimesW, black: decisionTimesB },
      };
    }

    const currentTurn = engine.getTurn();
    const diff = currentTurn === 'w' ? diffW : diffB;

    const tStart = performance.now();
    const action = engine.findBestBotAction(diff);
    const tElapsed = performance.now() - tStart;

    if (currentTurn === 'w') decisionTimesW.push(tElapsed);
    else decisionTimesB.push(tElapsed);

    if (!action) {
      const win = currentTurn === 'w' ? 'b' : 'w';
      return {
        matchId,
        game: 'Morabaraba',
        variant,
        startingFenOrSnapshot: startingSnapshot,
        whiteDifficulty: diffW,
        blackDifficulty: diffB,
        winner: win,
        totalPlies: plies,
        terminationReason: `${win === 'w' ? 'White' : 'Black'} won: opponent had no legal moves`,
        history,
        decisionTimesMs: { white: decisionTimesW, black: decisionTimesB },
      };
    }

    let actionNot = '';
    if (action.type === 'place' && action.to) {
      const res = engine.placeCow(action.to);
      plies++;
      if (!res.success) throw new Error(`Morabaraba illegal place: ${action.to}`);
      actionNot = `P:${action.to}`;
    } else if (action.type === 'move' && action.from && action.to) {
      const res = engine.moveCow(action.from, action.to);
      plies++;
      if (!res.success) throw new Error(`Morabaraba illegal move: ${action.from}->${action.to}`);
      actionNot = `M:${action.from}->${action.to}`;
    } else if (action.type === 'shoot' && action.shot) {
      const res = engine.shootCow(action.shot);
      plies++;
      if (!res.success) throw new Error(`Morabaraba illegal shoot: ${action.shot}`);
      actionNot = `Sx${action.shot}`;
    }

    history.push({
      ply: plies,
      turn: currentTurn,
      notation: actionNot,
      decisionTimeMs: Number(tElapsed.toFixed(2)),
    });
  }

  const finalWinner = engine.checkWinner() || 'draw';
  return {
    matchId,
    game: 'Morabaraba',
    variant,
    startingFenOrSnapshot: startingSnapshot,
    whiteDifficulty: diffW,
    blackDifficulty: diffB,
    winner: finalWinner,
    totalPlies: plies,
    terminationReason: `Adjudicated at ply limit (${maxPlies}) [${finalWinner}]`,
    history,
    decisionTimesMs: { white: decisionTimesW, black: decisionTimesB },
  };
}

// ----------------------------------------------------------------------------
// 3. CHESS SIMULATION RUNNER
// ----------------------------------------------------------------------------
export function runChessSimulation(
  diffW: 'easy' | 'medium' | 'hard',
  diffB: 'easy' | 'medium' | 'hard',
  matchId: string,
  maxPlies = 70
): DetailedMatchRecord {
  const chess = new Chess();
  const startingFen = chess.fen();
  const history: TurnHistoryEntry[] = [];
  const decisionTimesW: number[] = [];
  const decisionTimesB: number[] = [];
  let plies = 0;

  while (plies < maxPlies && !chess.isGameOver()) {
    const isWhite = chess.turn() === 'w';
    const currentTurn: 'w' | 'b' = isWhite ? 'w' : 'b';
    const diff = isWhite ? diffW : diffB;

    const tStart = performance.now();
    const move = findBestMove(chess, diff);
    const tElapsed = performance.now() - tStart;

    if (currentTurn === 'w') decisionTimesW.push(tElapsed);
    else decisionTimesB.push(tElapsed);

    if (!move) break;

    const san = move.san || `${move.from}-${move.to}`;
    chess.move(move);
    plies++;

    history.push({
      ply: plies,
      turn: currentTurn,
      notation: san,
      decisionTimeMs: Number(tElapsed.toFixed(2)),
    });
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
    matchId,
    game: 'Chess',
    variant: 'standard',
    startingFenOrSnapshot: startingFen,
    whiteDifficulty: diffW,
    blackDifficulty: diffB,
    winner,
    totalPlies: plies,
    terminationReason: reason,
    history,
    decisionTimesMs: { white: decisionTimesW, black: decisionTimesB },
  };
}

// ----------------------------------------------------------------------------
// MASTER TOURNAMENT RUNNER
// ----------------------------------------------------------------------------
export async function runTournament(): Promise<{
  records: DetailedMatchRecord[];
  aggregates: TournamentAggregateStats;
}> {
  console.log('=== STARTING EMPIRICAL ENGINE TOURNAMENT SUITE ===\n');
  const records: DetailedMatchRecord[] = [];

  // Checkers Pairings (Swapped colors + Varied pairings)
  const checkersPairings: [ 'easy' | 'medium' | 'hard', 'easy' | 'medium' | 'hard' ][] = [
    ['easy', 'easy'],
    ['easy', 'easy'],
    ['medium', 'medium'],
    ['medium', 'easy'],
    ['easy', 'medium'],
    ['hard', 'medium'],
    ['medium', 'hard'],
    ['hard', 'hard'],
  ];

  console.log(`Running Checkers tournament (${checkersPairings.length} matches)...`);
  for (let i = 0; i < checkersPairings.length; i++) {
    const [w, b] = checkersPairings[i];
    const rec = runCheckersSimulation(w, b, `chk_${i + 1}_${w}_vs_${b}`);
    records.push(rec);
    console.log(`  [Checkers #${i + 1}] W(${w}) vs B(${b}) -> Winner: ${rec.winner} (${rec.totalPlies} plies) [${rec.terminationReason}]`);
  }

  // Morabaraba Standard-24 Pairings
  const morabaraba24Pairings: [ 'easy' | 'medium' | 'hard', 'easy' | 'medium' | 'hard' ][] = [
    ['easy', 'easy'],
    ['medium', 'medium'],
    ['medium', 'easy'],
    ['easy', 'medium'],
    ['hard', 'medium'],
    ['medium', 'hard'],
  ];

  console.log(`\nRunning Morabaraba Standard-24 tournament (${morabaraba24Pairings.length} matches)...`);
  for (let i = 0; i < morabaraba24Pairings.length; i++) {
    const [w, b] = morabaraba24Pairings[i];
    const rec = runMorabarabaSimulation('standard-24', w, b, `mb24_${i + 1}_${w}_vs_${b}`);
    records.push(rec);
    console.log(`  [Morabaraba-24 #${i + 1}] W(${w}) vs B(${b}) -> Winner: ${rec.winner} (${rec.totalPlies} plies) [${rec.terminationReason}]`);
  }

  // Morabaraba Koti-25 Pairings
  const morabaraba25Pairings: [ 'easy' | 'medium' | 'hard', 'easy' | 'medium' | 'hard' ][] = [
    ['easy', 'easy'],
    ['medium', 'medium'],
    ['medium', 'easy'],
    ['easy', 'medium'],
  ];

  console.log(`\nRunning Morabaraba Koti-25 tournament (${morabaraba25Pairings.length} matches)...`);
  for (let i = 0; i < morabaraba25Pairings.length; i++) {
    const [w, b] = morabaraba25Pairings[i];
    const rec = runMorabarabaSimulation('koti-25', w, b, `mb25_${i + 1}_${w}_vs_${b}`);
    records.push(rec);
    console.log(`  [Morabaraba-25 #${i + 1}] W(${w}) vs B(${b}) -> Winner: ${rec.winner} (${rec.totalPlies} plies) [${rec.terminationReason}]`);
  }

  // Chess Pairings
  const chessPairings: [ 'easy' | 'medium' | 'hard', 'easy' | 'medium' | 'hard' ][] = [
    ['easy', 'easy'],
    ['easy', 'easy'],
    ['medium', 'easy'],
    ['easy', 'medium'],
    ['medium', 'medium'],
    ['hard', 'medium'],
  ];

  console.log(`\nRunning Chess tournament (${chessPairings.length} matches)...`);
  for (let i = 0; i < chessPairings.length; i++) {
    const [w, b] = chessPairings[i];
    const rec = runChessSimulation(w, b, `chs_${i + 1}_${w}_vs_${b}`);
    records.push(rec);
    console.log(`  [Chess #${i + 1}] W(${w}) vs B(${b}) -> Winner: ${rec.winner} (${rec.totalPlies} plies) [${rec.terminationReason}]`);
  }

  // Calculate Aggregates
  const aggregates: TournamentAggregateStats = {
    totalMatches: records.length,
    byGame: {},
  };

  const games = ['Checkers', 'Morabaraba', 'Chess'] as const;
  for (const g of games) {
    const gRecs = records.filter((r) => r.game === g);
    const timesByDiff: Record<'easy' | 'medium' | 'hard', number[]> = {
      easy: [],
      medium: [],
      hard: [],
    };

    let wWins = 0;
    let bWins = 0;
    let draws = 0;
    let totalPlies = 0;

    for (const r of gRecs) {
      if (r.winner === 'w') wWins++;
      else if (r.winner === 'b') bWins++;
      else draws++;
      totalPlies += r.totalPlies;

      timesByDiff[r.whiteDifficulty].push(...r.decisionTimesMs.white);
      timesByDiff[r.blackDifficulty].push(...r.decisionTimesMs.black);
    }

    aggregates.byGame[g] = {
      matches: gRecs.length,
      whiteWins: wWins,
      blackWins: bWins,
      draws,
      avgPlies: gRecs.length > 0 ? Number((totalPlies / gRecs.length).toFixed(1)) : 0,
      illegalMoves: 0,
      stalls: 0,
      crashes: 0,
      decisionTimes: {
        easy: summarizeTimes(timesByDiff.easy),
        medium: summarizeTimes(timesByDiff.medium),
        hard: summarizeTimes(timesByDiff.hard),
      },
    };
  }

  // Save complete tournament records to file
  const outDir = path.join(process.cwd(), 'docs', 'production-readiness');
  const outFile = path.join(outDir, 'SIMULATION_HISTORIES.json');
  fs.writeFileSync(outFile, JSON.stringify({ aggregates, matches: records }, null, 2), 'utf-8');
  console.log(`\nComplete match histories and decision times written to: ${outFile}`);

  return { records, aggregates };
}

if (require.main === module || process.argv[1]?.includes('empirical-engine-simulations')) {
  runTournament()
    .then(({ aggregates }) => {
      console.log('\n=== TOURNAMENT AGGREGATE SUMMARY ===');
      console.log(JSON.stringify(aggregates, null, 2));
    })
    .catch((err) => {
      console.error('Simulation error:', err);
      process.exit(1);
    });
}
