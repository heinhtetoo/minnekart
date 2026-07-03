import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { sessions, users } from '@/db/schema';

import {
  createSession,
  revokeAllSessions,
  revokeSession,
  validateSession,
} from './session';
import { sha256 } from './tokens';

import { resetDb, testDb } from '../../../test/db';

const db = testDb();

const DAY_MS = 24 * 60 * 60 * 1000;

async function insertUser() {
  const [user] = await db
    .insert(users)
    .values({
      email: 'traveller@example.com',
      username: 'traveller',
      name: 'Test Traveller',
      passwordHash: 'not-a-real-hash',
    })
    .returning();
  return user;
}

beforeEach(async () => {
  await resetDb();
});

describe('sessions', () => {
  it('creates a session valid for about thirty days', async () => {
    const user = await insertUser();

    const { token, expiresAt } = await createSession(db, user.id);
    const result = await validateSession(db, token);

    expect(result?.user.id).toBe(user.id);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * DAY_MS);
  });

  it('returns null for an unknown token', async () => {
    expect(await validateSession(db, 'no-such-token')).toBeNull();
  });

  it('deletes and rejects an expired session', async () => {
    const user = await insertUser();
    const { token } = await createSession(db, user.id);
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.tokenHash, sha256(token)));

    expect(await validateSession(db, token)).toBeNull();
    const remaining = await db.select().from(sessions);
    expect(remaining).toHaveLength(0);
  });

  it('extends a session that is past half its lifetime', async () => {
    const user = await insertUser();
    const { token } = await createSession(db, user.id);
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + 10 * DAY_MS) })
      .where(eq(sessions.tokenHash, sha256(token)));

    const result = await validateSession(db, token);

    expect(result?.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + 29 * DAY_MS,
    );
  });

  it('revokes a single session', async () => {
    const user = await insertUser();
    const { token } = await createSession(db, user.id);

    await revokeSession(db, token);

    expect(await validateSession(db, token)).toBeNull();
  });

  it('revokes every session a user holds', async () => {
    const user = await insertUser();
    const first = await createSession(db, user.id);
    const second = await createSession(db, user.id);

    await revokeAllSessions(db, user.id);

    expect(await validateSession(db, first.token)).toBeNull();
    expect(await validateSession(db, second.token)).toBeNull();
  });
});
