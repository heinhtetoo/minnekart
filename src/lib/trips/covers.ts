import { asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { photos } from '@/db/schema';
import { storage } from '@/lib/storage';

const READ_EXPIRY_SECONDS = 60 * 60;

export interface TripCover {
  thumbUrl: string | null;
  count: number;
}

export async function tripCovers(
  userId: string,
): Promise<Map<string, TripCover>> {
  const rows = await db()
    .select({
      tripId: photos.tripId,
      thumbKey: photos.thumbKey,
    })
    .from(photos)
    .where(eq(photos.userId, userId))
    .orderBy(asc(photos.position), asc(photos.createdAt));

  const firstKey = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.tripId, (counts.get(row.tripId) ?? 0) + 1);
    if (!firstKey.has(row.tripId)) {
      firstKey.set(row.tripId, row.thumbKey);
    }
  }

  const store = storage();
  const covers = new Map<string, TripCover>();
  for (const [tripId, count] of counts) {
    const key = firstKey.get(tripId);
    const thumbUrl = key
      ? await store.presignGet(key, READ_EXPIRY_SECONDS)
      : null;
    covers.set(tripId, { thumbUrl, count });
  }
  return covers;
}
