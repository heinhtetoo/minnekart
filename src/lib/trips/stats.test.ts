import { describe, expect, it } from 'vitest';

import { computeStats } from './stats';

const trips = [
  { country: 'Japan', placeName: 'Kyoto', dateStart: '2023-04-02', dateEnd: '2023-04-11' },
  { country: 'Japan', placeName: 'Tokyo', dateStart: '2023-11-01', dateEnd: null },
  { country: 'Norway', placeName: 'Reine', dateStart: '2022-02-14', dateEnd: '2022-02-20' },
];

describe('computeStats', () => {
  it('counts distinct countries', () => {
    expect(computeStats(trips, 0).countries).toBe(2);
  });

  it('counts distinct cities by place name', () => {
    expect(computeStats(trips, 0).cities).toBe(3);
  });

  it('counts distinct years across each trip date range', () => {
    expect(computeStats(trips, 0).years).toBe(2);
  });

  it('spans every year a trip range crosses', () => {
    const span = [
      { country: 'Chile', placeName: 'Santiago', dateStart: '2019-12-28', dateEnd: '2020-01-05' },
    ];
    expect(computeStats(span, 0).years).toBe(2);
  });

  it('passes the photo count through', () => {
    expect(computeStats(trips, 42).photos).toBe(42);
  });

  it('returns zeros for no trips', () => {
    expect(computeStats([], 0)).toEqual({
      countries: 0,
      cities: 0,
      photos: 0,
      years: 0,
    });
  });
});
