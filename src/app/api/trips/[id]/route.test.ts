import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { trips } from '@/db/schema';

import { DELETE, GET, PATCH } from './route';

import {
  createMember,
  createMemberWithSession,
} from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import {
  cookieHeader,
  getRequest,
  jsonRequest,
} from '../../../../../test/http';

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
  return `http://test/api/trips/${id}`;
}

beforeEach(async () => {
  await resetDb();
});

describe('GET /api/trips/[id]', () => {
  it('returns the owner trip', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const response = await GET(
      getRequest(urlFor(trip.id), cookieHeader(sessionToken)),
      context(trip.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.trip.id).toBe(trip.id);
  });

  it('returns 404 for another users trip', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    const trip = await insertTripFor(other.id);

    const response = await GET(
      getRequest(urlFor(trip.id), cookieHeader(sessionToken)),
      context(trip.id),
    );

    expect(response.status).toBe(404);
  });

  it('returns 401 without a session', async () => {
    const response = await GET(
      getRequest(urlFor('00000000-0000-0000-0000-000000000000')),
      context('00000000-0000-0000-0000-000000000000'),
    );

    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/trips/[id]', () => {
  it('updates fields on the owner trip', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        urlFor(trip.id),
        { highlight: 'A new highlight.' },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(200);
    const [updated] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, trip.id));
    expect(updated.highlight).toBe('A new highlight.');
  });

  it('will not update another users trip', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    const trip = await insertTripFor(other.id);

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        urlFor(trip.id),
        { highlight: 'hijack' },
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/trips/[id]', () => {
  it('deletes the owner trip', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(trip.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(200);
    expect(await db.select().from(trips)).toHaveLength(0);
  });

  it('returns 404 deleting another users trip', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    const trip = await insertTripFor(other.id);

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(trip.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(404);
    expect(await db.select().from(trips)).toHaveLength(1);
  });
});
