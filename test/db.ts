import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@/db/schema';

let pool: Pool | undefined;

export function testDb() {
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    allowExitOnIdle: true,
  });
  return drizzle(pool, { schema });
}

export async function resetDb() {
  await testDb().execute(
    sql`TRUNCATE users, sessions, auth_tokens, invites, trips, photos,
        rate_limits, webhook_events RESTART IDENTITY CASCADE`,
  );
}
