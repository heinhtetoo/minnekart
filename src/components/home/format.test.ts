import { describe, expect, it } from 'vitest';

import { formatTripDates } from './format';

describe('formatTripDates', () => {
  it('formats a single date as month and year', () => {
    expect(formatTripDates('2023-04-02', null)).toBe('Apr 2023');
  });

  it('collapses a range within the same month', () => {
    expect(formatTripDates('2023-04-02', '2023-04-10')).toBe('Apr 2023');
  });

  it('formats a range across months', () => {
    expect(formatTripDates('2023-04-28', '2023-05-03')).toBe(
      'Apr 2023 – May 2023',
    );
  });

  it('formats a range across years', () => {
    expect(formatTripDates('2023-12-28', '2024-01-03')).toBe(
      'Dec 2023 – Jan 2024',
    );
  });
});
