import { photos } from '@/db/schema';
import { ObjectStorage } from '@/lib/storage/types';

type Photo = typeof photos.$inferSelect;

export async function deletePhotoObjects(
  storage: ObjectStorage,
  list: Photo[],
): Promise<void> {
  const keys = list.flatMap((photo) =>
    [photo.displayKey, photo.thumbKey, photo.originalKey].filter(
      (key): key is string => key !== null,
    ),
  );
  await Promise.all(keys.map((key) => storage.delete(key)));
}
