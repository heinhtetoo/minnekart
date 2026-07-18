import { and, asc, eq } from 'drizzle-orm';

import { Database } from '@/db';
import { photos } from '@/db/schema';

export async function writePositions(
  database: Database,
  tripId: string,
  orderedIds: string[],
): Promise<void> {
  await database.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(photos)
        .set({ position: index })
        .where(and(eq(photos.id, id), eq(photos.tripId, tripId)));
    }
  });
}

export async function packPhotoPositions(
  database: Database,
  tripId: string,
): Promise<void> {
  const rows = await database
    .select({ id: photos.id, position: photos.position })
    .from(photos)
    .where(eq(photos.tripId, tripId))
    .orderBy(asc(photos.position), asc(photos.createdAt));
  if (rows.every((row, index) => row.position === index)) {
    return;
  }
  await writePositions(
    database,
    tripId,
    rows.map((row) => row.id),
  );
}
