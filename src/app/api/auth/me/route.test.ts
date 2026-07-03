import { beforeEach, describe, expect, it } from 'vitest';

import { GET } from './route';

import { createMemberWithSession } from '../../../../../test/auth-fixtures';
import { resetDb } from '../../../../../test/db';
import { cookieHeader } from '../../../../../test/http';

const url = 'http://test/api/auth/me';

function getRequest(headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

beforeEach(async () => {
  await resetDb();
});

describe('GET /api/auth/me', () => {
  it('returns the current user with verification state', async () => {
    const { user, sessionToken } = await createMemberWithSession();

    const response = await GET(getRequest(cookieHeader(sessionToken)));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user.username).toBe(user.username);
    expect(body.user.emailVerified).toBe(false);
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without a session', async () => {
    const response = await GET(getRequest());

    expect(response.status).toBe(401);
  });
});
