import { beforeEach, describe, expect, it } from 'vitest';

import { validateSession } from '@/lib/auth/session';

import { POST } from './route';

import { createMemberWithSession } from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { cookieHeader, postRequest } from '../../../../../test/http';

const db = testDb();
const url = 'http://test/api/auth/logout';

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/logout', () => {
  it('revokes the session and clears the cookie', async () => {
    const { sessionToken } = await createMemberWithSession();

    const response = await POST(
      postRequest(url, {}, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('session=;');
    expect(await validateSession(db, sessionToken)).toBeNull();
  });

  it('is a no-op without a session', async () => {
    const response = await POST(postRequest(url, {}));

    expect(response.status).toBe(200);
  });
});
