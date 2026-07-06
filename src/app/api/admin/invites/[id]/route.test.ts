import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { invites } from '@/db/schema';
import { consumeInvite, createInvite } from '@/lib/auth/invites';

import { DELETE } from './route';

import {
  createMemberWithSession,
  createOwnerWithSession,
} from '../../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../../test/http';

const db = testDb();

beforeEach(async () => {
  await resetDb();
});

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

function urlFor(id: string) {
  return `http://test/api/admin/invites/${id}`;
}

describe('DELETE /api/admin/invites/[id]', () => {
  it('lets the owner revoke an unused invite', async () => {
    const { owner, sessionToken } = await createOwnerWithSession();
    const { invite } = await createInvite(db, owner.id);

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(invite.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(invite.id),
    );

    expect(response.status).toBe(200);
    const [row] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, invite.id));
    expect(row.revokedAt).not.toBeNull();
  });

  it('returns 404 when revoking an already-used invite', async () => {
    const { owner, sessionToken } = await createOwnerWithSession();
    const { invite } = await createInvite(db, owner.id);
    await consumeInvite(db, invite.id, owner.id);

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(invite.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(invite.id),
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 for an unknown invite', async () => {
    const { sessionToken } = await createOwnerWithSession();
    const missingId = '00000000-0000-0000-0000-000000000000';

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(missingId),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(missingId),
    );

    expect(response.status).toBe(404);
  });

  it('returns 403 for a verified member', async () => {
    const { owner } = await createOwnerWithSession();
    const { invite } = await createInvite(db, owner.id);
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await DELETE(
      jsonRequest(
        'DELETE',
        urlFor(invite.id),
        undefined,
        cookieHeader(sessionToken),
      ),
      context(invite.id),
    );

    expect(response.status).toBe(403);
  });
});
