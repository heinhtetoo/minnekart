import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { users } from '@/db/schema';

import { PATCH } from './route';

import { createMemberWithSession } from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../test/http';

const db = testDb();

const url = 'http://test/api/account/profile';

beforeEach(async () => {
  await resetDb();
});

describe('PATCH /api/account/profile', () => {
  it('saves the profile fields', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        {
          name: 'Hein',
          tagline: 'Cartographer of small moments',
          headline: 'I collect places.',
          bio: 'First paragraph.\n\nSecond paragraph.',
        },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Hein');
    expect(body.tagline).toBe('Cartographer of small moments');

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updated.name).toBe('Hein');
    expect(updated.headline).toBe('I collect places.');
    expect(updated.bio).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('stores a cleared optional field as null, not an empty string', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        { name: 'Hein', tagline: '', headline: '   ', bio: '' },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(200);
    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updated.tagline).toBeNull();
    expect(updated.headline).toBeNull();
    expect(updated.bio).toBeNull();
  });

  it('rejects a blank name', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await PATCH(
      jsonRequest('PATCH', url, { name: '   ' }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(400);
  });

  it('rejects an over-length bio', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        { name: 'Hein', bio: 'x'.repeat(2001) },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(400);
  });

  it('returns 401 without a session', async () => {
    const response = await PATCH(jsonRequest('PATCH', url, { name: 'Hein' }));

    expect(response.status).toBe(401);
  });

  it('returns 403 for an unverified session', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: false });

    const response = await PATCH(
      jsonRequest('PATCH', url, { name: 'Hein' }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(403);
  });
});
