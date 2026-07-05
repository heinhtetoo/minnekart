import { describe, expect, it } from 'vitest';

import { coverGradient } from './gradient';

describe('coverGradient', () => {
  it('produces a CSS linear-gradient string', () => {
    expect(coverGradient('kyoto')).toMatch(
      /^linear-gradient\(\d+deg, #[0-9a-f]{6}, #[0-9a-f]{6}\)$/,
    );
  });

  it('is deterministic for the same seed', () => {
    expect(coverGradient('lisbon')).toBe(coverGradient('lisbon'));
  });

  it('varies the angle by index', () => {
    expect(coverGradient('lisbon', 0)).not.toBe(coverGradient('lisbon', 1));
  });
});
