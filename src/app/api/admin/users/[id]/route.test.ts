import { beforeEach, describe, expect, it } from 'vitest';

import { users } from '@/db/schema';
import { resetMemoryStorage } from '@/lib/storage';

import { DELETE } from './route';

import {
  createMember,
  createMemberWithSession,
  createOwnerWithSession,
} from '../../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../../test/http';

const db = testDb();

function urlFor(id: string) {
  return `http://test/api/admin/users/${id}`;
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function del(id: string, token?: string) {
  const headers = token ? cookieHeader(token) : {};
  return DELETE(
    jsonRequest('DELETE', urlFor(id), undefined, headers),
    context(id),
  );
}

beforeEach(async () => {
  await resetDb();
  resetMemoryStorage();
});

describe('DELETE /api/admin/users/[id]', () => {
  it('rejects a request with no session', async () => {
    const { user } = await createMember({ verified: true });

    const response = await del(user.id);

    expect(response.status).toBe(401);
  });

  it('rejects a non-owner member', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });
    const { user: target } = await createMember({
      email: 'target@example.com',
      username: 'target',
      verified: true,
    });

    const response = await del(target.id, sessionToken);

    expect(response.status).toBe(403);
    expect(await db.select().from(users)).toHaveLength(2);
  });

  it('lets the owner delete a member', async () => {
    const { sessionToken } = await createOwnerWithSession();
    const { user: target } = await createMember({
      email: 'target@example.com',
      username: 'target',
      verified: true,
    });

    const response = await del(target.id, sessionToken);

    expect(response.status).toBe(200);
    const remaining = await db.select().from(users);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].role).toBe('owner');
  });

  it('refuses to delete an owner', async () => {
    const { owner, sessionToken } = await createOwnerWithSession();

    const response = await del(owner.id, sessionToken);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'owner_undeletable' });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('returns 404 for an unknown user', async () => {
    const { sessionToken } = await createOwnerWithSession();

    const response = await del(
      '00000000-0000-0000-0000-000000000000',
      sessionToken,
    );

    expect(response.status).toBe(404);
  });
});
