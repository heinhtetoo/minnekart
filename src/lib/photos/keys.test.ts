import { describe, expect, it } from 'vitest';

import { isKeyUnderPrefix, newPhotoKeys, photoPrefix } from './keys';

describe('newPhotoKeys', () => {
  it('defaults to webp extensions', () => {
    const keys = newPhotoKeys('user-1', 'trip-1');
    expect(keys.displayKey).toMatch(/\.webp$/);
    expect(keys.thumbKey).toMatch(/_thumb\.webp$/);
  });

  it('uses jpg extensions for image/jpeg uploads', () => {
    const keys = newPhotoKeys('user-1', 'trip-1', 'image/jpeg');
    expect(keys.displayKey).toMatch(/\.jpg$/);
    expect(keys.thumbKey).toMatch(/_thumb\.jpg$/);
  });

  it('uses webp extensions for image/webp uploads', () => {
    const keys = newPhotoKeys('user-1', 'trip-1', 'image/webp');
    expect(keys.displayKey).toMatch(/\.webp$/);
    expect(keys.thumbKey).toMatch(/_thumb\.webp$/);
  });

  it('keeps both keys under the caller prefix with a shared stem', () => {
    const keys = newPhotoKeys('user-1', 'trip-1', 'image/jpeg');
    const prefix = photoPrefix('user-1', 'trip-1');
    expect(isKeyUnderPrefix(keys.displayKey, prefix)).toBe(true);
    expect(isKeyUnderPrefix(keys.thumbKey, prefix)).toBe(true);
    const stem = keys.displayKey.slice(prefix.length, -'.jpg'.length);
    expect(keys.thumbKey).toBe(`${prefix}${stem}_thumb.jpg`);
  });
});
