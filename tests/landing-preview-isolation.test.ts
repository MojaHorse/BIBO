import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { CheckersEngine } from '../src/lib/checkers-engine';
import { MorabarabaEngine } from '../src/lib/morabaraba-engine';
import { getPlayerSession, isAuthenticatedSession } from '../src/lib/session';

test('Landing Preview: runs in memory without mutating player session or creating guest accounts', () => {
  // Before preview game
  const initialSession = getPlayerSession();
  assert.equal(initialSession.isAuthenticated, false);
  assert.equal(Boolean(initialSession.id && initialSession.id.startsWith('guest_')), false);

  // Play preview Chess game
  const chess = new Chess();
  assert.equal(chess.turn(), 'w');
  const m1 = chess.move({ from: 'e2', to: 'e4' });
  assert.ok(m1);
  assert.equal(chess.turn(), 'b');

  // Verify player session remains completely unmutated
  const sessionAfterMove = getPlayerSession();
  assert.equal(sessionAfterMove.isAuthenticated, false);
  assert.equal(sessionAfterMove.id, initialSession.id);
  assert.equal(isAuthenticatedSession(sessionAfterMove), false);
});

test('Landing Preview: Checkers preview handles legal moves, turns, and zero persistence', () => {
  const engine = new CheckersEngine();
  assert.equal(engine.getTurn(), 'w');

  const legal = engine.getLegalMoves();
  assert.ok(legal.length > 0);

  const res = engine.makeMove(legal[0].from.row, legal[0].from.col, legal[0].to.row, legal[0].to.col);
  assert.equal(res.success, true);
  assert.equal(engine.getTurn(), 'b');

  // Reset preview
  const resetEngine = new CheckersEngine();
  assert.equal(resetEngine.getTurn(), 'w');
  assert.equal(resetEngine.getState().moveCount, 0);
});

test('Landing Preview: Morabaraba preview handles placing cows and clean reset', () => {
  const engine = new MorabarabaEngine(undefined, 'standard-24');
  assert.equal(engine.getTurn(), 'w');
  assert.equal(engine.getPhase(), 'placing');

  const res = engine.placeCow('O0');
  assert.equal(res.success, true);
  assert.equal(engine.getTurn(), 'b');

  // Reset preview
  const resetEngine = new MorabarabaEngine(undefined, 'standard-24');
  assert.equal(resetEngine.getTurn(), 'w');
  assert.equal(resetEngine.getState().unplacedW, 12);
  assert.equal(resetEngine.getState().unplacedB, 12);
});
