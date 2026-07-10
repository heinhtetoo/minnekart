import { beforeEach, describe, expect, it } from 'vitest';

import { photos, trips } from '@/db/schema';
import {
  FREE_PHOTOS_PER_TRIP,
  MAX_PHOTOS_PER_TRIP,
  PAID_ACCOUNT_PHOTO_CEILING,
} from '@/lib/billing/limits';
import { newPhotoKeys } from '@/lib/photos/keys';
import { getMemoryStorage, resetMemoryStorage } from '@/lib/storage';

import { GET, POST } from './route';

import {
  createMember,
  createMemberWithSession,
} from '../../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../../test/db';
import {
  cookieHeader,
  getRequest,
  jsonRequest,
} from '../../../../../../test/http';

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

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function urlFor(id: string) {
  return `http://test/api/trips/${id}/photos`;
}

// Simulates a completed browser upload by registering both objects.
async function uploadedKeys(
  userId: string,
  tripId: string,
  contentType: 'image/webp' | 'image/jpeg' = 'image/webp',
) {
  const keys = newPhotoKeys(userId, tripId, contentType);
  const store = getMemoryStorage();
  await store.presignPut(keys.displayKey, contentType);
  await store.presignPut(keys.thumbKey, contentType);
  return keys;
}

beforeEach(async () => {
  await resetDb();
  resetMemoryStorage();
});

describe('POST /api/trips/[id]/photos', () => {
  it('creates a photo record for an uploaded object', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const keys = await uploadedKeys(user.id, trip.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { ...keys, width: 2560, height: 1707 },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(201);
    const stored = await db.select().from(photos);
    expect(stored).toHaveLength(1);
    expect(stored[0].displayKey).toBe(keys.displayKey);
    expect(stored[0].position).toBe(0);
  });

  it('creates a photo record for a jpeg upload', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const keys = await uploadedKeys(user.id, trip.id, 'image/jpeg');

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { ...keys, width: 2560, height: 1707 },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(201);
    const stored = await db.select().from(photos);
    expect(stored).toHaveLength(1);
    expect(stored[0].displayKey.endsWith('.jpg')).toBe(true);
  });

  it('rejects and purges an upload with an unsupported content type', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const keys = newPhotoKeys(user.id, trip.id);
    const store = getMemoryStorage();
    store.seed(keys.displayKey, { size: 500_000, contentType: 'image/png' });
    store.seed(keys.thumbKey, { size: 50_000, contentType: 'image/png' });

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { ...keys, width: 2560, height: 1707 },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(400);
    expect(await store.stat(keys.displayKey)).toBeNull();
    expect(await store.stat(keys.thumbKey)).toBeNull();
  });

  it('assigns increasing positions', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    for (let i = 0; i < 2; i += 1) {
      const keys = await uploadedKeys(user.id, trip.id);
      await POST(
        jsonRequest(
          'POST',
          urlFor(trip.id),
          { ...keys, width: 100, height: 100 },
          cookieHeader(sessionToken),
        ),
        context(trip.id),
      );
    }

    const stored = await db.select().from(photos);
    expect(stored.map((p) => p.position).sort()).toEqual([0, 1]);
  });

  it('rejects a key outside the caller prefix', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const foreign = newPhotoKeys('someone-else', trip.id);
    const store = getMemoryStorage();
    await store.presignPut(foreign.displayKey, 'image/webp');
    await store.presignPut(foreign.thumbKey, 'image/webp');

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { ...foreign, width: 100, height: 100 },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(400);
    expect(await db.select().from(photos)).toHaveLength(0);
  });

  it('rejects and purges an oversize object', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const keys = newPhotoKeys(user.id, trip.id);
    const store = getMemoryStorage();
    store.seed(keys.displayKey, {
      size: 20_000_000,
      contentType: 'image/webp',
    });
    store.seed(keys.thumbKey, { size: 50_000, contentType: 'image/webp' });

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { ...keys, width: 100, height: 100 },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(400);
    expect(await store.stat(keys.displayKey)).toBeNull();
    expect(await store.stat(keys.thumbKey)).toBeNull();
  });

  it('rejects a key that was never uploaded', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const keys = newPhotoKeys(user.id, trip.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { ...keys, width: 100, height: 100 },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(400);
  });

  it('returns 404 for another users trip', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    const trip = await insertTripFor(other.id);
    const keys = await uploadedKeys(other.id, trip.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { ...keys, width: 100, height: 100 },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(404);
  });

  async function bulkPhotos(userId: string, tripId: string, howMany: number) {
    await db.insert(photos).values(
      Array.from({ length: howMany }, (_, i) => {
        const keys = newPhotoKeys(userId, tripId);
        return {
          tripId,
          userId,
          displayKey: keys.displayKey,
          thumbKey: keys.thumbKey,
          width: 100,
          height: 100,
          position: i,
        };
      }),
    );
  }

  async function postPhoto(userId: string, tripId: string, token: string) {
    const keys = await uploadedKeys(userId, tripId);
    return POST(
      jsonRequest(
        'POST',
        urlFor(tripId),
        { ...keys, width: 100, height: 100 },
        cookieHeader(token),
      ),
      context(tripId),
    );
  }

  it('rejects creation past the paid per-trip photo cap', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
      plan: 'paid',
    });
    const trip = await insertTripFor(user.id);
    await bulkPhotos(user.id, trip.id, MAX_PHOTOS_PER_TRIP);

    const response = await postPhoto(user.id, trip.id, sessionToken);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('photo_limit_reached');
  });

  it('blocks a free user past 6 photos on a trip', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    await bulkPhotos(user.id, trip.id, FREE_PHOTOS_PER_TRIP);

    const response = await postPhoto(user.id, trip.id, sessionToken);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('photo_limit_reached');
    expect(await db.select().from(photos)).toHaveLength(FREE_PHOTOS_PER_TRIP);
  });

  it('lets a paid user add a 7th photo to a trip', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
      plan: 'paid',
    });
    const trip = await insertTripFor(user.id);
    await bulkPhotos(user.id, trip.id, FREE_PHOTOS_PER_TRIP);

    const response = await postPhoto(user.id, trip.id, sessionToken);

    expect(response.status).toBe(201);
  });

  it('enforces the paid account-wide photo ceiling', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
      plan: 'paid',
    });
    const archiveTrip = await insertTripFor(user.id);
    await bulkPhotos(user.id, archiveTrip.id, PAID_ACCOUNT_PHOTO_CEILING);
    const freshTrip = await insertTripFor(user.id);

    const response = await postPhoto(user.id, freshTrip.id, sessionToken);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('photo_limit_reached');
  });
});

describe('GET /api/trips/[id]/photos', () => {
  it('lists photos ordered by position with signed urls', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    const first = newPhotoKeys(user.id, trip.id);
    const second = newPhotoKeys(user.id, trip.id);
    await db.insert(photos).values([
      {
        tripId: trip.id,
        userId: user.id,
        displayKey: second.displayKey,
        thumbKey: second.thumbKey,
        width: 100,
        height: 100,
        position: 1,
      },
      {
        tripId: trip.id,
        userId: user.id,
        displayKey: first.displayKey,
        thumbKey: first.thumbKey,
        width: 100,
        height: 100,
        position: 0,
      },
    ]);

    const response = await GET(
      getRequest(urlFor(trip.id), cookieHeader(sessionToken)),
      context(trip.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photos.map((p: { position: number }) => p.position)).toEqual([
      0, 1,
    ]);
    expect(body.photos[0].displayUrl).toContain(first.displayKey);
    expect(body.photos[0].thumbUrl).toContain(first.thumbKey);
  });

  it('returns 401 without a session', async () => {
    const response = await GET(
      getRequest(urlFor('00000000-0000-0000-0000-000000000000')),
      context('00000000-0000-0000-0000-000000000000'),
    );

    expect(response.status).toBe(401);
  });
});
