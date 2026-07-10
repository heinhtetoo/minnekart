import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { trips, users } from '@/db/schema';
import { FREE_TRIP_LIMIT } from '@/lib/billing/limits';

import { GET, POST } from './route';

import {
  createMember,
  createMemberWithSession,
} from '../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../test/db';
import { cookieHeader, getRequest, jsonRequest } from '../../../../test/http';

const db = testDb();
const url = 'http://test/api/trips';

const tripBody = {
  placeName: 'Kyoto',
  country: 'Japan',
  lat: 35.0116,
  lng: 135.7681,
  dateStart: '2023-04-02',
};

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/trips', () => {
  it('creates a trip owned by the session user', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });

    const response = await POST(
      jsonRequest('POST', url, tripBody, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.trip.placeName).toBe('Kyoto');
    const stored = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, user.id));
    expect(stored).toHaveLength(1);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await POST(jsonRequest('POST', url, tripBody));

    expect(response.status).toBe(401);
  });

  it('rejects an unverified user with 403', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: false });

    const response = await POST(
      jsonRequest('POST', url, tripBody, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(403);
  });

  it('rejects an invalid body', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await POST(
      jsonRequest(
        'POST',
        url,
        { ...tripBody, lat: 999 },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(400);
  });

  async function insertTrips(userId: string, howMany: number) {
    await db.insert(trips).values(
      Array.from({ length: howMany }, (_, i) => ({
        ...tripBody,
        userId,
        placeName: `Trip ${i}`,
      })),
    );
  }

  it('blocks a free user past the 15-trip limit', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    await insertTrips(user.id, FREE_TRIP_LIMIT);

    const response = await POST(
      jsonRequest('POST', url, tripBody, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('trip_limit_reached');
    const stored = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, user.id));
    expect(stored).toHaveLength(FREE_TRIP_LIMIT);
  });

  it('unblocks trip creation after an upgrade to paid', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    await insertTrips(user.id, FREE_TRIP_LIMIT);

    const blocked = await POST(
      jsonRequest('POST', url, tripBody, cookieHeader(sessionToken)),
    );
    expect(blocked.status).toBe(409);

    await db.update(users).set({ plan: 'paid' }).where(eq(users.id, user.id));

    const allowed = await POST(
      jsonRequest('POST', url, tripBody, cookieHeader(sessionToken)),
    );
    expect(allowed.status).toBe(201);
  });

  it('lets a paid user create past 15 trips', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
      plan: 'paid',
    });
    await insertTrips(user.id, FREE_TRIP_LIMIT);

    const response = await POST(
      jsonRequest('POST', url, tripBody, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(201);
  });
});

describe('GET /api/trips', () => {
  it('lists only the caller trips, newest first', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    await db.insert(trips).values([
      {
        ...tripBody,
        userId: user.id,
        placeName: 'Older',
        dateStart: '2020-01-01',
      },
      {
        ...tripBody,
        userId: user.id,
        placeName: 'Newer',
        dateStart: '2024-01-01',
      },
    ]);
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    await db
      .insert(trips)
      .values({ ...tripBody, userId: other.id, placeName: 'Someone Else' });

    const response = await GET(getRequest(url, cookieHeader(sessionToken)));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(
      body.trips.map((trip: { placeName: string }) => trip.placeName),
    ).toEqual(['Newer', 'Older']);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await GET(getRequest(url));

    expect(response.status).toBe(401);
  });
});
