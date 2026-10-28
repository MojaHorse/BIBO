// Cryptographically signed session tokens (HMAC-SHA256)
// Provides secure authentication cookies with anti-tamper verification

import crypto from 'crypto';

export interface SessionPayload {
  userId: string;
  handle: string;
  email?: string;
  isVerifiedHuman?: boolean;
  avatarUrl?: string;
  createdAt: number;
  expiresAt: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Allow build phase to complete, but warn for runtime configuration
      if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.warn('[SECURITY WARNING] SESSION_SECRET environment variable is missing.');
      }
    }
    return 'bibo_development_session_secret_fallback';
  }
  return secret;
}

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function sign(data: string, secret?: string): string {
  const key = secret || getSessionSecret();
  return base64UrlEncode(
    crypto.createHmac('sha256', key).update(data).digest('base64')
  );
}

export function createSessionToken(user: {
  id: string;
  handle: string;
  email?: string;
  isVerifiedHuman?: boolean;
  avatarUrl?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId: user.id,
    handle: user.handle,
    email: user.email,
    isVerifiedHuman: Boolean(user.isVerifiedHuman),
    avatarUrl: user.avatarUrl,
    createdAt: now,
    expiresAt: now + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const expectedSignature = sign(encodedPayload);

  try {
    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (now > payload.expiresAt) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: Request): SessionPayload | null {
  // 1. Try Cookie header
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );

  if (cookies['obscura_session']) {
    const verified = verifySessionToken(cookies['obscura_session']);
    if (verified) return verified;
  }

  // 2. Try Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return verifySessionToken(token);
  }

  return null;
}
