import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckersEngine, Piece } from '../src/lib/checkers-engine';

test('Checkers Engine: King can slide multiple steps diagonally along open lines', () => {
  // Empty board with White King at C3 (row 5, col 2)
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  board[5][2] = 'W'; // White King

  const engine = new CheckersEngine({ board, turn: 'w' });
  const moves = engine.getLegalMoves();

  // White King at (5, 2) can move along:
  // Up-Left: (4, 1), (3, 0)
  // Up-Right: (4, 3), (3, 4), (2, 5), (1, 6), (0, 7)
  // Down-Left: (6, 1), (7, 0)
  // Down-Right: (6, 3), (7, 4)
  const toSquares = moves.map((m) => `${m.to.row},${m.to.col}`);

  // Test multi-step reaches
  assert.ok(toSquares.includes('3,0'), 'King should reach (3,0) 2 steps away');
  assert.ok(toSquares.includes('0,7'), 'King should reach (0,7) 5 steps away');
  assert.ok(toSquares.includes('7,0'), 'King should reach (7,0) 2 steps away');
  assert.ok(toSquares.includes('7,4'), 'King should reach (7,4) 2 steps away');

  // Slide King across 5 squares to (0, 7)
  const res = engine.makeMove(5, 2, 0, 7);
  assert.equal(res.success, true);
  assert.equal(engine.getBoard()[0][7], 'W');
  assert.equal(engine.getBoard()[5][2], null);
});

test('Checkers Engine: King can jump an opponent piece multiple steps away and land beyond it', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // White King at (6, 1) [B2 in notation]
  board[6][1] = 'W';
  // Black piece at (3, 4) [E5 in notation] - 3 squares away diagonally
  board[3][4] = 'b';
  // Landing squares beyond it: (2, 5) and (1, 6) and (0, 7) are empty!

  const engine = new CheckersEngine({ board, turn: 'w' });
  const legalMoves = engine.getLegalMoves();

  // King must jump (mandatory capture)
  assert.ok(legalMoves.length >= 3, 'King should have multiple landing options behind opponent');
  for (const m of legalMoves) {
    assert.deepEqual(m.captured, { row: 3, col: 4 });
  }

  const landingTargets = legalMoves.map((m) => `${m.to.row},${m.to.col}`);
  assert.ok(landingTargets.includes('2,5'), 'Landing on immediate square behind (2,5)');
  assert.ok(landingTargets.includes('1,6'), 'Landing 2 squares behind (1,6)');
  assert.ok(landingTargets.includes('0,7'), 'Landing 3 squares behind (0,7)');

  // Execute long-range jump landing at (0, 7)
  const res = engine.makeMove(6, 1, 0, 7);
  assert.equal(res.success, true);
  assert.equal(res.isCapture, true);
  assert.equal(engine.getBoard()[3][4], null, 'Captured black piece removed');
  assert.equal(engine.getBoard()[0][7], 'W', 'King landed at (0,7)');
});

test('Checkers Engine: King multi-jump across multiple diagonal steps', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Black King at (1, 0)
  board[1][0] = 'B';
  // White piece at (3, 2)
  board[3][2] = 'w';
  // White piece at (3, 6)
  board[3][6] = 'w';

  // Hop 1: (1, 0) jumps over (3, 2) landing at (5, 4)
  // Hop 2: From (5, 4), King can jump over (3, 6) landing at (1, 8 is off board, so (2, 7) is landing square!)
  const engine = new CheckersEngine({ board, turn: 'b' });

  // First hop
  const movesHop1 = engine.getLegalMoves();
  const hop1 = movesHop1.find((m) => m.to.row === 5 && m.to.col === 4);
  assert.ok(hop1, 'Hop 1 landing at (5,4) must be legal');

  const res1 = engine.makeMove(1, 0, 5, 4);
  assert.equal(res1.success, true);
  assert.equal(res1.isCapture, true);
  assert.equal(res1.turnSwitched, false, 'Turn must NOT switch because multi-jump is available');
  assert.equal(engine.getTurn(), 'b');
  assert.deepEqual(engine.getState().activeMultiJumpPiece, { row: 5, col: 4 });

  // Second hop: only moves from (5, 4) are allowed
  const movesHop2 = engine.getLegalMoves();
  assert.ok(movesHop2.length > 0);
  assert.equal(movesHop2[0].from.row, 5);
  assert.equal(movesHop2[0].from.col, 4);
  assert.deepEqual(movesHop2[0].captured, { row: 3, col: 6 });

  // Execute second hop
  const res2 = engine.makeMove(5, 4, movesHop2[0].to.row, movesHop2[0].to.col);
  assert.equal(res2.success, true);
  assert.equal(res2.isCapture, true);
  assert.equal(res2.turnSwitched, true, 'Turn flips to white after finishing all jumps');
  assert.equal(engine.getTurn(), 'w');
  assert.equal(engine.getState().activeMultiJumpPiece, null);
});

test('Checkers Engine: Men can jump backwards over adjacent opponent pieces', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // White man at (4, 3)
  board[4][3] = 'w';
  // Black piece behind it at (5, 4)
  board[5][4] = 'b';
  // (6, 5) is empty

  const engine = new CheckersEngine({ board, turn: 'w' });
  const legalMoves = engine.getLegalMoves();

  // White man should have backward jump to (6, 5)
  const backwardJump = legalMoves.find((m) => m.to.row === 6 && m.to.col === 5);
  assert.ok(backwardJump, 'White man must be able to jump backward over adjacent black piece');

  const res = engine.makeMove(4, 3, 6, 5);
  assert.equal(res.success, true);
  assert.equal(res.isCapture, true);
  assert.equal(engine.getBoard()[5][4], null);
  assert.equal(engine.getBoard()[6][5], 'w');
});

test('Checkers Engine: Bot AI completes multi-jump sequences without freezing', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Black king at (1, 0)
  board[1][0] = 'B';
  // White pieces at (3, 2) and (3, 6)
  board[3][2] = 'w';
  board[3][6] = 'w';

  const engine = new CheckersEngine({ board, turn: 'b' });

  // Bot finds move 1
  const botMove1 = engine.findBestMove('easy');
  assert.ok(botMove1);
  const res1 = engine.makeMove(botMove1.from.row, botMove1.from.col, botMove1.to.row, botMove1.to.col);
  assert.equal(res1.success, true);

  // If multi-jump is in progress, engine still reports turn as 'b' and finds bot move 2
  if (!res1.turnSwitched) {
    assert.equal(engine.getTurn(), 'b');
    const botMove2 = engine.findBestMove('easy');
    assert.ok(botMove2, 'Bot must find subsequent hop');
    assert.equal(botMove2.from.row, botMove1.to.row);
    assert.equal(botMove2.from.col, botMove1.to.col);

    const res2 = engine.makeMove(botMove2.from.row, botMove2.from.col, botMove2.to.row, botMove2.to.col);
    assert.equal(res2.success, true);
    assert.equal(res2.turnSwitched, true);
    assert.equal(engine.getTurn(), 'w');
  }
});
