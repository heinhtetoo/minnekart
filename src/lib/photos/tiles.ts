import { asc, eq } from 'drizzle-orm';

import type { PhotoTile } from '@/components/photos/PhotoGrid';
import { db } from '@/db';
import { photos as photosTable } from '@/db/schema';
import { toSignedPhotoDTO } from '@/lib/photos/dto';
import { signPhotos } from '@/lib/photos/sign';
import { storage } from '@/lib/storage';

export async function loadTripTiles(tripId: string): Promise<PhotoTile[]> {
  const rows = await db()
    .select()
    .from(photosTable)
    .where(eq(photosTable.tripId, tripId))
    .orderBy(asc(photosTable.position));
  const signed = await signPhotos(storage(), rows);
  return signed.map(toSignedPhotoDTO).map((photo) => ({
    id: photo.id,
    thumbUrl: photo.thumbUrl,
    displayUrl: photo.displayUrl,
    width: photo.width,
    height: photo.height,
  }));
}
