import { randomUUID } from 'node:crypto';

export function photoPrefix(userId: string, tripId: string): string {
  return `photos/${userId}/${tripId}/`;
}

export function newPhotoKeys(userId: string, tripId: string) {
  const stem = randomUUID();
  const prefix = photoPrefix(userId, tripId);
  return {
    displayKey: `${prefix}${stem}.webp`,
    thumbKey: `${prefix}${stem}_thumb.webp`,
  };
}

export function isKeyUnderPrefix(key: string, prefix: string): boolean {
  return key.startsWith(prefix) && !key.slice(prefix.length).includes('/');
}
