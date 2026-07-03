import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { users } from '@/db/schema';
import { issueOtp } from '@/lib/auth/otp';

import { POST } from './route';

import { createMemberWithSession } from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { cookieHeader, postRequest } from '../../../../../test/http';

const db = testDb();
const url = 'http://test/api/auth/verify';

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/verify', () => {
  it('verifies the account with the correct code', async () => {
    const { user, sessionToken } = await createMemberWithSession();
    const code = await issueOtp(db, user.id);

    const response = await POST(
      postRequest(url, { code }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updated.emailVerifiedAt).not.toBeNull();
  });

  it('rejects a wrong code and blocks after five attempts', async () => {
    const { user, sessionToken } = await createMemberWithSession();
    await issueOtp(db, user.id);

    for (let i = 0; i < 5; i += 1) {
      const response = await POST(
        postRequest(url, { code: '000000' }, cookieHeader(sessionToken)),
      );
      expect(response.status).toBe(400);
    }

    const blocked = await POST(
      postRequest(url, { code: '000000' }, cookieHeader(sessionToken)),
    );
    expect(blocked.status).toBe(429);
  });

  it('requires a session', async () => {
    const response = await POST(postRequest(url, { code: '123456' }));

    expect(response.status).toBe(401);
  });
});
