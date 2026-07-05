import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { users } from '@/db/schema';

import { PATCH } from './route';

import { createMemberWithSession } from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../test/http';

const db = testDb();

const url = 'http://test/api/account/globe';

beforeEach(async () => {
  await resetDb();
});

describe('PATCH /api/account/globe', () => {
  it('makes the users globe public', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      username: 'hein',
      verified: true,
    });

    const response = await PATCH(
      jsonRequest('PATCH', url, { public: true }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.globePublic).toBe(true);
    expect(body.url).toContain('/u/hein');

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updated.globePublic).toBe(true);
  });

  it('rejects an invalid body', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await PATCH(
      jsonRequest('PATCH', url, { public: 'yes' }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(400);
  });

  it('returns 401 without a session', async () => {
    const response = await PATCH(jsonRequest('PATCH', url, { public: true }));

    expect(response.status).toBe(401);
  });

  it('returns 403 for an unverified session', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: false });

    const response = await PATCH(
      jsonRequest('PATCH', url, { public: true }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(403);
  });
});
