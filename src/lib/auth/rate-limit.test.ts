import { beforeEach, describe, expect, it } from 'vitest';

import { consumeRateLimit } from './rate-limit';

import { resetDb, testDb } from '../../../test/db';

const db = testDb();
const WINDOW_MS = 60_000;

beforeEach(async () => {
  await resetDb();
});

describe('consumeRateLimit', () => {
  it('allows requests up to the limit and blocks the next one', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect(await consumeRateLimit(db, 'login:1.2.3.4', 3, WINDOW_MS)).toBe(
        true,
      );
    }

    expect(await consumeRateLimit(db, 'login:1.2.3.4', 3, WINDOW_MS)).toBe(
      false,
    );
  });

  it('tracks different keys independently', async () => {
    expect(await consumeRateLimit(db, 'login:1.2.3.4', 1, WINDOW_MS)).toBe(
      true,
    );
    expect(await consumeRateLimit(db, 'login:1.2.3.4', 1, WINDOW_MS)).toBe(
      false,
    );

    expect(await consumeRateLimit(db, 'login:5.6.7.8', 1, WINDOW_MS)).toBe(
      true,
    );
  });
});
