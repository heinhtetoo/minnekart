import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { invites, photos, trips, users } from '@/db/schema';
import { newPhotoKeys } from '@/lib/photos/keys';
import { getMemoryStorage, resetMemoryStorage } from '@/lib/storage';

import { DELETE } from './route';

import {
  createMemberWithSession,
  createOwnerWithSession,
} from '../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../test/http';

const paddle = vi.hoisted(() => ({
  paddleApiConfigured: vi.fn(() => true),
  cancelSubscription: vi.fn(async () => undefined),
  resumeSubscription: vi.fn(async () => undefined),
  updatePaymentMethodTransaction: vi.fn(async () => 'txn_9'),
}));

vi.mock('@/lib/billing/paddle-api', () => paddle);

const db = testDb();
const URL = 'http://test/api/account';
const PASSWORD = 'a-strong-password';

function del(token: string, body: unknown) {
  return DELETE(jsonRequest('DELETE', URL, body, cookieHeader(token)));
}

beforeEach(async () => {
  await resetDb();
  resetMemoryStorage();
  vi.clearAllMocks();
  paddle.paddleApiConfigured.mockReturnValue(true);
});

describe('DELETE /api/account', () => {
  it('rejects a request with no session', async () => {
    const response = await DELETE(
      jsonRequest('DELETE', URL, { password: PASSWORD }),
    );

    expect(response.status).toBe(401);
  });

  it('rejects an unverified user', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: false });

    const response = await del(sessionToken, { password: PASSWORD });

    expect(response.status).toBe(403);
  });

  it('refuses to delete the owner', async () => {
    const { sessionToken } = await createOwnerWithSession();

    const response = await del(sessionToken, { password: PASSWORD });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'owner_undeletable' });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('rejects a wrong password', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await del(sessionToken, { password: 'wrong-password' });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'invalid_password' });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('rejects a request with no password', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await del(sessionToken, {});

    expect(response.status).toBe(400);
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('deletes the user, their trips and photos, and clears the cookie', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const [trip] = await db
      .insert(trips)
      .values({
        userId: user.id,
        placeName: 'Kyoto',
        country: 'Japan',
        lat: 35.0116,
        lng: 135.7681,
        dateStart: '2023-04-02',
      })
      .returning();
    const keys = newPhotoKeys(user.id, trip.id);
    const store = getMemoryStorage();
    await store.presignPut(keys.displayKey, 'image/webp');
    await store.presignPut(keys.thumbKey, 'image/webp');
    await db.insert(photos).values({
      tripId: trip.id,
      userId: user.id,
      displayKey: keys.displayKey,
      thumbKey: keys.thumbKey,
      width: 100,
      height: 100,
    });

    const response = await del(sessionToken, { password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('session=;');
    expect(await db.select().from(users)).toHaveLength(0);
    expect(await db.select().from(trips)).toHaveLength(0);
    expect(await db.select().from(photos)).toHaveLength(0);
    expect(await store.stat(keys.displayKey)).toBeNull();
    expect(await store.stat(keys.thumbKey)).toBeNull();
  });

  it('cancels an active Paddle subscription immediately', async () => {
    const { sessionToken } = await createMemberWithSession({
      verified: true,
      plan: 'paid',
      subscriptionId: 'sub_1',
    });

    const response = await del(sessionToken, { password: PASSWORD });

    expect(response.status).toBe(200);
    expect(paddle.cancelSubscription).toHaveBeenCalledWith(
      'sub_1',
      undefined,
      'immediately',
    );
  });

  it('nulls the used_by on any invite the deleted user consumed', async () => {
    const { owner } = await createOwnerWithSession();
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
      email: 'joiner@example.com',
      username: 'joiner',
    });
    const [invite] = await db
      .insert(invites)
      .values({
        tokenHash: 'used-invite-hash',
        createdBy: owner.id,
        usedBy: user.id,
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      })
      .returning();

    const response = await del(sessionToken, { password: PASSWORD });

    expect(response.status).toBe(200);
    const [remaining] = await db
      .select()
      .from(invites)
      .where(eq(invites.id, invite.id));
    expect(remaining.usedBy).toBeNull();
    expect(remaining.usedAt).not.toBeNull();
  });
});
