import 'dotenv/config';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import { testDatabaseUrl } from './test/database-url';

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    globalSetup: ['./test/global-setup.ts'],
    env: {
      EMAIL_TRANSPORT: 'memory',
      STORAGE_DRIVER: 'memory',
      PADDLE_WEBHOOK_SECRET: 'pdl_ntfset_test_secret',
      PADDLE_PRICE_LIFETIME: 'pri_lifetime_test',
      ...(databaseUrl ? { DATABASE_URL: testDatabaseUrl(databaseUrl) } : {}),
    },
  },
});
