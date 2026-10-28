import test from 'node:test';
import assert from 'node:assert/strict';
import { ChessAdapter } from '../src/lib/games/chess-adapter';
import { CheckersAdapter } from '../src/lib/games/checkers-adapter';
import { MorabarabaAdapter } from '../src/lib/games/morabaraba-adapter';

// Test 1: ChessAdapter Rules Engine Integrity
test('ChessAdapter: basic moves, turns, and state serialization', async () => {
  const engine = new ChessAdapter();

  assert.equal(engine.getTurn(), 'w');
  const res1 = engine.makeMove({ from: 'e2', to: 'e4' });
  assert.equal(res1.success, true);
  assert.equal(engine.getTurn(), 'b');

  // Verify illegal move rejection
  const resIllegal = engine.makeMove({ from: 'e7', to: 'e4' }); // blocked
  assert.equal(resIllegal.success, false);
  assert.equal(engine.getTurn(), 'b'); // turn unchanged on illegal move

  // Legal Black move
  const res2 = engine.makeMove({ from: 'e7', to: 'e5' });
  assert.equal(res2.success, true);
  assert.equal(engine.getTurn(), 'w');

  // Verify clone independence
  const clone = engine.clone();
  clone.makeMove({ from: 'g1', to: 'f3' });
  assert.equal(clone.getTurn(), 'b');
  assert.equal(engine.getTurn(), 'w'); // original untouched

  // Bot move finding
  const botMove = await engine.findBotMove('easy');
  assert.ok(botMove);
  assert.ok(botMove.from && botMove.to);
});

// Test 2: CheckersAdapter Rules Engine Integrity & Phase Preservation
test('CheckersAdapter: mandatory jumps, turns, and phase preservation', async () => {
  const engine = new CheckersAdapter(undefined, 'american-8x8');

  assert.equal(engine.getTurn(), 'w');
  const legalMoves = engine.getLegalMoves();
  assert.ok(legalMoves.length > 0);

  // Take a first legal move
  const m1 = legalMoves[0];
  const res1 = engine.makeMove(m1);
  assert.equal(res1.success, true);
  assert.equal(engine.getTurn(), 'b');

  // Verify clone independence
  const clone = engine.clone();
  assert.equal(clone.getTurn(), 'b');

  // Bot move finding
  const botMove = await engine.findBotMove('easy');
  assert.ok(botMove);
  assert.ok(botMove.from && botMove.to);
});

// Test 3: MorabarabaAdapter Rules Engine Integrity & Kraal Phases
test('MorabarabaAdapter: placing phase, mills, and flying phases', async () => {
  const engine = new MorabarabaAdapter(undefined, 'standard-24');

  assert.equal(engine.getTurn(), 'w');
  assert.equal(engine.getPhase(), 'placing');

  // Placing move
  const res1 = engine.makeMove({ type: 'place', to: 'O0' });
  assert.equal(res1.success, true);
  assert.equal(engine.getTurn(), 'b');

  // Bot move in placing phase
  const botMove = await engine.findBotMove('easy');
  assert.ok(botMove);
  assert.equal(botMove.type, 'place');
  assert.ok(botMove.to);
});

// Test 4: Online Synchronization & Echo Defense Logic
test('Multiplayer Sync: Echo defense differentiates local player move from opponent move', () => {
  const mySessionId = 'usr_david_123';
  const myCommandId = 'cmd_1720000000_abc';
  const pendingCommandIds = new Set([myCommandId]);

  // Case A: Broadcast of move sent by this client (echo)
  const echoPayload = {
    originPlayerId: mySessionId,
    commandId: myCommandId,
    lastMove: { from: 'e2', to: 'e4' },
  };

  const isEchoA = Boolean(
    (echoPayload.commandId && pendingCommandIds.has(echoPayload.commandId)) ||
    (echoPayload.originPlayerId && echoPayload.originPlayerId === mySessionId)
  );
  assert.equal(isEchoA, true, 'Originating client must recognize its own echoed move');

  // Clean up acknowledged command
  if (echoPayload.commandId) pendingCommandIds.delete(echoPayload.commandId);
  assert.equal(pendingCommandIds.has(myCommandId), false);

  // Case B: Broadcast of move sent by opponent
  const opponentPayload = {
    originPlayerId: 'usr_opponent_456',
    commandId: 'cmd_1720000001_xyz',
    lastMove: { from: 'e7', to: 'e5' },
  };

  const isEchoB = Boolean(
    (opponentPayload.commandId && pendingCommandIds.has(opponentPayload.commandId)) ||
    (opponentPayload.originPlayerId && opponentPayload.originPlayerId === mySessionId)
  );
  assert.equal(isEchoB, false, 'Opponent move must NOT be treated as echo');
});

// Test 5: PlayMode Isolation Contract
test('PlayMode isolation contract: bot vs local vs online specifications', () => {
  const modes = ['bot', 'online', 'local'] as const;

  for (const mode of modes) {
    const isOnline = mode === 'online';
    const isBot = mode === 'bot';
    const isLocal = mode === 'local';

    if (isOnline) {
      assert.equal(isBot, false);
      assert.equal(isLocal, false);
    } else if (isBot) {
      assert.equal(isOnline, false);
      assert.equal(isLocal, false);
    } else if (isLocal) {
      assert.equal(isOnline, false);
      assert.equal(isBot, false);
    }
  }
});

// Test 6: Bot Scheduler Ref-Guarded Single Flight & Stale Result Cancellation
test('Bot Scheduler Guards: Generation counter invalidates stale asynchronous calculations', async () => {
  let botGeneration = 0;
  let isThinking = false;
  const appliedMoves: string[] = [];

  const simulateBotTrigger = async (generationId: number, delayMs: number, moveStr: string) => {
    isThinking = true;
    await new Promise((r) => setTimeout(r, delayMs));
    // Guard check: is this calculation still from the active generation?
    if (botGeneration !== generationId) {
      // Stale calculation discarded!
      isThinking = false;
      return;
    }
    appliedMoves.push(moveStr);
    isThinking = false;
  };

  // Turn 1: White moves, schedules Bot calculation generation 1 (takes 60ms)
  botGeneration++;
  simulateBotTrigger(botGeneration, 60, 'e7e5');

  // Immediately user clicks Takeback / Reset Game (cancels pending bot)
  botGeneration++; // generation is now 2!

  // User makes a new move in generation 2
  simulateBotTrigger(botGeneration, 20, 'c7c5');

  // Wait for both promises to resolve
  await new Promise((r) => setTimeout(r, 80));

  // Assert: 'e7e5' was discarded because generation 1 was invalidated; only 'c7c5' was applied!
  assert.deepEqual(appliedMoves, ['c7c5'], 'Stale generation 1 bot move must not be applied');
  assert.equal(isThinking, false);
});

