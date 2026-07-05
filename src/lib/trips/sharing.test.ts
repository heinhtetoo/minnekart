import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { trips, users } from '@/db/schema';

import {
  getPublicTrip,
  getPublicTrips,
  getPublicUser,
  getTripByShareToken,
} from './sharing';

import { createMember } from '../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../test/db';

const db = testDb();

const tripBody = {
  placeName: 'Kyoto',
  country: 'Japan',
  lat: 35.0116,
  lng: 135.7681,
  dateStart: '2023-04-02',
};

async function insertTrip(
  userId: string,
  overrides: Partial<typeof trips.$inferInsert> = {},
) {
  const [trip] = await db
    .insert(trips)
    .values({ ...tripBody, userId, ...overrides })
    .returning();
  return trip;
}

beforeEach(async () => {
  await resetDb();
});

describe('getTripByShareToken', () => {
  it('returns the trip matching the token', async () => {
    const { user } = await createMember({ verified: true });
    const trip = await insertTrip(user.id, { shareToken: 'secret-token' });

    const found = await getTripByShareToken(db, 'secret-token');

    expect(found?.id).toBe(trip.id);
  });

  it('returns null for a wrong token', async () => {
    const { user } = await createMember({ verified: true });
    await insertTrip(user.id, { shareToken: 'secret-token' });

    expect(await getTripByShareToken(db, 'other-token')).toBeNull();
  });

  it('returns null for a blank token without querying', async () => {
    expect(await getTripByShareToken(db, '   ')).toBeNull();
  });

  it('returns null once the token is revoked', async () => {
    const { user } = await createMember({ verified: true });
    const trip = await insertTrip(user.id, { shareToken: 'secret-token' });
    await db
      .update(trips)
      .set({ shareToken: null })
      .where(eq(trips.id, trip.id));

    expect(await getTripByShareToken(db, 'secret-token')).toBeNull();
  });
});

describe('getPublicUser', () => {
  it('returns the user when their globe is public', async () => {
    const { user } = await createMember({ username: 'hein', verified: true });
    await db
      .update(users)
      .set({ globePublic: true })
      .where(eq(users.id, user.id));

    const found = await getPublicUser(db, 'hein');

    expect(found?.id).toBe(user.id);
  });

  it('returns null when the globe is private', async () => {
    await createMember({ username: 'hein', verified: true });

    expect(await getPublicUser(db, 'hein')).toBeNull();
  });

  it('returns null for an unknown username', async () => {
    expect(await getPublicUser(db, 'nobody')).toBeNull();
  });
});

describe('getPublicTrips', () => {
  it('returns only public trips, newest first', async () => {
    const { user } = await createMember({ verified: true });
    const older = await insertTrip(user.id, {
      isPublic: true,
      dateStart: '2020-01-01',
    });
    const newer = await insertTrip(user.id, {
      isPublic: true,
      dateStart: '2023-01-01',
    });
    await insertTrip(user.id, { isPublic: false });

    const list = await getPublicTrips(db, user.id);

    expect(list.map((trip) => trip.id)).toEqual([newer.id, older.id]);
  });
});

describe('getPublicTrip', () => {
  it('returns a public trip owned by the user', async () => {
    const { user } = await createMember({ verified: true });
    const trip = await insertTrip(user.id, { isPublic: true });

    const found = await getPublicTrip(db, user.id, trip.id);

    expect(found?.id).toBe(trip.id);
  });

  it('returns null for a private trip', async () => {
    const { user } = await createMember({ verified: true });
    const trip = await insertTrip(user.id, { isPublic: false });

    expect(await getPublicTrip(db, user.id, trip.id)).toBeNull();
  });
});
