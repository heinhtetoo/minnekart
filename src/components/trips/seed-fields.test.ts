import { describe, expect, it } from 'vitest';

import { PlaceResult } from '@/lib/geocode';

import {
  SeedAction,
  SeedState,
  initialSeedState,
  seedReducer,
  shouldOfferSwap,
} from './seed-fields';

function place(overrides: Partial<PlaceResult> = {}): PlaceResult {
  return {
    placeName: 'Kyoto',
    country: 'Japan',
    lat: 35.01,
    lng: 135.77,
    displayName: 'Kyoto, Japan',
    ...overrides,
  };
}

function apply(state: SeedState, ...actions: SeedAction[]): SeedState {
  return actions.reduce(seedReducer, state);
}

const empty = initialSeedState();

describe('seedReducer — what the photo owns', () => {
  it('fills an empty field the photo does not own yet', () => {
    const next = apply(empty, { type: 'photoDateRead', date: '2026-04-02' });
    expect(next.dateStart).toBe('2026-04-02');
    expect(next.owned.has('dateStart')).toBe(true);
  });

  it('leaves a hand-typed field alone', () => {
    const typed = apply(empty, {
      type: 'userTyped',
      field: 'dateStart',
      value: '2026-01-01',
    });
    const next = apply(typed, { type: 'photoDateRead', date: '2026-04-02' });
    expect(next.dateStart).toBe('2026-01-01');
    expect(next.owned.has('dateStart')).toBe(false);
  });

  it('replaces a field an earlier photo filled', () => {
    const next = apply(
      empty,
      { type: 'photoDateRead', date: '2026-04-02' },
      { type: 'photoDateRead', date: '2026-07-19' },
    );
    expect(next.dateStart).toBe('2026-07-19');
  });

  it('releases a field once the user types over the photo value', () => {
    const next = apply(
      empty,
      { type: 'photoDateRead', date: '2026-04-02' },
      { type: 'userTyped', field: 'dateStart', value: '2026-01-01' },
      { type: 'photoDateRead', date: '2026-07-19' },
    );
    expect(next.dateStart).toBe('2026-01-01');
  });

  it('releases place, country and pin when a search result is chosen', () => {
    const seeded = apply(empty, {
      type: 'photoLocationAdopted',
      coords: { lat: 1, lng: 2 },
    });
    const next = apply(seeded, { type: 'placePicked', place: place() });
    expect(next.placeName).toBe('Kyoto');
    expect(next.country).toBe('Japan');
    expect(next.coords).toEqual({ lat: 35.01, lng: 135.77 });
    expect(next.owned.size).toBe(0);
  });
});

describe('seedReducer — a photo with no location', () => {
  it('clears the place and pin the previous photo left behind', () => {
    const seeded = apply(
      empty,
      { type: 'photoLocationAdopted', coords: { lat: 1, lng: 2 } },
      { type: 'photoPlaceResolved', place: place(), note: 'filled' },
    );
    const next = apply(seeded, {
      type: 'photoHasNoLocation',
      note: 'no location',
    });
    expect(next.placeName).toBe('');
    expect(next.country).toBe('');
    expect(next.coords).toBeNull();
    expect(next.owned.size).toBe(0);
    expect(next.note).toBe('no location');
  });

  it('keeps a place the user searched for', () => {
    const searched = apply(empty, { type: 'placePicked', place: place() });
    const next = apply(searched, {
      type: 'photoHasNoLocation',
      note: 'no location',
    });
    expect(next.placeName).toBe('Kyoto');
    expect(next.coords).toEqual({ lat: 35.01, lng: 135.77 });
  });
});

describe('shouldOfferSwap', () => {
  it('offers when the pin came from the user', () => {
    expect(
      shouldOfferSwap(apply(empty, { type: 'placePicked', place: place() })),
    ).toBe(true);
  });

  it('does not offer when the pin came from a photo', () => {
    const seeded = apply(empty, {
      type: 'photoLocationAdopted',
      coords: { lat: 1, lng: 2 },
    });
    expect(shouldOfferSwap(seeded)).toBe(false);
  });

  it('does not offer when there is no pin', () => {
    expect(shouldOfferSwap(empty)).toBe(false);
  });
});

describe('seedReducer — adopting a photo location', () => {
  it('drops the previous photo name so a failed lookup leaves none behind', () => {
    const seeded = apply(
      empty,
      { type: 'photoLocationAdopted', coords: { lat: 1, lng: 2 } },
      { type: 'photoPlaceResolved', place: place(), note: 'filled' },
    );
    const next = apply(seeded, {
      type: 'photoLocationAdopted',
      coords: { lat: 3, lng: 4 },
    });
    expect(next.placeName).toBe('');
    expect(next.country).toBe('');
    expect(next.coords).toEqual({ lat: 3, lng: 4 });
  });

  it('resets the place search, which describes somewhere else now', () => {
    const next = apply(empty, {
      type: 'photoLocationAdopted',
      coords: { lat: 3, lng: 4 },
    });
    expect(next.searchReset).toBe(empty.searchReset + 1);
  });
});

// The distinction that is easiest to lose in a refactor: a photo read defers to
// anything typed by hand, but pressing "Use the photo's place" does not.
describe('seedReducer — the explicit swap overrides, a photo read defers', () => {
  const typed = apply(
    empty,
    { type: 'userTyped', field: 'placeName', value: 'Nan Madol' },
    { type: 'userTyped', field: 'country', value: 'Micronesia' },
  );

  it('does not overwrite a typed name when a photo resolves a place', () => {
    const next = apply(typed, {
      type: 'photoPlaceResolved',
      place: place(),
      note: 'filled',
    });
    expect(next.placeName).toBe('Nan Madol');
    expect(next.country).toBe('Micronesia');
  });

  it('overwrites a typed name when the user takes the photo place', () => {
    const next = apply(typed, {
      type: 'swapTookPlace',
      place: place(),
      note: 'filled',
    });
    expect(next.placeName).toBe('Kyoto');
    expect(next.country).toBe('Japan');
    expect(next.owned.has('placeName')).toBe(true);
  });

  it('takes the pin and clears the search when the swap is accepted', () => {
    const searched = apply(empty, { type: 'placePicked', place: place() });
    const next = apply(searched, {
      type: 'swapTookLocation',
      coords: { lat: 3, lng: 4 },
    });
    expect(next.coords).toEqual({ lat: 3, lng: 4 });
    expect(next.owned.has('coords')).toBe(true);
    expect(next.offer).toBeNull();
    expect(next.searchReset).toBe(searched.searchReset + 1);
  });
});

describe('seedReducer — removing the photo', () => {
  it('clears what the photo filled and keeps what was typed', () => {
    const mixed = apply(
      empty,
      { type: 'userTyped', field: 'placeName', value: 'Nan Madol' },
      { type: 'photoDateRead', date: '2026-04-02' },
      { type: 'photoLocationAdopted', coords: { lat: 1, lng: 2 } },
    );
    const next = apply(mixed, { type: 'photoRemoved' });
    expect(next.placeName).toBe('Nan Madol');
    expect(next.dateStart).toBe('');
    expect(next.coords).toBeNull();
    expect(next.owned.size).toBe(0);
    expect(next.file).toBeNull();
    expect(next.preview).toBeNull();
    expect(next.offer).toBeNull();
  });

  it('leaves an edited trip its own place when no photo owned it', () => {
    const editing = initialSeedState({
      id: 't1',
      placeName: 'Kyoto',
      country: 'Japan',
      lat: 35.01,
      lng: 135.77,
      dateStart: '2026-04-02',
      dateEnd: null,
      highlight: null,
      story: null,
    });
    const next = apply(editing, { type: 'photoRemoved' });
    expect(next.placeName).toBe('Kyoto');
    expect(next.dateStart).toBe('2026-04-02');
    expect(next.coords).toEqual({ lat: 35.01, lng: 135.77 });
  });
});
