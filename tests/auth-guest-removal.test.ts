import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPlayerSession,
  savePlayerSession,
  clearPlayerSession,
  isAuthenticatedSession,
  PlayerSession,
} from '../src/lib/session';

// Mock localStorage for Node test runner
const storage: Record<string, string> = {};
global.localStorage = {
  getItem: (k: string) => storage[k] || null,
  setItem: (k: string, v: string) => {
    storage[k] = v;
  },
  removeItem: (k: string) => {
    delete storage[k];
  },
  clear: () => {
    for (const k of Object.keys(storage)) delete storage[k];
  },
  key: (i: number) => Object.keys(storage)[i] || null,
  length: 0,
};
global.window = {
  dispatchEvent: () => true,
} as any;
global.CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, opts?: any) {
    this.type = type;
    this.detail = opts?.detail;
  }
} as any;

test('Session: unauthenticated visitors receive isAuthenticated = false without generating guest accounts', () => {
  localStorage.clear();
  const session = getPlayerSession();

  assert.equal(session.isAuthenticated, false);
  assert.equal(session.id, '');
  assert.equal(isAuthenticatedSession(session), false);
  // Verify no guest_ id was created in storage
  assert.equal(localStorage.getItem('obscura_guest_id'), null);
});

test('Session: authentic user sign-in properly marks isAuthenticated = true and persists', () => {
  localStorage.clear();

  const realUser: Partial<PlayerSession> = {
    id: 'usr_7f8a9b1c',
    handle: 'GrandmasterAlex',
    displayName: 'Alex M.',
    email: 'alex@bibo.gg',
    rating: 1650,
    xp: 2500,
    isVerifiedHuman: true,
  };

  savePlayerSession(realUser);

  const active = getPlayerSession();
  assert.equal(active.isAuthenticated, true);
  assert.equal(active.id, 'usr_7f8a9b1c');
  assert.equal(active.handle, 'GrandmasterAlex');
  assert.equal(active.rating, 1650);
  assert.equal(isAuthenticatedSession(active), true);
});

test('Session: legacy guest IDs in localStorage are strictly rejected by isAuthenticatedSession', () => {
  const fakeGuest: PlayerSession = {
    id: 'guest_12345678',
    handle: 'Guest_1234',
    rating: 1200,
    xp: 0,
    isAuthenticated: true, // even if maliciously claimed
  };

  assert.equal(
    isAuthenticatedSession(fakeGuest),
    false,
    'Legacy guest_ IDs must NEVER be recognized as authenticated'
  );
  assert.equal(isAuthenticatedSession(null), false);
  assert.equal(isAuthenticatedSession(undefined), false);
});

test('Session: clearPlayerSession completely purges user identity on logout', () => {
  clearPlayerSession();
  const cleared = getPlayerSession();

  assert.equal(cleared.isAuthenticated, false);
  assert.equal(cleared.id, '');
  assert.equal(localStorage.getItem('obscura_user'), null);
  assert.equal(localStorage.getItem('obscura_guest_id'), null);
});
