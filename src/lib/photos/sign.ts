import { photos } from '@/db/schema';
import { ObjectStorage } from '@/lib/storage/types';

const READ_EXPIRY_SECONDS = 60 * 60;
const REUSE_WINDOW_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;

const urlCache = new Map<string, { url: string; expiresAt: number }>();

type Photo = typeof photos.$inferSelect;

export async function cachedPresignGet(
  storage: ObjectStorage,
  key: string,
): Promise<string> {
  const hit = urlCache.get(key);
  if (hit && hit.expiresAt - Date.now() > REUSE_WINDOW_MS) {
    return hit.url;
  }
  const url = await storage.presignGet(key, READ_EXPIRY_SECONDS);
  if (urlCache.size >= CACHE_MAX_ENTRIES) {
    urlCache.clear();
  }
  urlCache.set(key, {
    url,
    expiresAt: Date.now() + READ_EXPIRY_SECONDS * 1000,
  });
  return url;
}

export function resetPresignCache(): void {
  urlCache.clear();
}

export async function signPhoto(storage: ObjectStorage, photo: Photo) {
  const [displayUrl, thumbUrl] = await Promise.all([
    cachedPresignGet(storage, photo.displayKey),
    cachedPresignGet(storage, photo.thumbKey),
  ]);
  return { ...photo, displayUrl, thumbUrl };
}

export function signPhotos(storage: ObjectStorage, list: Photo[]) {
  return Promise.all(list.map((photo) => signPhoto(storage, photo)));
}
