import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '@/lib/env';
import * as schema from './schema';

let pool: Pool | undefined;

export function db() {
  pool ??= new Pool({
    connectionString: env().DATABASE_URL,
    max: 5,
    allowExitOnIdle: true,
  });
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof db>;
export type DatabaseExecutor =
  Database | Parameters<Parameters<Database['transaction']>[0]>[0];
