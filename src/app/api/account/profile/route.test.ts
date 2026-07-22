import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { photos, trips, users } from '@/db/schema';
import { newPhotoKeys } from '@/lib/photos/keys';

import { PATCH } from './route';

import {
  createMember,
  createMemberWithSession,
} from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../test/http';

const db = testDb();

const url = 'http://test/api/account/profile';

async function insertPhotoFor(userId: string) {
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
  const [photo] = await db
    .insert(photos)
    .values({
      tripId: trip.id,
      userId,
      displayKey: keys.displayKey,
      thumbKey: keys.thumbKey,
      width: 100,
      height: 100,
    })
    .returning();
  return photo;
}

async function profilePhotoIdOf(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  return row.profilePhotoId;
}

beforeEach(async () => {
  await resetDb();
});

describe('PATCH /api/account/profile', () => {
  it('saves the profile fields', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        {
          name: 'Hein',
          tagline: 'Cartographer of small moments',
          headline: 'I collect places.',
          bio: 'First paragraph.\n\nSecond paragraph.',
        },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Hein');
    expect(body.tagline).toBe('Cartographer of small moments');

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updated.name).toBe('Hein');
    expect(updated.headline).toBe('I collect places.');
    expect(updated.bio).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('stores a cleared optional field as null, not an empty string', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        { name: 'Hein', tagline: '', headline: '   ', bio: '' },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(200);
    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));
    expect(updated.tagline).toBeNull();
    expect(updated.headline).toBeNull();
    expect(updated.bio).toBeNull();
  });

  it('rejects a blank name', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await PATCH(
      jsonRequest('PATCH', url, { name: '   ' }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(400);
  });

  it('rejects an over-length bio', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        { name: 'Hein', bio: 'x'.repeat(2001) },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(400);
  });

  it('saves a profile photo the caller owns', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const photo = await insertPhotoFor(user.id);

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        { name: 'Hein', profilePhotoId: photo.id },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(200);
    expect(await profilePhotoIdOf(user.id)).toBe(photo.id);
  });

  it('rejects a photo belonging to another user', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const { user: other } = await createMember({
      email: 'other@example.com',
      username: 'other',
      verified: true,
    });
    const foreign = await insertPhotoFor(other.id);

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        { name: 'Hein', profilePhotoId: foreign.id },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('invalid_photo');
    expect(await profilePhotoIdOf(user.id)).toBeNull();
  });

  it('rejects a profile photo id that does not exist', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        {
          name: 'Hein',
          profilePhotoId: '00000000-0000-0000-0000-000000000000',
        },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(400);
    expect(await profilePhotoIdOf(user.id)).toBeNull();
  });

  it('clears the profile photo when sent null', async () => {
    const { user, sessionToken } = await createMemberWithSession({
      verified: true,
    });
    const photo = await insertPhotoFor(user.id);
    await db
      .update(users)
      .set({ profilePhotoId: photo.id })
      .where(eq(users.id, user.id));

    const response = await PATCH(
      jsonRequest(
        'PATCH',
        url,
        { name: 'Hein', profilePhotoId: null },
        cookieHeader(sessionToken),
      ),
    );

    expect(response.status).toBe(200);
    expect(await profilePhotoIdOf(user.id)).toBeNull();
  });

  it('nulls the profile photo when that photo is deleted', async () => {
    const { user } = await createMemberWithSession({ verified: true });
    const photo = await insertPhotoFor(user.id);
    await db
      .update(users)
      .set({ profilePhotoId: photo.id })
      .where(eq(users.id, user.id));

    await db.delete(photos).where(eq(photos.id, photo.id));

    expect(await profilePhotoIdOf(user.id)).toBeNull();
  });

  it('returns 401 without a session', async () => {
    const response = await PATCH(jsonRequest('PATCH', url, { name: 'Hein' }));

    expect(response.status).toBe(401);
  });

  it('returns 403 for an unverified session', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: false });

    const response = await PATCH(
      jsonRequest('PATCH', url, { name: 'Hein' }, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(403);
  });
});
