export const PHOTO_CONTENT_TYPES = ['image/webp', 'image/jpeg'] as const;

export type PhotoContentType = (typeof PHOTO_CONTENT_TYPES)[number];

export function isPhotoContentType(value: string): value is PhotoContentType {
  return (PHOTO_CONTENT_TYPES as readonly string[]).includes(value);
}

export function extensionFor(contentType: PhotoContentType): string {
  return contentType === 'image/jpeg' ? 'jpg' : 'webp';
}
