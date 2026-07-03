import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import demoTrips from '@/data/demo-trips.json';
import { trips, users } from '@/db/schema';
import { seedDemoData } from '@/db/seed';

import { resetDb, testDb } from '../../test/db';

const db = testDb();

beforeEach(async () => {
  await resetDb();
});

describe('seedDemoData', () => {
  it('creates the demo user owning every demo trip', async () => {
    const { user, tripCount } = await seedDemoData(db);

    expect(user.username).toBe('demo');
    expect(tripCount).toBe(demoTrips.length);

    const seededTrips = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, user.id));
    expect(seededTrips).toHaveLength(demoTrips.length);
    expect(seededTrips.map((trip) => trip.placeName).sort()).toEqual(
      demoTrips.map((trip) => trip.placeName).sort(),
    );
  });

  it('is idempotent: running twice leaves one user and one trip set', async () => {
    await seedDemoData(db);
    const secondRun = await seedDemoData(db);

    const allUsers = await db.select().from(users);
    const allTrips = await db.select().from(trips);
    expect(allUsers).toHaveLength(1);
    expect(allTrips).toHaveLength(demoTrips.length);
    expect(secondRun.tripCount).toBe(demoTrips.length);
  });
});
