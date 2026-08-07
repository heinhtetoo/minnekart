import { describe, expect, it } from 'vitest';

import { SpinConditions, shouldAutoSpin } from './spin';

function conditions(overrides: Partial<SpinConditions> = {}): SpinConditions {
  return {
    autoSpin: true,
    spinOnTouch: true,
    coarsePointer: false,
    reduceMotion: false,
    ...overrides,
  };
}

describe('shouldAutoSpin', () => {
  it('spins on a desktop pointer', () => {
    expect(shouldAutoSpin(conditions())).toBe(true);
  });

  // The bug this task fixes: the spin used to be off on every touch device,
  // not just the one page that needed it off.
  it('spins on touch, which is what task 27 restores', () => {
    expect(shouldAutoSpin(conditions({ coarsePointer: true }))).toBe(true);
  });

  it('does not spin on touch where the page opted out', () => {
    expect(
      shouldAutoSpin(conditions({ coarsePointer: true, spinOnTouch: false })),
    ).toBe(false);
  });

  // The opt-out is about tap dispatch on touch, so it must not cost the
  // logged-out home its desktop spin.
  it('still spins on desktop where the page opted out of touch spin', () => {
    expect(shouldAutoSpin(conditions({ spinOnTouch: false }))).toBe(true);
  });

  it('never spins when the caller turned it off', () => {
    expect(shouldAutoSpin(conditions({ autoSpin: false }))).toBe(false);
  });
});

describe('shouldAutoSpin — reduced motion wins over everything', () => {
  it('does not spin on desktop', () => {
    expect(shouldAutoSpin(conditions({ reduceMotion: true }))).toBe(false);
  });

  it('does not spin on touch', () => {
    expect(
      shouldAutoSpin(conditions({ reduceMotion: true, coarsePointer: true })),
    ).toBe(false);
  });
});
