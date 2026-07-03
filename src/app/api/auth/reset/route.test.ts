import { beforeEach, describe, expect, it } from 'vitest';

import { issueResetToken } from '@/lib/auth/reset';
import { createSession, validateSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';

import { POST } from './route';

import { createMember } from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { postRequest } from '../../../../../test/http';

const db = testDb();
const url = 'http://test/api/auth/reset';

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/reset', () => {
  it('sets a new password once and revokes existing sessions', async () => {
    const { user } = await createMember({ verified: true });
    const existing = await createSession(db, user.id);
    const token = await issueResetToken(db, user.id);

    const response = await POST(
      postRequest(url, { token, password: 'brand-new-password' }),
    );

    expect(response.status).toBe(200);
    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(
      await verifyPassword(updated.passwordHash, 'brand-new-password'),
    ).toBe(true);
    expect(await validateSession(db, existing.token)).toBeNull();
  });

  it('rejects a reused token', async () => {
    const { user } = await createMember({ verified: true });
    const token = await issueResetToken(db, user.id);
    await POST(postRequest(url, { token, password: 'first-new-password' }));

    const second = await POST(
      postRequest(url, { token, password: 'second-new-password' }),
    );

    expect(second.status).toBe(400);
  });

  it('rejects an unknown token', async () => {
    const response = await POST(
      postRequest(url, { token: 'nope', password: 'whatever-password' }),
    );

    expect(response.status).toBe(400);
  });
});
