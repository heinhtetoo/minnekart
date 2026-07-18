import { asc } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { photos, trips } from '@/db/schema';
import { newPhotoKeys } from '@/lib/photos/keys';

import { PATCH } from './route';

import {
  createMember,
  createMemberWithSession,
} from '../../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../../test/http';

const db = testDb();

const tripBody = {
  placeName: 'Kyoto',
  country: 'Japan',
  lat: 35.0116,
  lng: 135.7681,
  dateStart: '2023-04-02',
};

async function insertTripFor(userId: string) {
  const [trip] = await db
    .insert(trips)
    .values({ ...tripBody, userId })
    .returning();
  return trip;
}

async function insertPhotoAt(userId: string, tripId: string, position: number) {
  const keys = newPhotoKeys(userId, tripId);
  const [photo] = await db
    .insert(photos)
    .values({
      tripId,
      userId,
      displayKey: keys.displayKey,
      thumbKey: keys.thumbKey,
      width: 100,
      height: 100,
      position,
    })
    .returning();
  return photo;
}

async function orderedIdsFor(tripId: string) {
  const rows = await db
    .select({ id: photos.id, position: photos.position, trip: photos.tripId })
    .from(photos)
    .orderBy(asc(photos.position));
  return rows.filter((row) => row.trip === tripId).map((row) => row.id);
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function urlFor(id: string) {
  return `http://test/api/trips/${id}/photos`;
}

function patchOrder(tripId: string, body: unknown, sessionToken?: string) {
  return PATCH(
    jsonRequest(
      'PATCH',
      urlFor(tripId),
      body,
      sessionToken ? cookieHeader(sessionToken) : undefined,
    ),
    context(tripId),
  );
}

beforeEach(async () => {
  await resetDb();
});

describe('PATCH /api/trips/[id]/photos', () => {
  it('rejects an unauthenticated request', async () => {
    const { user } = await createMember({ verified: true });
    const trip = await insertTripFor(user.id);

    const response = await patchOrder(trip.id, { order: [] });

    expect(response.status).toBe(401);
  });

  it('rejects an unverified user', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: false,
    });
    const trip = await insertTripFor(user.id);

    const response = await patchOrder(trip.id, { order: [] }, sessionToken);

    expect(response.status).toBe(403);
  });

  it('returns 404 for another users trip', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    const trip = await insertTripFor(other.id);
    const photo = await insertPhotoAt(other.id, trip.id, 0);

    const response = await patchOrder(
      trip.id,
      { order: [photo.id] },
      sessionToken,
    );

    expect(response.status).toBe(404);
  });

  it('rejects a malformed body with invalid_request', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const bodies = [{}, { order: [] }, { order: ['not-a-uuid'] }];
    for (const body of bodies) {
      const response = await patchOrder(trip.id, body, sessionToken);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'invalid_request' });
    }
  });

  it('rejects duplicate photo ids with invalid_order', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const first = await insertPhotoAt(user.id, trip.id, 0);
    await insertPhotoAt(user.id, trip.id, 1);

    const response = await patchOrder(
      trip.id,
      { order: [first.id, first.id] },
      sessionToken,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_order' });
  });

  it('rejects an incomplete photo list with invalid_order', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const first = await insertPhotoAt(user.id, trip.id, 0);
    const second = await insertPhotoAt(user.id, trip.id, 1);
    await insertPhotoAt(user.id, trip.id, 2);

    const response = await patchOrder(
      trip.id,
      { order: [first.id, second.id] },
      sessionToken,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_order' });
  });

  it('rejects ids from another trip with invalid_order', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const otherTrip = await insertTripFor(user.id);
    const own = await insertPhotoAt(user.id, trip.id, 0);
    const foreign = await insertPhotoAt(user.id, otherTrip.id, 0);

    const response = await patchOrder(
      trip.id,
      { order: [own.id, foreign.id] },
      sessionToken,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_order' });
    const [untouched] = await db
      .select()
      .from(photos)
      .orderBy(asc(photos.position));
    expect(untouched.position).toBe(0);
  });

  it('persists a reversed order as packed positions', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const first = await insertPhotoAt(user.id, trip.id, 0);
    const second = await insertPhotoAt(user.id, trip.id, 1);
    const third = await insertPhotoAt(user.id, trip.id, 2);

    const response = await patchOrder(
      trip.id,
      { order: [third.id, second.id, first.id] },
      sessionToken,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await orderedIdsFor(trip.id)).toEqual([
      third.id,
      second.id,
      first.id,
    ]);
  });

  it('keeps positions intact for a no-op reorder', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const first = await insertPhotoAt(user.id, trip.id, 0);
    const second = await insertPhotoAt(user.id, trip.id, 1);

    const response = await patchOrder(
      trip.id,
      { order: [first.id, second.id] },
      sessionToken,
    );

    expect(response.status).toBe(200);
    expect(await orderedIdsFor(trip.id)).toEqual([first.id, second.id]);
  });
});
