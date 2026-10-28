import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckersEngine, Piece } from '../src/lib/checkers-engine';

test('Checkers Engine: Regular men CANNOT move or jump backwards', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // White man at (4, 3)
  board[4][3] = 'w';
  // Black piece behind it at (5, 4)
  board[5][4] = 'b';
  // (6, 5) behind that is empty

  const engine = new CheckersEngine({ board, turn: 'w' });
  const legalMoves = engine.getLegalMoves();

  // White man must NOT have any backward move or backward jump
  const backwardMoves = legalMoves.filter((m) => m.to.row > 4);
  assert.equal(backwardMoves.length, 0, 'Regular white man must never move or jump backwards');

  // White man can only move forward (to rows 3)
  const forwardMoves = legalMoves.filter((m) => m.to.row < 4);
  assert.equal(forwardMoves.length, 2, 'White man has 2 forward moves: (3,2) and (3,4)');
});

test('Checkers Engine: King moves exactly 1 step in all 4 diagonal directions (no flying slide)', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  board[5][2] = 'W'; // White King

  const engine = new CheckersEngine({ board, turn: 'w' });
  const moves = engine.getLegalMoves();

  // White King at (5, 2) can ONLY reach immediate 1-step diagonals:
  // Up-Left: (4, 1)
  // Up-Right: (4, 3)
  // Down-Left: (6, 1)
  // Down-Right: (6, 3)
  const toSquares = moves.map((m) => `${m.to.row},${m.to.col}`).sort();
  const expected = ['4,1', '4,3', '6,1', '6,3'].sort();

  assert.deepEqual(toSquares, expected, 'King must move strictly 1 step diagonally in American Checkers');

  // Multi-step squares (e.g. 3,0 or 0,7) must NOT be reachable in one move
  assert.equal(toSquares.includes('3,0'), false);
  assert.equal(toSquares.includes('0,7'), false);
});

test('Checkers Engine: King jumps adjacent opponent piece and lands immediately behind it (no flying jump)', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // White King at (5, 2)
  board[5][2] = 'W';
  // Black piece adjacent at (4, 3)
  board[4][3] = 'b';
  // Landing square (3, 4) is empty

  const engine = new CheckersEngine({ board, turn: 'w' });
  const legalMoves = engine.getLegalMoves();

  assert.equal(legalMoves.length, 1, 'Only 1 mandatory capture must be available');
  assert.deepEqual(legalMoves[0].from, { row: 5, col: 2 });
  assert.deepEqual(legalMoves[0].to, { row: 3, col: 4 });
  assert.deepEqual(legalMoves[0].captured, { row: 4, col: 3 });

  const res = engine.makeMove(5, 2, 3, 4);
  assert.equal(res.success, true);
  assert.equal(res.isCapture, true);
  assert.equal(engine.getBoard()[4][3], null, 'Captured black piece removed');
  assert.equal(engine.getBoard()[3][4], 'W', 'King landed at (3,4)');
});

test('Checkers Engine: King multi-jump across consecutive adjacent pieces', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // White King at (6, 1)
  board[6][1] = 'W';
  // Black piece at (5, 2)
  board[5][2] = 'b';
  // Black piece at (3, 4)
  board[3][4] = 'b';

  const engine = new CheckersEngine({ board, turn: 'w' });

  // First hop: (6, 1) over (5, 2) to (4, 3)
  const movesHop1 = engine.getLegalMoves();
  assert.equal(movesHop1.length, 1);
  assert.equal(movesHop1[0].to.row, 4);
  assert.equal(movesHop1[0].to.col, 3);

  const res1 = engine.makeMove(6, 1, 4, 3);
  assert.equal(res1.success, true);
  assert.equal(res1.isCapture, true);
  assert.equal(res1.turnSwitched, false, 'Turn must NOT switch because multi-jump is available');
  assert.equal(engine.getTurn(), 'w');
  assert.deepEqual(engine.getState().activeMultiJumpPiece, { row: 4, col: 3 });

  // Second hop: (4, 3) over (3, 4) to (2, 5)
  const movesHop2 = engine.getLegalMoves();
  assert.equal(movesHop2.length, 1);
  assert.equal(movesHop2[0].from.row, 4);
  assert.equal(movesHop2[0].from.col, 3);
  assert.equal(movesHop2[0].to.row, 2);
  assert.equal(movesHop2[0].to.col, 5);

  const res2 = engine.makeMove(4, 3, 2, 5);
  assert.equal(res2.success, true);
  assert.equal(res2.isCapture, true);
  assert.equal(res2.turnSwitched, true, 'Turn flips to black after multi-jump completes');
  assert.equal(engine.getTurn(), 'b');
  assert.equal(engine.getState().activeMultiJumpPiece, null);
});

test('Checkers Engine: Crowning a King ends the turn immediately (no continued jump on promotion)', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // White regular man at (2, 1)
  board[2][1] = 'w';
  // Black piece to jump at (1, 2)
  board[1][2] = 'b';
  // King row landing square (0, 3) is empty!
  // Another Black piece at (1, 4) that would be jumpable as a King from (0, 3)
  board[1][4] = 'b';

  const engine = new CheckersEngine({ board, turn: 'w' });

  // White man jumps (2,1) over (1,2) to (0,3) on king row
  const res = engine.makeMove(2, 1, 0, 3);
  assert.equal(res.success, true);
  assert.equal(res.isCapture, true);
  assert.equal(res.isPromotion, true);
  assert.equal(engine.getBoard()[0][3], 'W', 'Man crowned to King');

  // Official American Checkers rule: turn terminates immediately upon crowning!
  assert.equal(res.turnSwitched, true, 'Turn must switch immediately upon crowning');
  assert.equal(engine.getTurn(), 'b', 'Turn flips to Black');
  assert.equal(engine.getState().activeMultiJumpPiece, null);
});

test('Checkers Engine: Bot AI completes multi-jump sequences without freezing', () => {
  const board: Piece[][] = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

  // Black king at (1, 0)
  board[1][0] = 'B';
  // White piece at (2, 1)
  board[2][1] = 'w';
  // White piece at (4, 3)
  board[4][3] = 'w';

  const engine = new CheckersEngine({ board, turn: 'b' });

  // Bot finds move 1
  const botMove1 = engine.findBestMove('easy');
  assert.ok(botMove1);
  const res1 = engine.makeMove(botMove1.from.row, botMove1.from.col, botMove1.to.row, botMove1.to.col);
  assert.equal(res1.success, true);

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
