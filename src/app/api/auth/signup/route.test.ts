import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { invites, users } from '@/db/schema';
import { sha256 } from '@/lib/auth/tokens';

import { POST } from './route';

import {
  createOwnerWithInvite,
  mintInvite,
} from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { postRequest, sessionCookieFrom } from '../../../../../test/http';
import { clearMemoryInbox, readMemoryInbox } from '@/lib/email';

const db = testDb();
const url = 'http://test/api/auth/signup';

function signupBody(invite: string, overrides: Record<string, unknown> = {}) {
  return {
    email: 'newuser@example.com',
    username: 'newuser',
    name: 'New User',
    password: 'a-strong-password',
    invite,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDb();
  clearMemoryInbox();
});

describe('POST /api/auth/signup', () => {
  it('creates the user, consumes the invite, emails a code, and sets a session', async () => {
    const { inviteToken } = await createOwnerWithInvite();

    const response = await POST(postRequest(url, signupBody(inviteToken)));

    expect(response.status).toBe(201);
    expect(sessionCookieFrom(response)).toBeTruthy();

    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'newuser@example.com'));
    expect(created.emailVerifiedAt).toBeNull();
    expect(created.role).toBe('member');

    const [invite] = await db.select().from(invites);
    expect(invite.usedBy).toBe(created.id);
    expect(invite.usedAt).not.toBeNull();

    const inbox = readMemoryInbox();
    expect(inbox).toHaveLength(1);
    expect(inbox[0].to).toBe('newuser@example.com');
    expect(inbox[0].text).toMatch(/\d{6}/);
  });

  it('rejects an unknown invite token', async () => {
    const response = await POST(postRequest(url, signupBody('nope')));

    expect(response.status).toBe(400);
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('rejects a reused invite', async () => {
    const { inviteToken } = await createOwnerWithInvite();
    await POST(postRequest(url, signupBody(inviteToken)));

    const second = await POST(
      postRequest(
        url,
        signupBody(inviteToken, {
          email: 'other@example.com',
          username: 'other',
        }),
      ),
    );

    expect(second.status).toBe(400);
    expect(await db.select().from(users)).toHaveLength(2); // owner + first
  });

  it('rejects a revoked invite', async () => {
    const { inviteToken } = await createOwnerWithInvite();
    await db
      .update(invites)
      .set({ revokedAt: new Date() })
      .where(eq(invites.tokenHash, sha256(inviteToken)));

    const response = await POST(postRequest(url, signupBody(inviteToken)));

    expect(response.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    const { owner, inviteToken } = await createOwnerWithInvite();
    await POST(postRequest(url, signupBody(inviteToken)));
    const second = await mintInvite(owner.id);

    const response = await POST(
      postRequest(url, signupBody(second, { username: 'different' })),
    );

    expect(response.status).toBe(409);
  });

  it('rejects a weak password before touching the invite', async () => {
    const { inviteToken } = await createOwnerWithInvite();

    const response = await POST(
      postRequest(url, signupBody(inviteToken, { password: 'short' })),
    );

    expect(response.status).toBe(400);
    const [invite] = await db.select().from(invites);
    expect(invite.usedAt).toBeNull();
  });
});
