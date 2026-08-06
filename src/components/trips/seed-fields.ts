import { PlaceResult } from '@/lib/geocode';
import { TripDTO } from '@/lib/trips/dto';

export interface Coords {
  lat: number;
  lng: number;
}

// Fields the seed photo filled and the user has not touched since. Only
// these get replaced by the next photo or cleared when the photo is removed,
// so nothing typed by hand is ever discarded.
export type SeedField = 'placeName' | 'country' | 'dateStart' | 'coords';

export interface SeedState {
  placeName: string;
  country: string;
  dateStart: string;
  coords: Coords | null;
  owned: ReadonlySet<SeedField>;
  file: File | null;
  preview: string | null;
  note: string;
  busy: boolean;
  offer: Coords | null;
  // Bumped to remount the place search, which otherwise keeps describing
  // wherever it last searched for.
  searchReset: number;
}

export type SeedAction =
  | {
      type: 'userTyped';
      field: 'placeName' | 'country' | 'dateStart';
      value: string;
    }
  | { type: 'placePicked'; place: PlaceResult }
  | { type: 'photoPicked'; file: File }
  | { type: 'photoRejected' }
  | { type: 'photoPreviewed'; preview: string | null }
  | { type: 'photoDateRead'; date: string }
  | { type: 'photoHasNoLocation'; note: string }
  | { type: 'photoLocationOffered'; coords: Coords; note: string }
  | { type: 'photoLocationAdopted'; coords: Coords }
  | { type: 'photoPlaceResolved'; place: PlaceResult; note: string }
  | { type: 'photoPlaceUnresolved'; note: string }
  | { type: 'swapTookLocation'; coords: Coords }
  | { type: 'swapTookPlace'; place: PlaceResult; note: string }
  | { type: 'swapPlaceUnresolved'; note: string }
  | { type: 'photoRemoved' };

export function initialSeedState(initial?: TripDTO): SeedState {
  return {
    placeName: initial?.placeName ?? '',
    country: initial?.country ?? '',
    dateStart: initial?.dateStart ?? '',
    coords: initial ? { lat: initial.lat, lng: initial.lng } : null,
    owned: new Set(),
    file: null,
    preview: null,
    note: '',
    busy: false,
    offer: null,
    searchReset: 0,
  };
}

// A pin the photo did not put there was chosen by the user, so a photo taken
// somewhere else asks before moving it.
export function shouldOfferSwap(state: SeedState): boolean {
  return !state.owned.has('coords') && state.coords !== null;
}

function withOwned(
  state: SeedState,
  change: (owned: Set<SeedField>) => void,
): ReadonlySet<SeedField> {
  const owned = new Set(state.owned);
  change(owned);
  return owned;
}

function release(
  state: SeedState,
  ...fields: SeedField[]
): ReadonlySet<SeedField> {
  return withOwned(state, (owned) => {
    for (const field of fields) owned.delete(field);
  });
}

// A photo fills a field only when it already owns it or the field is empty.
// Anything typed by hand is a label the user chose, not a stale reading.
function fillFromPhoto(
  state: SeedState,
  field: 'placeName' | 'country' | 'dateStart',
  value: string,
): Partial<SeedState> {
  if (!state.owned.has(field) && state[field] !== '') {
    return {};
  }
  return {
    [field]: value,
    owned: withOwned(state, (owned) => owned.add(field)),
  };
}

// Place name, country and pin describe one place, so whenever the photo's
// location changes they move together. Anything typed by hand is left alone.
function clearOwnedPlace(state: SeedState): Partial<SeedState> {
  const owned = new Set(state.owned);
  const next: Partial<SeedState> = {};
  if (owned.has('placeName')) {
    next.placeName = '';
    owned.delete('placeName');
  }
  if (owned.has('country')) {
    next.country = '';
    owned.delete('country');
  }
  return { ...next, owned };
}

function clearOwnedCoords(state: SeedState): Partial<SeedState> {
  if (!state.owned.has('coords')) return {};
  return { coords: null, owned: release(state, 'coords') };
}

export function seedReducer(state: SeedState, action: SeedAction): SeedState {
  switch (action.type) {
    case 'userTyped':
      return {
        ...state,
        [action.field]: action.value,
        owned: release(state, action.field),
      };

    case 'placePicked':
      return {
        ...state,
        placeName: action.place.placeName,
        country: action.place.country,
        coords: { lat: action.place.lat, lng: action.place.lng },
        owned: release(state, 'placeName', 'country', 'coords'),
        offer: null,
      };

    case 'photoPicked':
      return { ...state, file: action.file, busy: true, note: '' };

    case 'photoRejected':
      return { ...state, file: null, preview: null, busy: false, note: '' };

    case 'photoPreviewed':
      return { ...state, preview: action.preview };

    case 'photoDateRead':
      return { ...state, ...fillFromPhoto(state, 'dateStart', action.date) };

    // A photo with no location must not leave the last photo's place behind.
    case 'photoHasNoLocation': {
      const cleared = { ...state, ...clearOwnedPlace(state) };
      return {
        ...cleared,
        ...clearOwnedCoords(cleared),
        busy: false,
        note: action.note,
      };
    }

    case 'photoLocationOffered':
      return {
        ...state,
        busy: false,
        offer: action.coords,
        note: action.note,
      };

    // Drop the previous photo's name before adopting this one's, so a failed
    // lookup cannot leave it sitting beside the new pin.
    case 'photoLocationAdopted': {
      const cleared = { ...state, ...clearOwnedPlace(state) };
      return {
        ...cleared,
        coords: action.coords,
        owned: withOwned(cleared, (owned) => owned.add('coords')),
        searchReset: state.searchReset + 1,
      };
    }

    case 'photoPlaceResolved': {
      const withName = {
        ...state,
        ...fillFromPhoto(state, 'placeName', action.place.placeName),
      };
      return {
        ...withName,
        ...fillFromPhoto(withName, 'country', action.place.country),
        busy: false,
        note: action.note,
      };
    }

    case 'photoPlaceUnresolved':
      return { ...state, busy: false, note: action.note };

    // An explicit swap takes the photo's place whole, overwriting the searched
    // one. Moving the pin alone would leave the old name beside new
    // coordinates, which is the mismatch this is meant to prevent.
    case 'swapTookLocation':
      return {
        ...state,
        coords: action.coords,
        owned: withOwned(state, (owned) => owned.add('coords')),
        offer: null,
        busy: true,
        searchReset: state.searchReset + 1,
      };

    case 'swapTookPlace':
      return {
        ...state,
        placeName: action.place.placeName,
        country: action.place.country,
        owned: withOwned(state, (owned) => {
          owned.add('placeName');
          owned.add('country');
        }),
        busy: false,
        note: action.note,
      };

    case 'swapPlaceUnresolved':
      return { ...state, busy: false, note: action.note };

    case 'photoRemoved':
      return {
        ...state,
        placeName: state.owned.has('placeName') ? '' : state.placeName,
        country: state.owned.has('country') ? '' : state.country,
        dateStart: state.owned.has('dateStart') ? '' : state.dateStart,
        coords: state.owned.has('coords') ? null : state.coords,
        owned: new Set(),
        file: null,
        preview: null,
        note: '',
        busy: false,
        offer: null,
      };
  }
}
