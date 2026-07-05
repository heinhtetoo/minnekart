import { describe, expect, it } from 'vitest';

import { tripDateError } from './dates';

describe('tripDateError', () => {
  it('requires a start date', () => {
    expect(tripDateError('', null)).toBe('Add a start date.');
  });

  it('accepts a start date with no end date', () => {
    expect(tripDateError('2024-05-01', null)).toBeNull();
    expect(tripDateError('2024-05-01', '')).toBeNull();
  });

  it('accepts an end date on or after the start date', () => {
    expect(tripDateError('2024-05-01', '2024-05-01')).toBeNull();
    expect(tripDateError('2024-05-01', '2024-05-09')).toBeNull();
  });

  it('rejects an end date before the start date', () => {
    expect(tripDateError('2024-05-09', '2024-05-01')).toBe(
      'End date can’t be before the start date.',
    );
  });
});
