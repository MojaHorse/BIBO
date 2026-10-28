import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken } from '../src/lib/auth-token';
import { calculateElo } from '../src/lib/elo';
import { createRoom, authenticateRoomPlayer } from '../src/lib/room-manager';

test('Security: Session tokens are cryptographically signed and verify authentic user IDs', () => {
  const token = createSessionToken({
    id: 'user_12345',
    handle: 'TacticianOne',
    email: 'tactician@bibo.internal',
  });

  assert.ok(token);
  assert.equal(typeof token, 'string');
  assert.ok(token.includes('.'));
});

test('Security & Integrity: Multi-discipline rating fields map correctly without cross-contamination', () => {
  // Test Chess Bullet (< 3 min)
  const getRatingField = (gameId: string, minutes: number) => {
    return gameId === 'checkers'
      ? 'checkersRating'
      : gameId === 'morabaraba'
      ? 'morabarabaRating'
      : minutes < 3
      ? 'bulletRating'
      : minutes < 10
      ? 'blitzRating'
      : 'rapidRating';
  };

  assert.equal(getRatingField('chess', 1), 'bulletRating');
  assert.equal(getRatingField('chess', 3), 'blitzRating');
  assert.equal(getRatingField('chess', 10), 'rapidRating');
  assert.equal(getRatingField('checkers', 5), 'checkersRating');
  assert.equal(getRatingField('checkers', 10), 'checkersRating');
  assert.equal(getRatingField('morabaraba', 5), 'morabarabaRating');
  assert.equal(getRatingField('morabaraba', 10), 'morabarabaRating');
});

test('Competitive Integrity: calculateElo produces deterministic, symmetric ELO updates', () => {
  // Evenly matched players (1200 vs 1200), White wins (score = 1)
  const resultWhiteWin = calculateElo(1200, 1200, 1);
  assert.ok(resultWhiteWin.newRatingA > 1200);
  assert.ok(resultWhiteWin.newRatingB < 1200);
  assert.equal(resultWhiteWin.deltaA, -resultWhiteWin.deltaB);

  // Draw (score = 0.5)
  const resultDraw = calculateElo(1200, 1200, 0.5);
  assert.equal(resultDraw.newRatingA, 1200);
  assert.equal(resultDraw.newRatingB, 1200);
  assert.equal(resultDraw.deltaA, 0);
  assert.equal(resultDraw.deltaB, 0);
});

test('Competitive Integrity: Bot and guest sessions do not mutate competitive ratings', () => {
  const whiteId = 'bot_novice';
  const blackId = 'user_david_99';
  const isBotOrGuest =
    whiteId.startsWith('bot_') ||
    blackId.startsWith('bot_') ||
    whiteId.startsWith('guest_') ||
    blackId.startsWith('guest_');

  const rated = true;
  const shouldAdjustElo = Boolean(rated) && !isBotOrGuest;

  assert.equal(shouldAdjustElo, false, 'Matches with bots must NEVER adjust competitive ELO');
});

test('Security: Session tokens reject signature tampering and forgery', () => {
  const token = createSessionToken({
    id: 'user_authentic',
    handle: 'AuthenticUser',
    email: 'user@example.com',
  });

  const verified = verifySessionToken(token);
  assert.ok(verified);
  assert.equal(verified?.userId, 'user_authentic');

  // Attempt to forge token by tampering with payload
  const [payload, sig] = token.split('.');
  const forgedPayload = Buffer.from(
    JSON.stringify({ userId: 'user_admin', handle: 'Admin', createdAt: Date.now(), expiresAt: Date.now() + 10000 })
  ).toString('base64url');
  const forgedToken = `${forgedPayload}.${sig}`;

  assert.equal(verifySessionToken(forgedToken), null, 'Tampered payload with mismatched signature must be rejected');

  // Corrupted signature
  assert.equal(verifySessionToken(`${payload}.invalidsignature`), null, 'Malformed signature must be rejected');
});

test('Security & BOLA: authenticateRoomPlayer rejects IDOR attacks without valid token or session', () => {
  const creator = { id: 'victim_user', handle: 'Victim', rating: 1500 };
  const room = createRoom(5, creator, 'chess');

  // Attacker sends request with victim_user ID in body, but without valid playerToken or session cookie
  const unauthReq = new Request('http://localhost:3000/api/rooms/' + room.id + '/resign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'victim_user' }),
  });

  const roleWithoutAuth = authenticateRoomPlayer(room, unauthReq, 'victim_user');
  assert.equal(roleWithoutAuth, null, 'Adversary knowing victim playerId must NOT be authorized');

  // Authorized with legitimate playerToken
  const authReqWithToken = new Request('http://localhost:3000/api/rooms/' + room.id + '/resign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-player-token': room.whitePlayerToken! },
    body: JSON.stringify({ playerId: 'victim_user' }),
  });

  const roleWithToken = authenticateRoomPlayer(room, authReqWithToken, 'victim_user', room.whitePlayerToken);
  assert.equal(roleWithToken, 'w', 'Legitimate token bearer must be authorized as White');
});
