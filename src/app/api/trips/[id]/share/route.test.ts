import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { trips } from '@/db/schema';

import { DELETE, POST } from './route';

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

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function urlFor(id: string) {
  return `http://test/api/trips/${id}/share`;
}

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/trips/[id]/share', () => {
  it('generates a share token for the owner trip', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.shareToken).toBeTruthy();
    expect(body.url).toContain(`/t/${body.shareToken}`);

    const [updated] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, trip.id));
    expect(updated.shareToken).toBe(body.shareToken);
  });

  it('is idempotent when already shared', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);

    const first = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );
    const second = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect((await first.json()).shareToken).toBe(
      (await second.json()).shareToken,
    );
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
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(404);
  });

  it('returns 401 without a session', async () => {
    const { user } = await createMember({ verified: true });
    const trip = await insertTripFor(user.id);

    const response = await POST(
      jsonRequest('POST', urlFor(trip.id)),
      context(trip.id),
    );

    expect(response.status).toBe(401);
  });

  it('returns 403 for an unverified session', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: false,
    });
    const trip = await insertTripFor(user.id);

    const response = await POST(
      jsonRequest(
        'POST',
        urlFor(trip.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(trip.id),
    );

    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/trips/[id]/share', () => {
  it('revokes the share token', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const trip = await insertTripFor(user.id);
    await db
      .update(trips)
      .set({ shareToken: 'secret-token' })
      .where(eq(trips.id, trip.id));

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
    const [updated] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, trip.id));
    expect(updated.shareToken).toBeNull();
  });

  it('returns 404 revoking another users trip', async () => {
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
  });
});
