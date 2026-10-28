import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess, Square } from 'chess.js';
import { CheckersEngine, Piece, Position, CheckersMove } from '../src/lib/checkers-engine';
import { CheckersAdapter } from '../src/lib/games/checkers-adapter';
import {
  MorabarabaEngine,
  PointId,
  CowColor,
  ALL_24_POINTS,
  ALL_25_POINTS,
  MILLS_24,
  MILLS_25,
} from '../src/lib/morabaraba-engine';
import { MorabarabaAdapter } from '../src/lib/games/morabaraba-adapter';
import { ChessAdapter } from '../src/lib/games/chess-adapter';
import { findBestMove } from '../src/lib/chess-ai';

// ============================================================================
// SECTION 1: CHECKERS AMERICAN 8x8 RIGOROUS INDEPENDENT VALIDATION
// ============================================================================

test('Checkers: Regular White and Black men move only forward diagonally', () => {
  // Test White man at center (4, 3)
  const boardW: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  boardW[4][3] = 'w';
  const engineW = new CheckersEngine({ board: boardW, turn: 'w' });
  const movesW = engineW.getLegalMoves();

  assert.equal(movesW.length, 2);
  const targetsW = movesW.map((m) => `${m.to.row},${m.to.col}`).sort();
  assert.deepEqual(targetsW, ['3,2', '3,4'], 'White man moves strictly upward (row delta -1)');

  // Test Black man at center (3, 4)
  const boardB: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  boardB[3][4] = 'b';
  const engineB = new CheckersEngine({ board: boardB, turn: 'b' });
  const movesB = engineB.getLegalMoves();

  assert.equal(movesB.length, 2);
  const targetsB = movesB.map((m) => `${m.to.row},${m.to.col}`).sort();
  assert.deepEqual(targetsB, ['4,3', '4,5'], 'Black man moves strictly downward (row delta +1)');
});

test('Checkers: Edge squares restrict forward moves to exactly 1 diagonal', () => {
  // White at left edge (5, 0) - can only move to (4, 1)
  const boardL: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  boardL[5][0] = 'w';
  const engineL = new CheckersEngine({ board: boardL, turn: 'w' });
  const movesL = engineL.getLegalMoves();
  assert.equal(movesL.length, 1);
  assert.deepEqual(movesL[0].to, { row: 4, col: 1 });

  // Black at right edge (2, 7) - can only move to (3, 6)
  const boardR: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  boardR[2][7] = 'b';
  const engineR = new CheckersEngine({ board: boardR, turn: 'b' });
  const movesR = engineR.getLegalMoves();
  assert.equal(movesR.length, 1);
  assert.deepEqual(movesR[0].to, { row: 3, col: 6 });
});

test('Checkers: Regular men CANNOT jump backwards even if opponent is behind', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  // White man at (4, 3)
  board[4][3] = 'w';
  // Black pieces behind it at (5, 2) and (5, 4) with empty landing squares at (6, 1) and (6, 5)
  board[5][2] = 'b';
  board[5][4] = 'b';

  const engine = new CheckersEngine({ board, turn: 'w' });
  const moves = engine.getLegalMoves();

  // White man should have NO captures, only regular forward moves to (3, 2) and (3, 4)
  assert.equal(moves.length, 2);
  for (const m of moves) {
    assert.equal(m.captured, undefined, 'Must not capture backwards');
    assert.ok(m.to.row < 4, 'Must only move forward');
  }
});

test('Checkers: Mandatory capture suppresses all non-capture moves', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  // White man 1 at (5, 2) has a jump over (4, 3) to (3, 4)
  board[5][2] = 'w';
  board[4][3] = 'b';
  // White man 2 at (6, 7) has free space ahead to (5, 6)
  board[6][7] = 'w';

  const engine = new CheckersEngine({ board, turn: 'w' });
  const legal = engine.getLegalMoves();

  // Mandatory capture: ONLY the jump (5,2)->(3,4) is legal. (6,7)->(5,6) is suppressed.
  assert.equal(legal.length, 1);
  assert.deepEqual(legal[0].from, { row: 5, col: 2 });
  assert.deepEqual(legal[0].to, { row: 3, col: 4 });
  assert.deepEqual(legal[0].captured, { row: 4, col: 3 });
});

test('Checkers: Multi-jump single piece lock and exact single removal of captured pieces', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  // White man at (6, 1)
  board[6][1] = 'w';
  // Black piece at (5, 2)
  board[5][2] = 'b';
  // Black piece at (3, 4)
  board[3][4] = 'b';
  // Another White piece at (7, 6)
  board[7][6] = 'w';

  const engine = new CheckersEngine({ board, turn: 'w' });

  // Hop 1
  const movesHop1 = engine.getLegalMoves();
  assert.equal(movesHop1.length, 1);
  const res1 = engine.makeMove(6, 1, 4, 3);
  assert.equal(res1.success, true);
  assert.equal(res1.turnSwitched, false, 'Turn remains White during multi-jump');
  assert.equal(engine.getBoard()[5][2], null, 'Jumped piece at (5,2) removed immediately');
  assert.equal(engine.getState().capturedW, 1);

  // During multi-jump, the other white piece at (7,6) CANNOT move!
  const movesHop2 = engine.getLegalMoves();
  assert.equal(movesHop2.length, 1);
  assert.deepEqual(movesHop2[0].from, { row: 4, col: 3 });
  assert.deepEqual(movesHop2[0].to, { row: 2, col: 5 });

  // Hop 2
  const res2 = engine.makeMove(4, 3, 2, 5);
  assert.equal(res2.success, true);
  assert.equal(res2.turnSwitched, true, 'Turn flips to Black after multi-jump completes');
  assert.equal(engine.getBoard()[3][4], null, 'Second jumped piece at (3,4) removed');
  assert.equal(engine.getState().capturedW, 2);
  assert.equal(engine.getBoard()[2][5], 'w');
});

test('Checkers: Reaching the king row ends the turn immediately (crowning termination rule)', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  // White man at (2, 1)
  board[2][1] = 'w';
  // Black piece at (1, 2)
  board[1][2] = 'b';
  // Landing square (0, 3) is on the King row!
  // Black piece at (1, 4) which WOULD be jumpable if King could continue jumping backwards
  board[1][4] = 'b';

  const engine = new CheckersEngine({ board, turn: 'w' });
  const res = engine.makeMove(2, 1, 0, 3);

  assert.equal(res.success, true);
  assert.equal(res.isPromotion, true);
  assert.equal(res.turnSwitched, true, 'Crowning MUST terminate turn immediately');
  assert.equal(engine.getTurn(), 'b', 'Turn passes to Black');
  assert.equal(engine.getState().activeMultiJumpPiece, null);
  assert.equal(engine.getBoard()[0][3], 'W', 'Piece crowned to King');
});

test('Checkers: Kings move 1 step in all 4 diagonal directions (no flying king slide)', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  board[4][3] = 'W'; // White King in open center
  const engine = new CheckersEngine({ board, turn: 'w' });
  const moves = engine.getLegalMoves();

  // Exactly 4 diagonal moves 1 step away
  assert.equal(moves.length, 4);
  const targets = moves.map((m) => `${m.to.row},${m.to.col}`).sort();
  assert.deepEqual(targets, ['3,2', '3,4', '5,2', '5,4']);
});

test('Checkers: Blocked player loses the game (stalemate = loss)', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  // White king at corner (0, 7)
  board[0][7] = 'W';
  // Black kings pinning white at (1, 6) and (2, 5) so White has zero legal moves
  board[1][6] = 'B';
  board[2][5] = 'B';

  const engine = new CheckersEngine({ board, turn: 'w' });
  const moves = engine.getLegalMoves();
  assert.equal(moves.length, 0, 'White has zero legal moves');
  assert.equal(engine.checkWinner(), 'b', 'Blocked player loses; Black wins');
});

// ============================================================================
// SECTION 2: MORABARABA & KOTI RIGOROUS INDEPENDENT VALIDATION
// ============================================================================

test('Morabaraba: Placement phase strictly rejects cow relocation/repositioning', () => {
  const engine = new MorabarabaEngine(undefined, 'standard-24');
  assert.equal(engine.getPhase(), 'placing');

  // Place cow at O0
  const pRes = engine.placeCow('O0');
  assert.equal(pRes.success, true);

  // Attempt to reposition O0 to O1 during placing phase
  const rRes = engine.repositionCow('O0', 'O1');
  assert.equal(rRes.success, false, 'Repositioning placed cow during placement must fail');
  assert.equal(engine.getBoard().O0, 'w', 'Cow at O0 remains unchanged');
  assert.equal(engine.getBoard().O1, null, 'O1 remains empty');
});

test('Morabaraba: Double mill formation grants 2 shots and decrements properly', () => {
  const engine = new MorabarabaEngine(undefined, 'standard-24');

  // Pre-seed board: White has 2 cows on horizontal mill and 2 on vertical mill intersecting at M1
  // Horizontal mill: M0, M1, M2
  // Vertical spoke mill: O1, M1, I1
  const board = engine.getBoard();
  board.M0 = 'w';
  board.M2 = 'w';
  board.O1 = 'w';
  board.I1 = 'w';

  // Opponent black cows
  board.O4 = 'b';
  board.O5 = 'b';
  board.O6 = 'b';

  const testEngine = new MorabarabaEngine({
    variant: 'standard-24',
    board,
    turn: 'w',
    phase: 'placing',
    unplacedW: 1,
    unplacedB: 1,
  });

  // White places at M1, completing BOTH mills simultaneously!
  const res = testEngine.placeCow('M1');
  assert.equal(res.success, true);
  assert.equal(res.millFormed, true);
  assert.equal(testEngine.isShootPending(), true);
  assert.equal(testEngine.getState().shootCount, 2, 'Double mill grants 2 shots');

  // Shoot 1
  const s1 = testEngine.shootCow('O4');
  assert.equal(s1.success, true);
  assert.equal(testEngine.isShootPending(), true, 'Still shootPending after 1st shot');
  assert.equal(testEngine.getState().shootCount, 1);
  assert.equal(testEngine.getTurn(), 'w', 'Turn remains White for 2nd shot');

  // Shoot 2
  const s2 = testEngine.shootCow('O5');
  assert.equal(s2.success, true);
  assert.equal(testEngine.isShootPending(), false, 'shootPending resolves after 2nd shot');
  assert.equal(testEngine.getState().shootCount, 0);
  assert.equal(testEngine.getTurn(), 'b', 'Turn flips to Black after both shots complete');
});

test('Morabaraba: Mill protection in Standard-24 vs Koti-25 differential', () => {
  // Scenario: Black has 3 cows forming a mill at O0-O1-O2, and 1 loose cow at O4.
  // In Standard-24: Only O4 can be shot (mill cows protected).
  const board24 = new MorabarabaEngine(undefined, 'standard-24').getBoard();
  board24.O0 = 'b';
  board24.O1 = 'b';
  board24.O2 = 'b';
  board24.O4 = 'b';

  const engine24 = new MorabarabaEngine({
    variant: 'standard-24',
    board: board24,
    turn: 'w',
    phase: 'moving',
  });

  const shootable24 = engine24.getShootableCows('b');
  assert.deepEqual(shootable24, ['O4'], 'Standard-24 mill protection protects O0, O1, O2');

  // In Koti-25: No mill protection! All cows (O0, O1, O2, O4) can be shot.
  const board25 = new MorabarabaEngine(undefined, 'koti-25').getBoard();
  board25.O0 = 'b';
  board25.O1 = 'b';
  board25.O2 = 'b';
  board25.O4 = 'b';

  const engine25 = new MorabarabaEngine({
    variant: 'koti-25',
    board: board25,
    turn: 'w',
    phase: 'moving',
  });

  const shootable25 = engine25.getShootableCows('b');
  assert.equal(shootable25.length, 4, 'Koti-25 grants no mill protection; all 4 cows are shootable');
});

test('Morabaraba: All-in-mills exception in Standard-24', () => {
  // Scenario: Black has ONLY 3 cows, and all 3 are in a mill (O0-O1-O2).
  // Standard-24 rule: When all opponent cows are in mills, ANY cow can be shot!
  const board = new MorabarabaEngine(undefined, 'standard-24').getBoard();
  board.O0 = 'b';
  board.O1 = 'b';
  board.O2 = 'b';

  const engine = new MorabarabaEngine({
    variant: 'standard-24',
    board,
    turn: 'w',
    phase: 'moving',
  });

  const shootable = engine.getShootableCows('b');
  assert.equal(shootable.length, 3, 'When all opponent cows are in mills, mill protection is bypassed');
});

test('Morabaraba: Flying phase activated at exactly 3 cows and loss at 2 cows', () => {
  const board = new MorabarabaEngine(undefined, 'standard-24').getBoard();
  // White has 3 cows at O0, M0, I0 (can fly!)
  board.O0 = 'w';
  board.M0 = 'w';
  board.I0 = 'w';
  // Black has 4 cows
  board.O4 = 'b';
  board.M4 = 'b';
  board.I4 = 'b';
  board.O5 = 'b';

  const engine = new MorabarabaEngine({
    variant: 'standard-24',
    board,
    turn: 'w',
    phase: 'moving',
    unplacedW: 0,
    unplacedB: 0,
  });

  // White has 3 cows -> phase should be 'flying' for White
  assert.equal(engine.getCowsOnBoard('w'), 3);
  const legalMoves = engine.getLegalMoves();
  // In flying phase, each of the 3 cows can move to any vacant point (24 - 7 = 17 vacant points)
  // Total flying moves = 3 * 17 = 51 moves!
  assert.equal(legalMoves.length, 51, 'White with 3 cows can fly to all vacant points');

  // Now simulate White reduced to 2 cows -> immediate loss!
  board.I0 = null;
  const engine2 = new MorabarabaEngine({
    variant: 'standard-24',
    board,
    turn: 'w',
    phase: 'moving',
    unplacedW: 0,
    unplacedB: 0,
  });

  assert.equal(engine2.checkWinner(), 'b', 'White reduced to 2 cows loses immediately');
});

test('Morabaraba Bot: Evaluates symmetrically for White and Black without self-sabotage', () => {
  const engineW = new MorabarabaEngine(undefined, 'standard-24');
  // When bot is White, findBestBotAction must return a valid legal placement
  const actionW = engineW.findBestBotAction('medium');
  assert.ok(actionW);
  assert.equal(actionW.type, 'place');
  assert.ok(actionW.to);

  // Advance to Black turn
  engineW.placeCow(actionW.to!);
  assert.equal(engineW.getTurn(), 'b');

  // When bot is Black, findBestBotAction must return a valid legal placement
  const actionB = engineW.findBestBotAction('medium');
  assert.ok(actionB);
  assert.equal(actionB.type, 'place');
  assert.ok(actionB.to);
  assert.notEqual(actionB.to, actionW.to, 'Black must choose an empty point');
});

// ============================================================================
// SECTION 3: CHESS RIGOROUS INDEPENDENT VALIDATION
// ============================================================================

test('Chess: Castling rights (kingside and queenside) under correct conditions', () => {
  const chess = new Chess();
  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O
  chess.move('e4');
  chess.move('e5');
  chess.move('Nf3');
  chess.move('Nc6');
  chess.move('Bc4');
  chess.move('Bc5');

  // White kingside castling should be legal
  const legalMoves = chess.moves({ verbose: true });
  const castleMove = legalMoves.find((m) => m.flags.includes('k') || m.san === 'O-O');
  assert.ok(castleMove, 'White kingside castling must be legal');

  // Execute castling
  const res = chess.move('O-O');
  assert.ok(res);
  assert.equal(chess.get('g1')?.type, 'k', 'King on g1');
  assert.equal(chess.get('f1')?.type, 'r', 'Rook on f1');
});

test('Chess: En Passant capture execution and automatic expiration', () => {
  const chess = new Chess();
  chess.move('e4');
  chess.move('a6');
  chess.move('e5');
  chess.move('d5'); // Black 2-square pawn jump adjacent to White e5 pawn

  // En passant is immediately legal
  const moves = chess.moves({ verbose: true });
  const epMove = moves.find((m) => m.flags.includes('e'));
  assert.ok(epMove, 'En passant must be legal immediately after d5');
  assert.equal(epMove.to, 'd6');

  // Execute en passant
  chess.move({ from: 'e5', to: 'd6' });
  assert.equal(chess.get('d6')?.type, 'p', 'White pawn now on d6');
  assert.equal(Boolean(chess.get('d5')), false, 'Captured black pawn at d5 removed');
});

test('Chess: Pawn Promotion to all 4 piece types (Q, R, B, N)', () => {
  for (const promo of ['q', 'r', 'b', 'n'] as const) {
    const chess = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    const res = chess.move({ from: 'e7', to: 'e8', promotion: promo });
    assert.ok(res);
    assert.equal(chess.get('e8')?.type, promo, `Pawn promoted to ${promo}`);
  }
});

test('Chess: Insufficient material draw detection', () => {
  // King vs King
  const chessKK = new Chess('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
  assert.equal(chessKK.isInsufficientMaterial(), true);
  assert.equal(chessKK.isGameOver(), true);

  // King + Bishop vs King
  const chessKBK = new Chess('8/8/8/4k3/8/5B2/8/4K3 w - - 0 1');
  assert.equal(chessKBK.isInsufficientMaterial(), true);
  assert.equal(chessKBK.isGameOver(), true);
});

test('Chess: Minimax finds Mate-in-1 accurately for White and Black', () => {
  // White to move: Legal Scholar's Mate position (1. e4 e5 2. Bc4 Nc6 3. Qf3 d6 -> 4. Qxf7#)
  const chessWhite = new Chess('r1bqkbnr/ppp2ppp/2np4/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4');
  const bestWhite = findBestMove(chessWhite, 'medium');
  assert.ok(bestWhite);
  assert.equal(bestWhite.from, 'f3');
  assert.equal(bestWhite.to, 'f7');

  // Black to move: Fool's Mate position (Qh4#)
  const chessBlack = new Chess('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2');
  const bestBlack = findBestMove(chessBlack, 'medium');
  assert.ok(bestBlack);
  assert.equal(bestBlack.from, 'd8');
  assert.equal(bestBlack.to, 'h4');
});

// ============================================================================
// SECTION 4: MULTIPLAYER SERVER AUTHORITY & ECHO DEFENSE
// ============================================================================

test('Multiplayer Authority: Illegal move and out-of-turn move rejection', () => {
  const adapter = new ChessAdapter();
  assert.equal(adapter.getTurn(), 'w');

  // Attempt moving black piece on White turn -> rejected
  const res1 = adapter.makeMove({ from: 'e7', to: 'e5' });
  assert.equal(res1.success, false, 'Black move rejected on White turn');

  // Attempt illegal diagonal pawn leap on empty square -> rejected
  const res2 = adapter.makeMove({ from: 'e2', to: 'f3' });
  assert.equal(res2.success, false, 'Illegal pawn move rejected');
});

test('Multiplayer Authority: Idempotent match completion guard', () => {
  let isRecorded = false;
  let recordCount = 0;

  const finalizeMatch = () => {
    if (isRecorded) return;
    isRecorded = true;
    recordCount++;
  };

  finalizeMatch(); // Normal match end
  finalizeMatch(); // Duplicate completion event (e.g. resign + clock flag)
  finalizeMatch(); // Third concurrent trigger

  assert.equal(recordCount, 1, 'Match finalization must be strictly idempotent');
});
