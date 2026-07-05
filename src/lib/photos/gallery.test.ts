import { describe, expect, it } from 'vitest';

import { distinctCountries } from './gallery';

describe('distinctCountries', () => {
  it('returns unique countries sorted alphabetically', () => {
    const items = [
      { country: 'Japan' },
      { country: 'Norway' },
      { country: 'Japan' },
      { country: 'Peru' },
    ];
    expect(distinctCountries(items)).toEqual(['Japan', 'Norway', 'Peru']);
  });

  it('ignores blank countries', () => {
    const items = [{ country: 'Japan' }, { country: '' }, { country: '  ' }];
    expect(distinctCountries(items)).toEqual(['Japan']);
  });

  it('returns an empty list for no items', () => {
    expect(distinctCountries([])).toEqual([]);
  });
});
