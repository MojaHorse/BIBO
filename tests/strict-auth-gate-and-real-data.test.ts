import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';
import { createSessionToken } from '../src/lib/auth-token';

test('Proxy: unauthenticated /home dashboard access is strictly 307 redirected to /login', () => {
  const req = new NextRequest('http://localhost:3000/home');
  const res = proxy(req);

  assert.equal(res.status, 307);
  const location = res.headers.get('location');
  assert.ok(location?.includes('/login?redirect=%2Fhome'));
});

test('Proxy: unauthenticated /play/chess access is strictly 307 redirected to /login with redirect param', () => {
  const req = new NextRequest('http://localhost:3000/play/chess?mode=bot&difficulty=medium&mins=3');
  const res = proxy(req);

  assert.equal(res.status, 307);
  const location = res.headers.get('location');
  assert.ok(location?.includes('/login?redirect='));
  assert.ok(location?.includes(encodeURIComponent('/play/chess?mode=bot&difficulty=medium&mins=3')));
});

test('Proxy: unauthenticated /play hub access is strictly 307 redirected to /login', () => {
  const req = new NextRequest('http://localhost:3000/play');
  const res = proxy(req);

  assert.equal(res.status, 307);
  const location = res.headers.get('location');
  assert.ok(location?.includes('/login?redirect=%2Fplay'));
});

test('Proxy: unauthenticated /puzzles access is strictly 307 redirected to /login', () => {
  const req = new NextRequest('http://localhost:3000/puzzles');
  const res = proxy(req);

  assert.equal(res.status, 307);
  const location = res.headers.get('location');
  assert.ok(location?.includes('/login?redirect=%2Fpuzzles'));
});

test('Proxy: unauthenticated /compete access is strictly 307 redirected to /login', () => {
  const req = new NextRequest('http://localhost:3000/compete');
  const res = proxy(req);

  assert.equal(res.status, 307);
  const location = res.headers.get('location');
  assert.ok(location?.includes('/login?redirect=%2Fcompete'));
});

test('Proxy: legacy guest accounts are rejected by proxy gate and redirected to login', () => {
  const guestToken = createSessionToken({
    id: 'guest_123456789',
    handle: 'GuestTactician',
  });

  const req = new NextRequest('http://localhost:3000/play/chess', {
    headers: {
      cookie: `obscura_session=${guestToken}`,
    },
  });
  const res = proxy(req);

  assert.equal(res.status, 307);
  const location = res.headers.get('location');
  assert.ok(location?.includes('/login?redirect=%2Fplay%2Fchess'));
});

test('Proxy: valid authenticated user session is passed through to arena', () => {
  const validToken = createSessionToken({
    id: 'user_authentic_99',
    handle: 'GrandmasterPlayer',
    email: 'gm@example.com',
  });

  const req = new NextRequest('http://localhost:3000/play/chess?mode=bot', {
    headers: {
      cookie: `obscura_session=${validToken}`,
    },
  });
  const res = proxy(req);

  // Status 200 / next()
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('location'), null);
});

test('Proxy: verified Supabase Auth session cookie is passed through to arena', () => {
  const req = new NextRequest('http://localhost:3000/play/chess?mode=bot', {
    headers: {
      cookie: 'sb-bibo-auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.signature',
    },
  });
  const res = proxy(req);

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('location'), null);
});
