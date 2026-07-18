import { asc } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { photos, trips } from '@/db/schema';
import { newPhotoKeys } from '@/lib/photos/keys';
import { getMemoryStorage, resetMemoryStorage } from '@/lib/storage';

import { DELETE } from './route';

import {
  createMember,
  createMemberWithSession,
} from '../../../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../../../test/http';

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

async function insertPhoto(userId: string, tripId: string, position = 0) {
  const keys = newPhotoKeys(userId, tripId);
  const store = getMemoryStorage();
  await store.presignPut(keys.displayKey, 'image/webp');
  await store.presignPut(keys.thumbKey, 'image/webp');
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
  return { photo, keys };
}

function context(tripId: string, photoId: string) {
  return { params: Promise.resolve({ id: tripId, photoId }) };
}

function urlFor(tripId: string, photoId: string) {
  return `http://test/api/trips/${tripId}/photos/${photoId}`;
}

beforeEach(async () => {
  await resetDb();
  resetMemoryStorage();
});

describe('DELETE /api/trips/[id]/photos/[photoId]', () => {
  it('removes the row and purges the objects', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const { photo, keys } = await insertPhoto(user.id, trip.id);

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(trip.id, photo.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id, photo.id),
    );

    expect(response.status).toBe(200);
    expect(await db.select().from(photos)).toHaveLength(0);
    const store = getMemoryStorage();
    expect(await store.stat(keys.displayKey)).toBeNull();
    expect(await store.stat(keys.thumbKey)).toBeNull();
  });

  it('re-packs remaining positions after deleting the middle photo', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const { photo: first } = await insertPhoto(user.id, trip.id, 0);
    const { photo: middle } = await insertPhoto(user.id, trip.id, 1);
    const { photo: last } = await insertPhoto(user.id, trip.id, 2);

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(trip.id, middle.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id, middle.id),
    );

    expect(response.status).toBe(200);
    const remaining = await db
      .select({ id: photos.id, position: photos.position })
      .from(photos)
      .orderBy(asc(photos.position));
    expect(remaining).toEqual([
      { id: first.id, position: 0 },
      { id: last.id, position: 1 },
    ]);
  });

  it('returns 404 for another users photo', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    const trip = await insertTripFor(other.id);
    const { photo } = await insertPhoto(other.id, trip.id);

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(trip.id, photo.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id, photo.id),
    );

    expect(response.status).toBe(404);
    expect(await db.select().from(photos)).toHaveLength(1);
  });
});
