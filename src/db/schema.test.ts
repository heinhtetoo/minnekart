import { sql } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { photos, rateLimits, sessions, trips, users } from '@/db/schema';

import { resetDb, testDb } from '../../test/db';

const db = testDb();

function userValues(overrides: Partial<typeof users.$inferInsert> = {}) {
  return {
    email: 'traveller@example.com',
    username: 'traveller',
    name: 'Test Traveller',
    passwordHash: 'not-a-real-hash',
    ...overrides,
  };
}

function tripValues(
  userId: string,
  overrides: Partial<typeof trips.$inferInsert> = {},
) {
  return {
    userId,
    placeName: 'Kyoto',
    country: 'Japan',
    lat: 35.0116,
    lng: 135.7681,
    dateStart: '2023-04-02',
    ...overrides,
  };
}

async function insertUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const [user] = await db
    .insert(users)
    .values(userValues(overrides))
    .returning();
  return user;
}

async function expectUniqueViolation(
  promise: Promise<unknown>,
  constraint: string,
) {
  await expect(promise).rejects.toMatchObject({
    cause: expect.objectContaining({ code: '23505', constraint }),
  });
}

beforeEach(async () => {
  await resetDb();
});

describe('users constraints', () => {
  it('rejects a second user with the same email', async () => {
    await insertUser();

    await expectUniqueViolation(
      db.insert(users).values(userValues({ username: 'other' })),
      'users_email_unique',
    );
  });

  it('rejects a second user with the same username', async () => {
    await insertUser();

    await expectUniqueViolation(
      db.insert(users).values(userValues({ email: 'other@example.com' })),
      'users_username_unique',
    );
  });

  it('defaults new users to the member role with a private globe', async () => {
    const user = await insertUser();

    expect(user.role).toBe('member');
    expect(user.globePublic).toBe(false);
    expect(user.emailVerifiedAt).toBeNull();
  });
});

describe('cascade deletes', () => {
  it('deleting a user removes their sessions, trips, and photos', async () => {
    const user = await insertUser();
    await db.insert(sessions).values({
      tokenHash: 'session-token-hash',
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const [trip] = await db
      .insert(trips)
      .values(tripValues(user.id))
      .returning();
    await db.insert(photos).values({
      tripId: trip.id,
      userId: user.id,
      displayKey: 'photos/display.webp',
      thumbKey: 'photos/thumb.webp',
      width: 2560,
      height: 1707,
    });

    await db.delete(users);

    const [counts] = await db
      .execute(
        sql`SELECT
            (SELECT count(*) FROM sessions)::int AS sessions,
            (SELECT count(*) FROM trips)::int AS trips,
            (SELECT count(*) FROM photos)::int AS photos`,
      )
      .then((result) => result.rows);
    expect(counts).toEqual({ sessions: 0, trips: 0, photos: 0 });
  });
});

describe('trips share tokens', () => {
  it('allows many unshared trips but rejects a duplicate share token', async () => {
    const user = await insertUser();

    await db.insert(trips).values(tripValues(user.id));
    await db.insert(trips).values(tripValues(user.id, { placeName: 'Oslo' }));
    await db
      .insert(trips)
      .values(tripValues(user.id, { shareToken: 'token-one' }));

    await expectUniqueViolation(
      db.insert(trips).values(tripValues(user.id, { shareToken: 'token-one' })),
      'trips_share_token_unique',
    );
  });
});

describe('rate limits', () => {
  it('increments the counter when the same key and window collide', async () => {
    const windowStart = new Date('2026-07-03T10:00:00Z');
    const attempt = { key: 'login:1.2.3.4', windowStart };

    await db.insert(rateLimits).values(attempt);
    const [row] = await db
      .insert(rateLimits)
      .values(attempt)
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
      })
      .returning();

    expect(row.count).toBe(2);
  });
});
