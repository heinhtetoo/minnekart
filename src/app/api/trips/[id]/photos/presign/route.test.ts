import { beforeEach, describe, expect, it } from 'vitest';

import { trips } from '@/db/schema';

import { POST } from './route';

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

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function urlFor(id: string) {
  return `http://test/api/trips/${id}/photos/presign`;
}

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/trips/[id]/photos/presign', () => {
  it('returns keys under the caller prefix and upload urls', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { contentType: 'image/webp' },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    const prefix = `photos/${user.id}/${trip.id}/`;
    expect(body.displayKey.startsWith(prefix)).toBe(true);
    expect(body.thumbKey.startsWith(prefix)).toBe(true);
    expect(body.displayUploadUrl).toContain(body.displayKey);
    expect(body.thumbUploadUrl).toContain(body.thumbKey);
  });

  it('accepts image/jpeg and issues jpg keys', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { contentType: 'image/jpeg' },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.displayKey.endsWith('.jpg')).toBe(true);
    expect(body.thumbKey.endsWith('_thumb.jpg')).toBe(true);
  });

  it('rejects an unsupported content type', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { contentType: 'image/png' },
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

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { contentType: 'image/webp' },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(404);
  });

  it('rejects an unverified user with 403', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: false,
    });
    const trip = await insertTripFor(user.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        { contentType: 'image/webp' },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(403);
  });
});
