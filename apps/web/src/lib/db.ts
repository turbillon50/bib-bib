import { neon } from '@neondatabase/serverless';

/**
 * Neon Postgres client (HTTP, serverless-friendly).
 * Requires DATABASE_URL env var.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(url);
}

export type Sql = ReturnType<typeof getDb>;
