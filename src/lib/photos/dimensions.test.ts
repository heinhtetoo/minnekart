import { describe, expect, it } from 'vitest';

import { scaledDimensions } from './dimensions';

describe('scaledDimensions', () => {
  it('scales a landscape image down so the long side fits', () => {
    expect(scaledDimensions(4000, 3000, 2560)).toEqual({
      width: 2560,
      height: 1920,
    });
  });

  it('scales a portrait image down so the long side fits', () => {
    expect(scaledDimensions(3000, 4000, 2560)).toEqual({
      width: 1920,
      height: 2560,
    });
  });

  it('never upscales an image already within the limit', () => {
    expect(scaledDimensions(800, 600, 2560)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it('handles a square thumbnail target', () => {
    expect(scaledDimensions(5000, 5000, 400)).toEqual({
      width: 400,
      height: 400,
    });
  });

  it('rounds to whole pixels', () => {
    expect(scaledDimensions(3999, 3000, 2560)).toEqual({
      width: 2560,
      height: 1920,
    });
  });
});
