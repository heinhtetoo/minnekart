import { beforeEach, describe, expect, it } from 'vitest';

import { photos, trips } from '@/db/schema';
import { newPhotoKeys } from '@/lib/photos/keys';
import { PHOTO_PAGE_SIZE } from '@/lib/photos/library';
import { resetMemoryStorage } from '@/lib/storage';

import { GET } from './route';

import {
  createMember,
  createMemberWithSession,
} from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { cookieHeader, getRequest } from '../../../../../test/http';

const db = testDb();

const url = 'http://test/api/account/photos';

async function seedTrip(userId: string, country: string) {
  const [trip] = await db
    .insert(trips)
    .values({
      userId,
      placeName: `${country} place`,
      country,
      lat: 35.0116,
      lng: 135.7681,
      dateStart: '2023-04-02',
    })
    .returning();
  return trip;
}

// createdAt drives the ordering, so seed it explicitly to keep pages stable.
async function seedPhotos(userId: string, tripId: string, howMany: number) {
  await db.insert(photos).values(
    Array.from({ length: howMany }, (_, index) => {
      const keys = newPhotoKeys(userId, tripId);
      return {
        tripId,
        userId,
        displayKey: keys.displayKey,
        thumbKey: keys.thumbKey,
        width: 100,
        height: 100,
        position: index,
        createdAt: new Date(2023, 0, 1, 0, index),
      };
    }),
  );
}

function listRequest(query: string, token?: string) {
  return GET(
    getRequest(`${url}${query}`, token ? cookieHeader(token) : undefined),
  );
}

beforeEach(async () => {
  await resetDb();
  resetMemoryStorage();
});

describe('GET /api/account/photos', () => {
  it('returns the first page with signed urls', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await seedTrip(user.id, 'Japan');
    await seedPhotos(user.id, trip.id, 3);

    const response = await listRequest('', sessionToken);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photos).toHaveLength(3);
    expect(body.hasMore).toBe(false);
    expect(body.photos[0].thumbUrl).toEqual(expect.any(String));
    expect(body.photos[0].country).toBe('Japan');
  });

  it('caps a page at the page size and reports more', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await seedTrip(user.id, 'Japan');
    await seedPhotos(user.id, trip.id, PHOTO_PAGE_SIZE + 4);

    const response = await listRequest('', sessionToken);

    const body = await response.json();
    expect(body.photos).toHaveLength(PHOTO_PAGE_SIZE);
    expect(body.hasMore).toBe(true);
  });

  it('returns the next page from an offset without repeating photos', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await seedTrip(user.id, 'Japan');
    await seedPhotos(user.id, trip.id, PHOTO_PAGE_SIZE + 4);

    const first = await (await listRequest('', sessionToken)).json();
    const second = await (
      await listRequest(`?offset=${PHOTO_PAGE_SIZE}`, sessionToken)
    ).json();

    expect(second.photos).toHaveLength(4);
    expect(second.hasMore).toBe(false);
    const firstIds = first.photos.map((photo: { id: string }) => photo.id);
    const secondIds = second.photos.map((photo: { id: string }) => photo.id);
    expect(firstIds.filter((id: string) => secondIds.includes(id))).toEqual([]);
  });

  it('filters by country', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const japan = await seedTrip(user.id, 'Japan');
    const norway = await seedTrip(user.id, 'Norway');
    await seedPhotos(user.id, japan.id, 2);
    await seedPhotos(user.id, norway.id, 3);

    const response = await listRequest('?country=Norway', sessionToken);

    const body = await response.json();
    expect(body.photos).toHaveLength(3);
    expect(
      body.photos.every(
        (photo: { country: string }) => photo.country === 'Norway',
      ),
    ).toBe(true);
  });

  it('never returns another users photos', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    const trip = await seedTrip(other.id, 'Japan');
    await seedPhotos(other.id, trip.id, 3);

    const response = await listRequest('', sessionToken);

    const body = await response.json();
    expect(body.photos).toEqual([]);
    expect(body.hasMore).toBe(false);
  });

  it('rejects a negative offset', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await listRequest('?offset=-1', sessionToken);

    expect(response.status).toBe(400);
  });

  it('returns 401 without a session', async () => {
    const response = await listRequest('');

    expect(response.status).toBe(401);
  });

  it('returns 403 for an unverified session', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: false });

    const response = await listRequest('', sessionToken);

    expect(response.status).toBe(403);
  });
});
