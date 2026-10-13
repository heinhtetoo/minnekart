import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { photos, planEvents, trips, users } from '@/db/schema';
import { FREE_TRIP_LIMIT } from '@/lib/billing/limits';

import {
  activation,
  activityRetention,
  capPressure,
  conversion,
  depth,
  planMix,
} from './queries';

import { createMember, createOwner } from '../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../test/db';

const db = testDb();

const DAY_MS = 24 * 60 * 60 * 1000;

let counter = 0;

async function member(overrides: Parameters<typeof createMember>[0] = {}) {
  counter += 1;
  const { user } = await createMember({
    email: `m${counter}@example.com`,
    username: `m${counter}`,
    verified: true,
    ...overrides,
  });
  return user;
}

async function signedUpAgo(days: number, plan: 'free' | 'paid' = 'free') {
  const user = await member({ plan });
  const at = new Date(Date.now() - days * DAY_MS);
  await db.update(users).set({ createdAt: at }).where(eq(users.id, user.id));
  return { ...user, createdAt: at };
}

async function addTrip(userId: string, createdAt?: Date) {
  const [trip] = await db
    .insert(trips)
    .values({
      userId,
      placeName: 'Kyoto',
      country: 'Japan',
      lat: 35.0116,
      lng: 135.7681,
      dateStart: '2023-04-02',
      ...(createdAt ? { createdAt } : {}),
    })
    .returning();
  return trip;
}

async function addPhoto(userId: string, tripId: string, createdAt?: Date) {
  await db.insert(photos).values({
    tripId,
    userId,
    displayKey: `photos/${userId}/${tripId}/a.webp`,
    thumbKey: `photos/${userId}/${tripId}/a_thumb.webp`,
    width: 100,
    height: 100,
    ...(createdAt ? { createdAt } : {}),
  });
}

beforeEach(async () => {
  await resetDb();
  counter = 0;
});

describe('planMix', () => {
  it('separates the grandfathered cohort from people who actually paid', async () => {
    // The whole point: migration 0002 moved every pre-existing user to paid.
    // Counting them as paid makes conversion look spectacular and mean nothing.
    await member({ plan: 'free' });
    await member({ plan: 'paid' }); // grandfathered — no Paddle record
    const subscriber = await member({ plan: 'paid' });
    await db
      .update(users)
      .set({ paddleCustomerId: 'ctm_1', paddleSubscriptionId: 'sub_1' })
      .where(eq(users.id, subscriber.id));
    const founding = await member({ plan: 'paid' });
    await db
      .update(users)
      .set({ paddleCustomerId: 'ctm_2' })
      .where(eq(users.id, founding.id));

    expect(await planMix(db)).toEqual({
      free: 1,
      subscriber: 1,
      foundingMember: 1,
      grandfathered: 1,
    });
  });

  it('leaves the owner out of the counts', async () => {
    await createOwner();
    await member({ plan: 'free' });

    const mix = await planMix(db);
    expect(mix.free).toBe(1);
  });
});

describe('activation', () => {
  it('counts a first memory inside the window and not one after it', async () => {
    const quick = await signedUpAgo(10);
    await addTrip(quick.id, new Date(quick.createdAt.getTime() + 60_000));

    const slow = await signedUpAgo(10);
    await addTrip(slow.id, new Date(slow.createdAt.getTime() + 3 * DAY_MS));

    await signedUpAgo(10); // never added anything

    expect(await activation(db)).toEqual({
      signups: 3,
      activated: 1,
      rate: 1 / 3,
    });
  });

  it('counts a prolific user once, not once per memory', async () => {
    const user = await signedUpAgo(5);
    const soon = new Date(user.createdAt.getTime() + 60_000);
    await addTrip(user.id, soon);
    await addTrip(user.id, soon);
    await addTrip(user.id, soon);

    expect(await activation(db)).toEqual({
      signups: 1,
      activated: 1,
      rate: 1,
    });
  });

  it('reports no rate rather than zero when nobody has signed up', async () => {
    expect((await activation(db)).rate).toBeNull();
  });
});

describe('capPressure', () => {
  it('counts users at the free ceiling and how many of them pay', async () => {
    const stuck = await member({ plan: 'free' });
    for (let i = 0; i < FREE_TRIP_LIMIT; i += 1) {
      await addTrip(stuck.id);
    }

    const upgraded = await member({ plan: 'paid' });
    for (let i = 0; i < FREE_TRIP_LIMIT + 4; i += 1) {
      await addTrip(upgraded.id);
    }

    const casual = await member({ plan: 'free' });
    await addTrip(casual.id);

    expect(await capPressure(db)).toEqual({ atCap: 2, atCapAndPaid: 1 });
  });
});

describe('depth', () => {
  it('takes the median so one heavy user cannot skew it', async () => {
    const a = await member();
    const b = await member();
    const c = await member();
    await addTrip(a.id);
    await addTrip(b.id);
    const trip = await addTrip(c.id);
    await addTrip(c.id);
    await addTrip(c.id);
    await addPhoto(c.id, trip.id);

    // Trip counts are 1, 1, 3 — median 1, where the mean would be 1.67.
    const result = await depth(db);
    expect(result.medianTrips).toBe(1);
    expect(result.medianPhotos).toBe(0);
  });
});

describe('activityRetention', () => {
  it('counts only users old enough to have had the chance', async () => {
    const old = await signedUpAgo(40);
    await addTrip(old.id, new Date(Date.now() - 2 * DAY_MS));
    await signedUpAgo(40); // eligible, never came back
    await signedUpAgo(3); // too new to count either way

    expect(await activityRetention(db, 30)).toEqual({
      eligible: 2,
      returned: 1,
      rate: 0.5,
    });
  });

  it('counts a photo as returning, not just a memory', async () => {
    const user = await signedUpAgo(40);
    const trip = await addTrip(user.id, new Date(user.createdAt.getTime()));
    await addPhoto(user.id, trip.id, new Date(Date.now() - DAY_MS));

    expect((await activityRetention(db, 30)).returned).toBe(1);
  });

  it('reports no rate rather than zero when nobody is eligible yet', async () => {
    await signedUpAgo(2);
    expect((await activityRetention(db, 30)).rate).toBeNull();
  });
});

describe('conversion', () => {
  it('reports nothing recorded rather than a zero rate on an empty table', async () => {
    await member({ plan: 'free' });

    const result = await conversion(db);
    expect(result.recorded).toBe(0);
    expect(result.converted).toBe(0);
    expect(result.medianDaysToConvert).toBeNull();
  });

  it('excludes the grandfathered cohort from the denominator', async () => {
    await member({ plan: 'free' });
    await member({ plan: 'paid' }); // grandfathered, never chose anything
    const payer = await member({ plan: 'paid' });
    await db
      .update(users)
      .set({ paddleCustomerId: 'ctm_1', paddleSubscriptionId: 'sub_1' })
      .where(eq(users.id, payer.id));

    // Eligible is the free user plus the real payer — not the grandfathered
    // account, which would otherwise flatter every rate computed from it.
    expect((await conversion(db)).eligible).toBe(2);
  });

  it('measures days to convert from signup to the first upgrade', async () => {
    const user = await signedUpAgo(30, 'paid');
    await db
      .update(users)
      .set({ paddleCustomerId: 'ctm_1', paddleSubscriptionId: 'sub_1' })
      .where(eq(users.id, user.id));
    await db.insert(planEvents).values({
      userId: user.id,
      fromPlan: 'free',
      toPlan: 'paid',
      reason: 'webhook',
      createdAt: new Date(user.createdAt.getTime() + 10 * DAY_MS),
    });

    const result = await conversion(db);
    expect(result.converted).toBe(1);
    expect(result.medianDaysToConvert).toBeCloseTo(10, 1);
  });

  it('takes the first upgrade when someone churned and came back', async () => {
    const user = await signedUpAgo(60, 'paid');
    await db
      .update(users)
      .set({ paddleCustomerId: 'ctm_1', paddleSubscriptionId: 'sub_1' })
      .where(eq(users.id, user.id));
    const base = user.createdAt.getTime();
    await db.insert(planEvents).values([
      {
        userId: user.id,
        fromPlan: 'free',
        toPlan: 'paid',
        reason: 'webhook',
        createdAt: new Date(base + 5 * DAY_MS),
      },
      {
        userId: user.id,
        fromPlan: 'paid',
        toPlan: 'free',
        reason: 'webhook',
        createdAt: new Date(base + 20 * DAY_MS),
      },
      {
        userId: user.id,
        fromPlan: 'free',
        toPlan: 'paid',
        reason: 'webhook',
        createdAt: new Date(base + 30 * DAY_MS),
      },
    ]);

    const result = await conversion(db);
    expect(result.converted).toBe(1);
    expect(result.medianDaysToConvert).toBeCloseTo(5, 1);
  });
});

describe('plan_events cascade', () => {
  // Task 12b hit this exact class of bug: invites.used_by blocked self-serve
  // account deletion until the FK was changed. A new table referencing users
  // must never reintroduce it.
  it('does not block deleting a user who has plan events', async () => {
    const user = await member();
    await db.insert(planEvents).values({
      userId: user.id,
      fromPlan: 'free',
      toPlan: 'paid',
      reason: 'webhook',
    });

    await db.delete(users).where(eq(users.id, user.id));

    expect(await db.select().from(planEvents)).toHaveLength(0);
  });
});
