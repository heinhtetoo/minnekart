import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

import {
  TEST_DATABASE_NAME,
  maintenanceDatabaseUrl,
  testDatabaseUrl,
} from './database-url';

export default async function globalSetup() {
  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) {
    throw new Error('DATABASE_URL is required to run the test suite');
  }
  await createTestDatabaseIfMissing(sourceUrl);
  await migrateTestDatabase(sourceUrl);
}

async function createTestDatabaseIfMissing(sourceUrl: string) {
  const pool = new Pool({
    connectionString: maintenanceDatabaseUrl(sourceUrl),
    max: 1,
  });
  try {
    const existing = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DATABASE_NAME],
    );
    if (existing.rowCount === 0) {
      await pool.query(`CREATE DATABASE ${TEST_DATABASE_NAME}`);
    }
  } finally {
    await pool.end();
  }
}

async function migrateTestDatabase(sourceUrl: string) {
  const pool = new Pool({
    connectionString: testDatabaseUrl(sourceUrl),
    max: 1,
  });
  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  } finally {
    await pool.end();
  }
}
