import { asc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { photos } from '@/db/schema';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import {
  PAID_ACCOUNT_PHOTO_CEILING,
  photosPerTripFor,
} from '@/lib/billing/limits';
import { isPhotoContentType } from '@/lib/photos/content-type';
import { isKeyUnderPrefix, photoPrefix } from '@/lib/photos/keys';
import { writePositions } from '@/lib/photos/ordering';
import { signPhoto, signPhotos } from '@/lib/photos/sign';
import {
  createPhotoSchema,
  reorderPhotosSchema,
} from '@/lib/photos/validation';
import { storage } from '@/lib/storage';
import { StoredObject } from '@/lib/storage/types';
import { getOwnedTrip } from '@/lib/trips/access';

type Context = { params: Promise<{ id: string }> };

const MAX_DISPLAY_BYTES = 8 * 1024 * 1024;
const MAX_THUMB_BYTES = 1 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id } = await params;

  const trip = await getOwnedTrip(database, id, guard.user.id);
  if (!trip) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  const parsed = createPhotoSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const { displayKey, thumbKey, width, height, takenAt, position } =
    parsed.data;

  const prefix = photoPrefix(guard.user.id, trip.id);
  if (
    !isKeyUnderPrefix(displayKey, prefix) ||
    !isKeyUnderPrefix(thumbKey, prefix)
  ) {
    return jsonResponse({ error: 'invalid_key' }, 400);
  }

  const [{ count }] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(photos)
    .where(eq(photos.tripId, trip.id));
  if (count >= photosPerTripFor(guard.user.plan)) {
    return jsonResponse({ error: 'photo_limit_reached' }, 409);
  }

  if (guard.user.plan === 'paid') {
    const [{ count: accountCount }] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(photos)
      .where(eq(photos.userId, guard.user.id));
    if (accountCount >= PAID_ACCOUNT_PHOTO_CEILING) {
      return jsonResponse({ error: 'photo_limit_reached' }, 409);
    }
  }

  const store = storage();
  const [displayObject, thumbObject] = await Promise.all([
    store.stat(displayKey),
    store.stat(thumbKey),
  ]);
  if (
    !isAcceptable(displayObject, MAX_DISPLAY_BYTES) ||
    !isAcceptable(thumbObject, MAX_THUMB_BYTES)
  ) {
    await Promise.all([store.delete(displayKey), store.delete(thumbKey)]);
    return jsonResponse({ error: 'invalid_upload' }, 400);
  }

  const nextPosition = position ?? count;
  const [photo] = await database
    .insert(photos)
    .values({
      tripId: trip.id,
      userId: guard.user.id,
      displayKey,
      thumbKey,
      width,
      height,
      takenAt: takenAt ? new Date(takenAt) : null,
      position: nextPosition,
    })
    .returning();

  return jsonResponse({ photo: await signPhoto(store, photo) }, 201);
}

export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id } = await params;

  const trip = await getOwnedTrip(database, id, guard.user.id);
  if (!trip) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  const owned = await database
    .select()
    .from(photos)
    .where(eq(photos.tripId, trip.id))
    .orderBy(asc(photos.position));

  const signed = await signPhotos(storage(), owned);
  return jsonResponse({ photos: signed }, 200);
}

export async function PATCH(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id } = await params;

  const trip = await getOwnedTrip(database, id, guard.user.id);
  if (!trip) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  const parsed = reorderPhotosSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const { order } = parsed.data;

  const existing = await database
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.tripId, trip.id));
  if (
    !isSamePhotoSet(
      order,
      existing.map((row) => row.id),
    )
  ) {
    return jsonResponse({ error: 'invalid_order' }, 400);
  }

  await writePositions(database, trip.id, order);
  return jsonResponse({ ok: true }, 200);
}

function isSamePhotoSet(order: string[], existingIds: string[]): boolean {
  if (order.length !== existingIds.length) {
    return false;
  }
  const unique = new Set(order);
  if (unique.size !== order.length) {
    return false;
  }
  return existingIds.every((id) => unique.has(id));
}

function isAcceptable(object: StoredObject | null, maxBytes: number): boolean {
  return (
    object !== null &&
    isPhotoContentType(object.contentType) &&
    object.size <= maxBytes
  );
}
