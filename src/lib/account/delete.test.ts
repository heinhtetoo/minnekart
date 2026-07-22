import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { photos, trips, users } from '@/db/schema';
import { newPhotoKeys } from '@/lib/photos/keys';
import { getMemoryStorage, resetMemoryStorage, storage } from '@/lib/storage';

import { deleteAccount } from './delete';

import { createMember } from '../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../test/db';

const db = testDb();

async function seedTripWithPhoto(userId: string) {
  const [trip] = await db
    .insert(trips)
    .values({
      userId,
      placeName: 'Kyoto',
      country: 'Japan',
      lat: 35.0116,
      lng: 135.7681,
      dateStart: '2023-04-02',
    })
    .returning();
  const keys = newPhotoKeys(userId, trip.id);
  const store = getMemoryStorage();
  await store.presignPut(keys.displayKey, 'image/webp');
  await store.presignPut(keys.thumbKey, 'image/webp');
  await db.insert(photos).values({
    tripId: trip.id,
    userId,
    displayKey: keys.displayKey,
    thumbKey: keys.thumbKey,
    width: 100,
    height: 100,
  });
  return keys;
}

function okFetch() {
  return vi.fn(
    async () => new Response(JSON.stringify({ data: {} }), { status: 200 }),
  );
}

beforeEach(async () => {
  await resetDb();
  resetMemoryStorage();
});

describe('deleteAccount', () => {
  it('removes the user, their trips and photos, and their objects', async () => {
    const { user } = await createMember({ verified: true });
    const keys = await seedTripWithPhoto(user.id);

    await deleteAccount(db, storage(), user);

    expect(await db.select().from(users)).toHaveLength(0);
    expect(await db.select().from(trips)).toHaveLength(0);
    expect(await db.select().from(photos)).toHaveLength(0);
    const store = getMemoryStorage();
    expect(await store.stat(keys.displayKey)).toBeNull();
    expect(await store.stat(keys.thumbKey)).toBeNull();
  });

  it('deletes an account whose profile card photo is one of its own photos', async () => {
    const { user } = await createMember({ verified: true });
    await seedTripWithPhoto(user.id);
    const [photo] = await db.select().from(photos);
    await db
      .update(users)
      .set({ profilePhotoId: photo.id })
      .where(eq(users.id, user.id));

    await deleteAccount(db, storage(), user);

    expect(await db.select().from(users)).toHaveLength(0);
    expect(await db.select().from(photos)).toHaveLength(0);
  });

  it('cancels a Paddle subscription immediately before deleting', async () => {
    const { user } = await createMember({
      verified: true,
      plan: 'paid',
      subscriptionId: 'sub_1',
    });
    const fetchImpl = okFetch();

    await deleteAccount(db, storage(), user, {
      paddle: { apiKey: 'test-key', environment: 'sandbox', fetchImpl },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions/sub_1/cancel'),
      expect.objectContaining({ body: expect.stringContaining('immediately') }),
    );
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('does not call Paddle for a user with no subscription', async () => {
    const { user } = await createMember({ verified: true });
    const fetchImpl = okFetch();

    await deleteAccount(db, storage(), user, {
      paddle: { apiKey: 'test-key', environment: 'sandbox', fetchImpl },
    });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('still deletes the account when the Paddle cancel fails', async () => {
    const { user } = await createMember({
      verified: true,
      plan: 'paid',
      subscriptionId: 'sub_1',
    });
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 }));

    await deleteAccount(db, storage(), user, {
      paddle: { apiKey: 'test-key', environment: 'sandbox', fetchImpl },
    });

    expect(await db.select().from(users)).toHaveLength(0);
  });
});
