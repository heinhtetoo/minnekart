import { beforeEach, describe, expect, it } from 'vitest';

import { MemoryStorage } from './memory';

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe('MemoryStorage', () => {
  it('registers a key on presignPut and reports it via stat', async () => {
    const url = await storage.presignPut('photos/a/b/c.webp', 'image/webp');

    expect(url).toContain('photos/a/b/c.webp');
    const stat = await storage.stat('photos/a/b/c.webp');
    expect(stat).toMatchObject({ contentType: 'image/webp' });
    expect(stat?.size).toBeGreaterThan(0);
  });

  it('returns null stat for an unknown key', async () => {
    expect(await storage.stat('missing')).toBeNull();
  });

  it('signs a get url for the key', async () => {
    await storage.presignPut('photos/a/b/c.webp', 'image/webp');

    const url = await storage.presignGet('photos/a/b/c.webp', 3600);

    expect(url).toContain('photos/a/b/c.webp');
  });

  it('deletes an object so stat becomes null', async () => {
    await storage.presignPut('photos/a/b/c.webp', 'image/webp');

    await storage.delete('photos/a/b/c.webp');

    expect(await storage.stat('photos/a/b/c.webp')).toBeNull();
  });

  it('lets a test seed an object with a specific size', async () => {
    storage.seed('photos/a/b/big.webp', {
      size: 20_000_000,
      contentType: 'image/webp',
    });

    expect((await storage.stat('photos/a/b/big.webp'))?.size).toBe(20_000_000);
  });
});
