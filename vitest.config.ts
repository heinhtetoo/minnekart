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
      // dotenv loads a developer's .env here, so pin what would otherwise
      // change behaviour: a real Turnstile secret would send the closed-mode
      // tests to Cloudflare, OPEN_SIGNUP=true would flip the invite rules,
      // and real business identity would defeat the placeholder tests.
      OPEN_SIGNUP: 'false',
      TURNSTILE_SECRET_KEY: '',
      LEGAL_ENTITY_NAME: '',
      LEGAL_ENTITY_ABN: '',
      ...(databaseUrl ? { DATABASE_URL: testDatabaseUrl(databaseUrl) } : {}),
    },
  },
});
