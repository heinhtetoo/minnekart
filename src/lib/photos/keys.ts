import { randomUUID } from 'node:crypto';

import { extensionFor, PhotoContentType } from './content-type';

export function photoPrefix(userId: string, tripId: string): string {
  return `photos/${userId}/${tripId}/`;
}

export function newPhotoKeys(
  userId: string,
  tripId: string,
  contentType: PhotoContentType = 'image/webp',
) {
  const stem = randomUUID();
  const prefix = photoPrefix(userId, tripId);
  const extension = extensionFor(contentType);
  return {
    displayKey: `${prefix}${stem}.${extension}`,
    thumbKey: `${prefix}${stem}_thumb.${extension}`,
  };
}

export function isKeyUnderPrefix(key: string, prefix: string): boolean {
  return key.startsWith(prefix) && !key.slice(prefix.length).includes('/');
}
