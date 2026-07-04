import { photos } from '@/db/schema';
import { ObjectStorage } from '@/lib/storage/types';

const READ_EXPIRY_SECONDS = 60 * 60;

type Photo = typeof photos.$inferSelect;

export async function signPhoto(storage: ObjectStorage, photo: Photo) {
  const [displayUrl, thumbUrl] = await Promise.all([
    storage.presignGet(photo.displayKey, READ_EXPIRY_SECONDS),
    storage.presignGet(photo.thumbKey, READ_EXPIRY_SECONDS),
  ]);
  return { ...photo, displayUrl, thumbUrl };
}

export function signPhotos(storage: ObjectStorage, list: Photo[]) {
  return Promise.all(list.map((photo) => signPhoto(storage, photo)));
}
