import { PlaceResult } from '@/lib/geocode';
import { PhotoExif } from '@/lib/photos/exif';
import { ImageFormat } from '@/lib/photos/format';

import { SeedAction, SeedState, shouldOfferSwap } from './seed-fields';

export const MAX_SEED_BYTES = 50 * 1024 * 1024;

export const SEED_NOTES = {
  filled: 'Filled in from this photo. Check it before saving.',
  pinnedNeedsName: 'Pinned from this photo. Add a place name and country.',
  pinnedCheckName: 'Pinned from this photo. Check the place name and country.',
  elsewhere: 'This photo was taken somewhere else.',
  dateOnly: 'Date read from this photo. It has no location saved in it.',
  nothing: 'This photo has no location or date saved in it.',
};

export const SEED_ERRORS = {
  tooLarge: 'That file is too large. Pick a photo under 50MB.',
  notAPhoto: 'That file is not a photo. Pick a JPEG, PNG, WebP or HEIC.',
};

export interface SeedPhotoDeps {
  sniffImageFormat: (bytes: ArrayBuffer) => ImageFormat | null;
  createPreviewUrl: (bytes: ArrayBuffer) => Promise<string | null>;
  readPhotoExif: (bytes: ArrayBuffer) => Promise<PhotoExif>;
  reverseGeocode: (lat: number, lng: number) => Promise<PlaceResult | null>;
  revokeObjectUrl: (url: string) => void;
}

export interface SeedPhotoContext {
  deps: SeedPhotoDeps;
  dispatch: (action: SeedAction) => void;
  getState: () => SeedState;
  // True once a later pick has superseded this one. Every await is followed by
  // a check, so an abandoned read touches no state after the one that replaced
  // it has started.
  isStale: () => boolean;
  onError: (message: string) => void;
}

export async function readSeedPhoto(
  file: File,
  { deps, dispatch, getState, isStale, onError }: SeedPhotoContext,
): Promise<void> {
  if (file.size > MAX_SEED_BYTES) {
    dispatch({ type: 'photoRejected' });
    onError(SEED_ERRORS.tooLarge);
    return;
  }

  dispatch({ type: 'photoPicked', file });
  onError('');

  const bytes = await file.arrayBuffer();
  if (isStale()) return;

  if (!deps.sniffImageFormat(bytes)) {
    dispatch({ type: 'photoRejected' });
    onError(SEED_ERRORS.notAPhoto);
    return;
  }

  const preview = await deps.createPreviewUrl(bytes);
  if (isStale()) {
    // Never reached state, so the cleanup effect will never see it.
    if (preview) deps.revokeObjectUrl(preview);
    return;
  }
  dispatch({ type: 'photoPreviewed', preview });

  const exif = await deps.readPhotoExif(bytes);
  if (isStale()) return;

  if (exif.takenAt) {
    dispatch({ type: 'photoDateRead', date: exif.takenAt.slice(0, 10) });
  }

  if (exif.lat === null || exif.lng === null) {
    dispatch({
      type: 'photoHasNoLocation',
      note: exif.takenAt ? SEED_NOTES.dateOnly : SEED_NOTES.nothing,
    });
    return;
  }

  const coords = { lat: exif.lat, lng: exif.lng };
  // Safe to read before the date dispatch has landed: the swap decision turns
  // only on the pin and who owns it, which no earlier step in this read touched.
  if (shouldOfferSwap(getState())) {
    dispatch({
      type: 'photoLocationOffered',
      coords,
      note: SEED_NOTES.elsewhere,
    });
    return;
  }

  dispatch({ type: 'photoLocationAdopted', coords });

  const place = await deps.reverseGeocode(coords.lat, coords.lng);
  if (isStale()) return;

  if (!place) {
    dispatch({
      type: 'photoPlaceUnresolved',
      note: SEED_NOTES.pinnedNeedsName,
    });
    return;
  }
  dispatch({ type: 'photoPlaceResolved', place, note: SEED_NOTES.filled });
}

// An explicit swap takes the photo's place whole, overwriting the searched
// one. Moving the pin alone would leave the old name beside new coordinates,
// which is the mismatch this is meant to prevent.
export async function takeSeedLocation({
  deps,
  dispatch,
  getState,
  isStale,
}: Omit<SeedPhotoContext, 'onError'>): Promise<void> {
  const offer = getState().offer;
  if (!offer) return;

  dispatch({ type: 'swapTookLocation', coords: offer });

  const place = await deps.reverseGeocode(offer.lat, offer.lng);
  if (isStale()) return;

  if (!place) {
    dispatch({
      type: 'swapPlaceUnresolved',
      note: SEED_NOTES.pinnedCheckName,
    });
    return;
  }
  dispatch({ type: 'swapTookPlace', place, note: SEED_NOTES.filled });
}
