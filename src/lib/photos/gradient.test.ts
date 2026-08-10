import { describe, expect, it } from 'vitest';

import { coverGradient, coverGradientPair } from './gradient';

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

describe('coverGradientPair', () => {
  it('returns the two hex stops', () => {
    for (const stop of coverGradientPair('kyoto')) {
      expect(stop).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('is deterministic for the same seed', () => {
    expect(coverGradientPair('lisbon')).toEqual(coverGradientPair('lisbon'));
  });

  // The pin draws from the pair and the cards from the string, so a globe pin
  // and its card must not drift onto different colours.
  it('gives the same colours coverGradient embeds', () => {
    const css = coverGradient('marrakech');
    for (const stop of coverGradientPair('marrakech')) {
      expect(css).toContain(stop);
    }
  });
});
