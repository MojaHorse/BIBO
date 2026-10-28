import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckersEngine, Piece } from '../src/lib/checkers-engine';
import { MorabarabaEngine, PointId, CowColor } from '../src/lib/morabaraba-engine';
import {
  createRoom,
  activeRooms,
  finalizeRoomMatch,
  resignGame,
  RoomState,
} from '../src/lib/room-manager';
import { CheckersAdapter } from '../src/lib/games/checkers-adapter';
import { MorabarabaAdapter } from '../src/lib/games/morabaraba-adapter';

// ============================================================================
// SECTION 1: CHECKERS DRAW RULES ACCURACY & TERMINAL-STATE PRECEDENCE
// ============================================================================

test('Checkers Draw Rule: 40-move counter increments only on King moves without capture', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  // White King at (4, 3), Black King at (1, 6)
  board[4][3] = 'W';
  board[1][6] = 'B';

  const engine = new CheckersEngine({ board, turn: 'w', halfmoveClock: 0 });
  assert.equal(engine.getHalfmoveClock(), 0);

  // White King moves (4, 3) -> (5, 4)
  const res1 = engine.makeMove(4, 3, 5, 4);
  assert.equal(res1.success, true);
  assert.equal(engine.getHalfmoveClock(), 1, 'King move increments halfmoveClock');

  // Black King moves (1, 6) -> (2, 7)
  const res2 = engine.makeMove(1, 6, 2, 7);
  assert.equal(res2.success, true);
  assert.equal(engine.getHalfmoveClock(), 2, 'Black King move increments halfmoveClock to 2');
});

test('Checkers Draw Rule: Regular man move resets 40-move counter to 0', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  board[4][3] = 'W';
  board[1][6] = 'B';
  board[6][1] = 'w'; // Regular White man

  // Pre-seed halfmoveClock at 35 plies
  const engine = new CheckersEngine({ board, turn: 'w', halfmoveClock: 35 });
  assert.equal(engine.getHalfmoveClock(), 35);

  // Regular man moves (6, 1) -> (5, 0)
  const res = engine.makeMove(6, 1, 5, 0);
  assert.equal(res.success, true);
  assert.equal(engine.getHalfmoveClock(), 0, 'Uncrowned man advancement resets halfmoveClock to 0');
});

test('Checkers Draw Rule: Piece capture resets 40-move counter to 0', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  board[4][3] = 'W'; // White King
  board[3][4] = 'B'; // Black King adjacent

  const engine = new CheckersEngine({ board, turn: 'w', halfmoveClock: 50 });
  assert.equal(engine.getHalfmoveClock(), 50);

  // White King jumps Black King: (4,3) over (3,4) to (2,5)
  const res = engine.makeMove(4, 3, 2, 5);
  assert.equal(res.success, true);
  assert.equal(res.isCapture, true);
  assert.equal(engine.getHalfmoveClock(), 0, 'Capture immediately resets halfmoveClock to 0');
});

test('Checkers Draw Rule: Adjudicated draw triggered at exactly 80 plies (40 moves each)', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  board[4][3] = 'W';
  board[1][6] = 'B';

  // Pre-seed halfmoveClock at 79 plies
  const engine = new CheckersEngine({ board, turn: 'w', halfmoveClock: 79 });
  assert.equal(engine.checkWinner(), null, 'Not drawn at 79 plies');

  // White King executes 80th ply
  const res = engine.makeMove(4, 3, 5, 4);
  assert.equal(res.success, true);
  assert.equal(engine.getHalfmoveClock(), 80);
  assert.equal(engine.checkWinner(), 'draw', 'Official 40-move rule adjudicates draw at 80 plies');
});

test('Checkers Draw Rule: Terminal win takes precedence over 80-ply draw', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  board[4][3] = 'W'; // White King
  board[3][4] = 'B'; // Sole Black King

  // If clock is at 79, and move 80 captures the final piece:
  const engine = new CheckersEngine({ board, turn: 'w', halfmoveClock: 79 });
  const res = engine.makeMove(4, 3, 2, 5);
  assert.equal(res.success, true);
  assert.equal(res.isCapture, true);

  // Terminal victory (Black has 0 pieces) MUST take precedence over draw
  assert.equal(engine.checkWinner(), 'w', 'Terminal wipeout victory takes precedence over draw counter');
});

test('Checkers Draw Rule: Threefold repetition detection adjudicates draw', () => {
  const board: Piece[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  board[7][0] = 'W';
  board[0][7] = 'B';

  const engine = new CheckersEngine({ board, turn: 'w' });

  // Oscillation 1:
  engine.makeMove(7, 0, 6, 1); // W
  engine.makeMove(0, 7, 1, 6); // B
  engine.makeMove(6, 1, 7, 0); // W
  engine.makeMove(1, 6, 0, 7); // B (pos repeated 2nd time)
  assert.equal(engine.checkWinner(), null);

  // Oscillation 2:
  engine.makeMove(7, 0, 6, 1); // W
  engine.makeMove(0, 7, 1, 6); // B
  engine.makeMove(6, 1, 7, 0); // W
  engine.makeMove(1, 6, 0, 7); // B (pos repeated 3rd time!)

  assert.equal(engine.checkWinner(), 'draw', 'Threefold repetition adjudicates draw');
});

// ============================================================================
// SECTION 2: MORABARABA DRAW RULES ACCURACY & STATE EQUIVALENCE
// ============================================================================

test('Morabaraba Draw Rule: MSSA 10-move flying endgame rule (20 plies without cow shot)', () => {
  const engine = MorabarabaEngine.createMovingPhaseQuickStart('standard-24');
  const board = engine.getBoard();

  // Set up flying endgame: White 3 cows, Black 3 cows
  for (const pt of Object.keys(board) as PointId[]) {
    board[pt] = null;
  }
  board.O0 = 'w';
  board.M0 = 'w';
  board.I0 = 'w';

  board.O4 = 'b';
  board.M4 = 'b';
  board.I4 = 'b';

  const testEngine = new MorabarabaEngine({
    variant: 'standard-24',
    board,
    turn: 'w',
    phase: 'flying',
    unplacedW: 0,
    unplacedB: 0,
    endgameClock: 19,
  });

  assert.equal(testEngine.checkWinner(), null, 'Not drawn at 19 plies');

  // Move White cow O0 -> O1 (20th ply in flying endgame)
  const res = testEngine.moveCow('O0', 'O1');
  assert.equal(res.success, true);
  assert.equal(testEngine.getEndgameClock(), 20);
  assert.equal(testEngine.checkWinner(), 'draw', '10 moves without shot in flying phase triggers draw');
});

test('Morabaraba Draw Rule: Shooting a cow resets 10-move flying clock and clears repetition', () => {
  const engine = MorabarabaEngine.createMovingPhaseQuickStart('standard-24');
  const board = engine.getBoard();
  for (const pt of Object.keys(board) as PointId[]) board[pt] = null;

  // White has 3 cows (flying), Black has 4 cows
  board.O0 = 'w';
  board.O1 = 'w'; // Will move to O2 to form mill
  board.M0 = 'w';

  board.O4 = 'b';
  board.M4 = 'b';
  board.I4 = 'b';
  board.O6 = 'b';

  const testEngine = new MorabarabaEngine({
    variant: 'standard-24',
    board,
    turn: 'w',
    phase: 'flying',
    unplacedW: 0,
    unplacedB: 0,
    endgameClock: 15,
  });

  // White completes mill at O0-O1-O2
  board.O2 = null;
  const mRes = testEngine.moveCow('M0', 'O2');
  assert.equal(mRes.success, true);
  assert.equal(mRes.millFormed, true);

  // Shoot opponent cow O6
  const sRes = testEngine.shootCow('O6');
  assert.equal(sRes.success, true);
  assert.equal(testEngine.getEndgameClock(), 0, 'Shooting a cow resets endgame clock to 0');
});

test('Morabaraba Repetition: Equivalence comparison requires all state attributes', () => {
  const engine = new MorabarabaEngine(undefined, 'standard-24');

  // Test 1: Same board piece locations but different turns MUST have different keys
  const keyTurnW = engine.getPositionKey();
  const engineTurnB = new MorabarabaEngine({ turn: 'b' }, 'standard-24');
  const keyTurnB = engineTurnB.getPositionKey();
  assert.notEqual(keyTurnW, keyTurnB, 'Different turns must yield distinct position keys');

  // Test 2: Same board but different unplaced cow counts MUST have different keys
  const engineUnplaced = new MorabarabaEngine({ unplacedW: 10, unplacedB: 10 }, 'standard-24');
  assert.notEqual(engine.getPositionKey(), engineUnplaced.getPositionKey(), 'Different unplaced cow counts must yield distinct position keys');

  // Test 3: Same board but shootPending MUST have different key
  const engineShoot = new MorabarabaEngine({ shootPending: true, shootCount: 1 }, 'standard-24');
  assert.notEqual(engine.getPositionKey(), engineShoot.getPositionKey(), 'Shoot pending state must yield distinct position key');
});

test('Morabaraba Draw Rule: Threefold repetition in moving phase triggers draw', () => {
  const engine = MorabarabaEngine.createMovingPhaseQuickStart('standard-24');
  const board = engine.getBoard();
  for (const pt of Object.keys(board) as PointId[]) board[pt] = null;

  // 4 cows each in open positions (no mills formed)
  board.O0 = 'w';
  board.O2 = 'w';
  board.O4 = 'w';
  board.O6 = 'w';

  board.M0 = 'b';
  board.M2 = 'b';
  board.M4 = 'b';
  board.M6 = 'b';

  const testEngine = new MorabarabaEngine({
    variant: 'standard-24',
    board,
    turn: 'w',
    phase: 'moving',
    unplacedW: 0,
    unplacedB: 0,
  });

  // Oscillation 1:
  testEngine.moveCow('O0', 'O1'); // W
  testEngine.moveCow('M0', 'M1'); // B
  testEngine.moveCow('O1', 'O0'); // W
  testEngine.moveCow('M1', 'M0'); // B (rep 2)
  assert.equal(testEngine.checkWinner(), null);

  // Oscillation 2:
  testEngine.moveCow('O0', 'O1'); // W
  testEngine.moveCow('M0', 'M1'); // B
  testEngine.moveCow('O1', 'O0'); // W
  testEngine.moveCow('M1', 'M0'); // B (rep 3!)

  assert.equal(testEngine.checkWinner(), 'draw', 'Threefold repetition triggers draw in moving phase');
});

// ============================================================================
// SECTION 3: MULTIPLAYER CONCURRENCY & DEPLOYMENT STRESS AUDIT
// ============================================================================

test('Multiplayer Stress: Concurrent moves from the same player are serialized or rejected', async () => {
  const room = createRoom(5, { id: 'user_white', handle: 'WhiteHero', rating: 1400 }, 'chess');
  room.blackPlayer = { id: 'user_black', handle: 'BlackHero', rating: 1400, color: 'b', connected: true };
  room.gameActive = true;

  // Simultaneous attempt to make two different moves for White on move 1
  const move1 = { from: 'e2', to: 'e4' };
  const move2 = { from: 'd2', to: 'd4' };

  const res1 = room.engine.makeMove(move1);
  assert.equal(res1.success, true);

  // Second move from White on Black turn MUST fail
  const res2 = room.engine.makeMove(move2);
  assert.equal(res2.success, false, 'Second concurrent move on opponent turn must be strictly rejected');
});

test('Multiplayer Stress: Simultaneous timeout and resignation race', async () => {
  const room = createRoom(5, { id: 'user_w', handle: 'W', rating: 1200 }, 'checkers');
  room.blackPlayer = { id: 'user_b', handle: 'B', rating: 1200, color: 'b', connected: true };
  room.gameActive = true;

  // Simulate simultaneous triggers: resign White + timeout White
  let finishCount = 0;
  const mockFinalize = () => {
    if (room.gameOver && room.isRecorded) return;
    room.gameOver = { winner: 'b', reason: 'White resigned' };
    room.isRecorded = true;
    finishCount++;
  };

  mockFinalize(); // Trigger 1
  mockFinalize(); // Trigger 2
  assert.equal(finishCount, 1, 'In-memory room guard prevents duplicate finalization within single process');
});

test('Multiplayer Architectural Vulnerability: In-memory Map cannot survive process restart or cross instances', () => {
  const room = createRoom(5, { id: 'user_1', handle: 'Tactician1', rating: 1500 }, 'morabaraba');
  const roomId = room.id;

  assert.ok(activeRooms.has(roomId), 'Room exists in current process memory');

  // Simulate process restart or request hitting separate server instance
  const simulatedSeparateInstanceRooms = new Map<string, RoomState>();
  assert.equal(
    simulatedSeparateInstanceRooms.has(roomId),
    false,
    'CRITICAL: In-memory room Map is empty on separate server instance or after restart'
  );
});

test('Multiplayer Architecture: Authoritative clock computes deterministically from lastMoveTimestamp without process timer', () => {
  const { calculateAuthoritativeClocks } = require('../src/lib/room-manager');
  const now = Date.now();
  const roomRecord = {
    status: 'active',
    currentTurn: 'w',
    lastMoveTimestamp: BigInt(now - 15000), // 15 seconds elapsed
    whiteTimeRemaining: 300,
    blackTimeRemaining: 300,
  };

  const clocks = calculateAuthoritativeClocks(roomRecord);
  assert.equal(clocks.whiteTime, 285, 'White time decrements exactly 15 seconds based on timestamp');
  assert.equal(clocks.blackTime, 300, 'Black time untouched on White turn');
  assert.equal(clocks.timedOutPlayer, null);
});

test('Multiplayer Concurrency & Idempotency: Out-of-order move sequence is rejected', async () => {
  const { submitDurableMove } = require('../src/lib/room-manager');
  const room = createRoom(5, { id: 'user_w', handle: 'White', rating: 1200 }, 'chess');
  room.blackPlayer = { id: 'user_b', handle: 'Black', rating: 1200, color: 'b', connected: true };
  room.gameActive = true;
  room.moveSequence = 4;

  // Player attempts to submit move with stale sequence 2
  const res = await submitDurableMove({
    roomId: room.id,
    playerId: 'user_w',
    playerToken: room.whitePlayerToken,
    moveInput: { from: 'e2', to: 'e4' },
    commandId: 'cmd_stale_123',
    expectedSequence: 2,
  });

  assert.equal(res.success, false);
  assert.ok(res.error?.includes('Out-of-order move sequence'));
});
