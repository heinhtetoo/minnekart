import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { photos as photosTable, trips as tripsTable } from '@/db/schema';
import { SignedPhoto, toSignedPhotoDTO } from '@/lib/photos/dto';
import { distinctCountries } from '@/lib/photos/gallery';
import { signPhoto } from '@/lib/photos/sign';
import { storage } from '@/lib/storage';

export const PHOTO_PAGE_SIZE = 25;

export interface LibraryPhoto extends SignedPhoto {
  country: string;
  placeName: string;
}

export interface LibraryPage {
  photos: LibraryPhoto[];
  hasMore: boolean;
}

interface LibraryPageOptions {
  country?: string | null;
  offset?: number;
}

export async function userLibraryPage(
  userId: string,
  { country = null, offset = 0 }: LibraryPageOptions = {},
): Promise<LibraryPage> {
  const owned = eq(photosTable.userId, userId);
  // One extra row answers "is there another page?" without a count query.
  const rows = await db()
    .select({
      photo: photosTable,
      country: tripsTable.country,
      placeName: tripsTable.placeName,
    })
    .from(photosTable)
    .innerJoin(tripsTable, eq(photosTable.tripId, tripsTable.id))
    .where(country ? and(owned, eq(tripsTable.country, country)) : owned)
    .orderBy(desc(photosTable.createdAt))
    .limit(PHOTO_PAGE_SIZE + 1)
    .offset(offset);

  const hasMore = rows.length > PHOTO_PAGE_SIZE;
  const store = storage();
  const photos = await Promise.all(
    rows.slice(0, PHOTO_PAGE_SIZE).map(async (row) => ({
      ...toSignedPhotoDTO(await signPhoto(store, row.photo)),
      country: row.country,
      placeName: row.placeName,
    })),
  );
  return { photos, hasMore };
}

export async function userPhotoCountries(userId: string): Promise<string[]> {
  const rows = await db()
    .selectDistinct({ country: tripsTable.country })
    .from(photosTable)
    .innerJoin(tripsTable, eq(photosTable.tripId, tripsTable.id))
    .where(eq(photosTable.userId, userId));
  return distinctCountries(rows);
}

// Scoped by owner as well as id, so a stale or tampered reference can never
// render another user's photo.
export async function signedPhotoFor(
  userId: string,
  photoId: string,
): Promise<SignedPhoto | null> {
  const [row] = await db()
    .select()
    .from(photosTable)
    .where(and(eq(photosTable.id, photoId), eq(photosTable.userId, userId)));
  if (!row) {
    return null;
  }
  return toSignedPhotoDTO(await signPhoto(storage(), row));
}
