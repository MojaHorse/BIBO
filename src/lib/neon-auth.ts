import { createNeonAuth } from '@neondatabase/auth/next/server';

export const neonAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || 'https://ep-bitter-fog-b5f8zy5u.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth',
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || 'obscura_better_auth_neon_session_cookie_secret_key_32chars_min!',
    sessionDataTtl: 300,
  },
});
