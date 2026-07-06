import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { invites } from '@/db/schema';
import { sha256 } from '@/lib/auth/tokens';

import { POST } from './route';

import {
  createMemberWithSession,
  createOwnerWithSession,
} from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../test/http';

const db = testDb();

const url = 'http://test/api/admin/invites';

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/admin/invites', () => {
  it('lets the owner create an invite with a note', async () => {
    const { sessionToken } = await createOwnerWithSession();

    const response = await POST(
      jsonRequest('POST', url, { note: 'for Sofia' }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.url).toContain(`/signup?invite=${body.token}`);

    const [row] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, body.id));
    expect(row.tokenHash).toBe(sha256(body.token));
    expect(row.note).toBe('for Sofia');
  });

  it('creates an invite without a note', async () => {
    const { sessionToken } = await createOwnerWithSession();

    const response = await POST(
      jsonRequest('POST', url, {}, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    const [row] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, body.id));
    expect(row.note).toBeNull();
  });

  it('returns 403 for a verified member', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await POST(
      jsonRequest('POST', url, {}, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe('not_authorized');
  });

  it('returns 403 for an unverified session', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: false });

    const response = await POST(
      jsonRequest('POST', url, {}, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(403);
  });

  it('returns 401 without a session', async () => {
    const response = await POST(jsonRequest('POST', url, {}));

    expect(response.status).toBe(401);
  });
});
