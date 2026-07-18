import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ObjectStorage } from '@/lib/storage/types';

import { cachedPresignGet, resetPresignCache } from './sign';

function countingStorage() {
  let signs = 0;
  const presignGet = vi.fn(
    async (key: string) => `https://signed/${key}?v=${++signs}`,
  );
  return { presignGet, storage: { presignGet } as unknown as ObjectStorage };
}

beforeEach(() => {
  vi.useFakeTimers();
  resetPresignCache();
});

afterEach(() => {
  vi.useRealTimers();
  resetPresignCache();
});

describe('cachedPresignGet', () => {
  it('reuses the signed url for the same key within the window', async () => {
    const { presignGet, storage } = countingStorage();

    const first = await cachedPresignGet(storage, 'a/thumb.webp');
    const second = await cachedPresignGet(storage, 'a/thumb.webp');

    expect(second).toBe(first);
    expect(presignGet).toHaveBeenCalledTimes(1);
  });

  it('re-signs once the remaining validity drops below the window', async () => {
    const { presignGet, storage } = countingStorage();

    const first = await cachedPresignGet(storage, 'a/thumb.webp');
    vi.advanceTimersByTime(31 * 60 * 1000);
    const second = await cachedPresignGet(storage, 'a/thumb.webp');

    expect(second).not.toBe(first);
    expect(presignGet).toHaveBeenCalledTimes(2);
  });

  it('signs distinct keys independently', async () => {
    const { presignGet, storage } = countingStorage();

    const first = await cachedPresignGet(storage, 'a/thumb.webp');
    const second = await cachedPresignGet(storage, 'b/thumb.webp');

    expect(second).not.toBe(first);
    expect(presignGet).toHaveBeenCalledTimes(2);
  });
});
