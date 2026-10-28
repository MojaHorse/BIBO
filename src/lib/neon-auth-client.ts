'use client';

import { createAuthClient } from '@neondatabase/auth';

const authBase =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth`
    : (process.env.NEXT_PUBLIC_NEON_AUTH_BASE_URL || 'https://ep-bitter-fog-b5f8zy5u.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth');

export const authClient = createAuthClient(authBase);
