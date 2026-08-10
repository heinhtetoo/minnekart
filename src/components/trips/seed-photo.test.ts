import { describe, expect, it, vi } from 'vitest';

import { PlaceResult } from '@/lib/geocode';
import { PhotoExif } from '@/lib/photos/exif';

import {
  SeedAction,
  SeedState,
  initialSeedState,
  seedReducer,
} from './seed-fields';
import {
  MAX_SEED_BYTES,
  SEED_ERRORS,
  SEED_NOTES,
  SeedPhotoDeps,
  readSeedPhoto,
  takeSeedLocation,
} from './seed-photo';

const KYOTO: PlaceResult = {
  placeName: 'Kyoto',
  country: 'Japan',
  lat: 35.01,
  lng: 135.77,
  displayName: 'Kyoto, Japan',
};

const NO_EXIF: PhotoExif = { takenAt: null, lat: null, lng: null };

function fakeFile(size = 1024): File {
  return {
    size,
    name: 'photo.jpg',
    arrayBuffer: async () => new ArrayBuffer(8),
  } as unknown as File;
}

function harness(
  deps: Partial<SeedPhotoDeps> = {},
  start: SeedState = initialSeedState(),
) {
  let state = start;
  let stale = false;
  const actions: SeedAction[] = [];
  const errors: string[] = [];
  const revoked: string[] = [];

  const context = {
    deps: {
      sniffImageFormat: () => 'jpeg' as const,
      createPreviewUrl: async () => 'blob:preview',
      readPhotoExif: async () => NO_EXIF,
      reverseGeocode: async () => KYOTO,
      revokeObjectUrl: (url: string) => revoked.push(url),
      ...deps,
    },
    dispatch: (action: SeedAction) => {
      actions.push(action);
      state = seedReducer(state, action);
    },
    getState: () => state,
    isStale: () => stale,
    onError: (message: string) => errors.push(message),
  };

  return {
    context,
    actions,
    errors,
    revoked,
    state: () => state,
    goStale: () => {
      stale = true;
    },
  };
}

function types(actions: SeedAction[]): string[] {
  return actions.map((action) => action.type);
}

describe('readSeedPhoto — files it refuses', () => {
  it('rejects a file over 50MB before reading its bytes', async () => {
    const file = fakeFile(MAX_SEED_BYTES + 1);
    const read = vi.spyOn(file, 'arrayBuffer');
    const test = harness();

    await readSeedPhoto(file, test.context);

    expect(types(test.actions)).toEqual(['photoRejected']);
    expect(test.errors).toEqual([SEED_ERRORS.tooLarge]);
    expect(read).not.toHaveBeenCalled();
  });

  // The reject path has to clear the whole read, not just the file: an
  // oversize pick landing while an earlier photo is still being read used to
  // leave "Reading the photo…" on screen with nothing left to clear it.
  it('stops the reading message left by the photo it replaced', async () => {
    const reading = seedReducer(initialSeedState(), {
      type: 'photoPicked',
      file: fakeFile(),
    });
    const test = harness({}, reading);
    expect(reading.busy).toBe(true);

    await readSeedPhoto(fakeFile(MAX_SEED_BYTES + 1), test.context);

    expect(test.state().busy).toBe(false);
    expect(test.state().file).toBeNull();
    expect(test.state().preview).toBeNull();
    expect(test.state().note).toBe('');
  });

  it('rejects bytes that are not an image', async () => {
    const test = harness({ sniffImageFormat: () => null });

    await readSeedPhoto(fakeFile(), test.context);

    expect(types(test.actions)).toEqual(['photoPicked', 'photoRejected']);
    expect(test.errors).toContain(SEED_ERRORS.notAPhoto);
    expect(test.state().file).toBeNull();
  });

  it('keeps a photo whose format the browser cannot preview', async () => {
    const test = harness({
      sniffImageFormat: () => 'heic',
      createPreviewUrl: async () => null,
    });

    await readSeedPhoto(fakeFile(), test.context);

    expect(test.state().file).not.toBeNull();
    expect(test.state().preview).toBeNull();
    expect(test.state().note).toBe(SEED_NOTES.nothing);
  });
});

describe('readSeedPhoto — what it reads out of the photo', () => {
  it('fills the date and says so when there is no location', async () => {
    const test = harness({
      readPhotoExif: async () => ({
        takenAt: '2026-04-02T08:30:00Z',
        lat: null,
        lng: null,
      }),
    });

    await readSeedPhoto(fakeFile(), test.context);

    expect(test.state().dateStart).toBe('2026-04-02');
    expect(test.state().note).toBe(SEED_NOTES.dateOnly);
    expect(test.state().busy).toBe(false);
  });

  it('says nothing was readable when there is no date or location', async () => {
    const test = harness();

    await readSeedPhoto(fakeFile(), test.context);

    expect(test.state().note).toBe(SEED_NOTES.nothing);
  });

  it('adopts the location and its place name on an empty form', async () => {
    const test = harness({
      readPhotoExif: async () => ({ takenAt: null, lat: 35.01, lng: 135.77 }),
    });

    await readSeedPhoto(fakeFile(), test.context);

    expect(test.state().coords).toEqual({ lat: 35.01, lng: 135.77 });
    expect(test.state().placeName).toBe('Kyoto');
    expect(test.state().country).toBe('Japan');
    expect(test.state().note).toBe(SEED_NOTES.filled);
    expect(test.state().busy).toBe(false);
  });

  it('keeps the pin and asks for a name when the lookup finds nothing', async () => {
    const test = harness({
      readPhotoExif: async () => ({ takenAt: null, lat: 35.01, lng: 135.77 }),
      reverseGeocode: async () => null,
    });

    await readSeedPhoto(fakeFile(), test.context);

    expect(test.state().coords).toEqual({ lat: 35.01, lng: 135.77 });
    expect(test.state().placeName).toBe('');
    expect(test.state().note).toBe(SEED_NOTES.pinnedNeedsName);
  });

  it('offers the swap instead of moving a pin the user chose', async () => {
    const searched = seedReducer(initialSeedState(), {
      type: 'placePicked',
      place: KYOTO,
    });
    const test = harness(
      { readPhotoExif: async () => ({ takenAt: null, lat: 1, lng: 2 }) },
      searched,
    );

    await readSeedPhoto(fakeFile(), test.context);

    expect(test.state().offer).toEqual({ lat: 1, lng: 2 });
    expect(test.state().coords).toEqual({ lat: 35.01, lng: 135.77 });
    expect(test.state().note).toBe(SEED_NOTES.elsewhere);
    expect(types(test.actions)).not.toContain('photoLocationAdopted');
  });
});

describe('readSeedPhoto — a second pick lands first', () => {
  it('abandons the read and revokes a preview nothing will ever show', async () => {
    const test = harness({
      createPreviewUrl: async () => {
        test.goStale();
        return 'blob:abandoned';
      },
    });

    await readSeedPhoto(fakeFile(), test.context);

    expect(types(test.actions)).toEqual(['photoPicked']);
    expect(test.revoked).toEqual(['blob:abandoned']);
    expect(test.state().preview).toBeNull();
  });

  it('does not write the place of a photo that has been replaced', async () => {
    const test = harness({
      readPhotoExif: async () => ({ takenAt: null, lat: 35.01, lng: 135.77 }),
      reverseGeocode: async () => {
        test.goStale();
        return KYOTO;
      },
    });

    await readSeedPhoto(fakeFile(), test.context);

    expect(test.state().placeName).toBe('');
    expect(types(test.actions)).not.toContain('photoPlaceResolved');
  });
});

describe('takeSeedLocation', () => {
  const offered = seedReducer(
    seedReducer(initialSeedState(), { type: 'placePicked', place: KYOTO }),
    { type: 'photoLocationOffered', coords: { lat: 1, lng: 2 }, note: '' },
  );

  it('takes the photo place whole, over the searched one', async () => {
    const test = harness({}, offered);

    await takeSeedLocation(test.context);

    expect(test.state().coords).toEqual({ lat: 1, lng: 2 });
    expect(test.state().placeName).toBe('Kyoto');
    expect(test.state().offer).toBeNull();
    expect(test.state().note).toBe(SEED_NOTES.filled);
  });

  it('asks the user to check the name when the lookup finds nothing', async () => {
    const test = harness({ reverseGeocode: async () => null }, offered);

    await takeSeedLocation(test.context);

    expect(test.state().coords).toEqual({ lat: 1, lng: 2 });
    expect(test.state().note).toBe(SEED_NOTES.pinnedCheckName);
  });

  it('does nothing when there is no offer', async () => {
    const test = harness();

    await takeSeedLocation(test.context);

    expect(test.actions).toEqual([]);
  });
});
