import { neon } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;

if (!dbUrl && process.env.NODE_ENV === 'production') {
  throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED must be defined in production environment.');
}

export const sql = neon(dbUrl || 'postgresql://localhost:5432/neondb');
