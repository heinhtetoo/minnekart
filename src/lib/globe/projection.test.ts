import { describe, expect, it } from 'vitest';

import { isPinVisible, Rotation } from './projection';

const rotation: Rotation = [0, -25, 0];

describe('isPinVisible', () => {
  it('sees a point at the centre of the facing hemisphere', () => {
    expect(isPinVisible(0, 25, rotation)).toBe(true);
  });

  it('hides the point on the far side of the globe', () => {
    expect(isPinVisible(180, -25, rotation)).toBe(false);
  });

  it('hides a point just past the limb', () => {
    expect(isPinVisible(120, 25, rotation)).toBe(false);
  });

  it('follows the rotation as the globe spins', () => {
    expect(isPinVisible(180, -25, [180, -25, 0])).toBe(true);
  });
});
