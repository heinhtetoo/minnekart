'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useReducer, useRef, useState } from 'react';

import { uploadPhoto } from '@/components/photos/upload';
import { readPhotoExif } from '@/lib/photos/exif';
import { sniffImageFormat } from '@/lib/photos/format';
import { createPreviewUrl } from '@/lib/photos/preview';
import { tripDateError } from '@/lib/trips/dates';
import { TripDTO } from '@/lib/trips/dto';

import Field from './Field';
import PhotoSeed from './PhotoSeed';
import PlaceFields from './PlaceFields';
import styles from './TripForm.module.css';
import { geocodeApi, tripsApi } from './api';
import { initialSeedState, seedReducer } from './seed-fields';
import { SeedPhotoDeps, readSeedPhoto, takeSeedLocation } from './seed-photo';

const SAVE_ERRORS: Record<string, string> = {
  invalid_request: 'Please check the details and try again.',
  not_found: 'This memory could not be found.',
  rate_limited: 'Too many requests. Please wait a moment.',
  trip_limit_reached:
    "You've used your 15 free memories. Upgrade in Settings for unlimited.",
};

const seedDeps: SeedPhotoDeps = {
  sniffImageFormat,
  createPreviewUrl,
  readPhotoExif,
  reverseGeocode: async (lat, lng) => {
    const result = await geocodeApi.reverse(lat, lng);
    return result.data?.place ?? null;
  },
  revokeObjectUrl: (url) => URL.revokeObjectURL(url),
};

interface TripFormProps {
  mode: 'create' | 'edit';
  tripId?: string;
  initial?: TripDTO;
}

export default function TripForm({ mode, tripId, initial }: TripFormProps) {
  const router = useRouter();

  const [seed, dispatch] = useReducer(seedReducer, initial, initialSeedState);
  const [dateEnd, setDateEnd] = useState(initial?.dateEnd ?? '');
  const [highlight, setHighlight] = useState(initial?.highlight ?? '');
  const [story, setStory] = useState(initial?.story ?? '');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedWithoutPhoto, setSavedWithoutPhoto] = useState('');

  // The photo read branches on the seed state after its awaits, where the
  // closed-over value would be stale.
  const seedRef = useRef(seed);
  useEffect(() => {
    seedRef.current = seed;
  }, [seed]);

  // Counts photo picks, so a read whose photo has since been replaced can see
  // that it lost and stop.
  const seedPick = useRef(0);

  // Cleanup runs whenever the preview changes and on unmount, so replacing
  // the photo, removing it and leaving the page are all covered here rather
  // than at each call site.
  useEffect(() => {
    if (!seed.preview) return;
    const url = seed.preview;
    return () => URL.revokeObjectURL(url);
  }, [seed.preview]);

  function seedContext() {
    const pick = seedPick.current;
    return {
      deps: seedDeps,
      dispatch,
      getState: () => seedRef.current,
      isStale: () => pick !== seedPick.current,
      onError: setError,
    };
  }

  function pickSeedPhoto(file: File) {
    seedPick.current += 1;
    readSeedPhoto(file, seedContext());
  }

  function clearSeedPhoto() {
    seedPick.current += 1;
    dispatch({ type: 'photoRemoved' });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    // The memory already exists; re-submitting would create a duplicate.
    if (savedWithoutPhoto) {
      router.push(`/trip/${savedWithoutPhoto}/edit`);
      return;
    }
    setError('');
    if (!seed.placeName.trim() || !seed.country.trim()) {
      setError('Add a place name and country.');
      return;
    }
    if (!seed.coords) {
      setError('Search and choose a place to set its location on the globe.');
      return;
    }
    const dateProblem = tripDateError(seed.dateStart, dateEnd || null);
    if (dateProblem) {
      setError(dateProblem);
      return;
    }

    const body = {
      placeName: seed.placeName.trim(),
      country: seed.country.trim(),
      lat: seed.coords.lat,
      lng: seed.coords.lng,
      dateStart: seed.dateStart,
      dateEnd: dateEnd || null,
      highlight: highlight.trim() || null,
      story: story.trim() || null,
    };

    setBusy(true);
    const result =
      mode === 'create'
        ? await tripsApi.create(body)
        : await tripsApi.update(tripId!, body);

    if (!result.ok) {
      setBusy(false);
      setError(
        SAVE_ERRORS[result.error ?? ''] ?? 'Could not save this memory.',
      );
      return;
    }

    const id = mode === 'create' ? result.data!.trip.id : tripId!;
    if (mode === 'create' && seed.file) {
      const upload = await uploadPhoto(id, seed.file).catch(() => ({
        ok: false as const,
        error: 'upload_failed',
      }));
      if (!upload.ok) {
        setBusy(false);
        setSavedWithoutPhoto(id);
        return;
      }
    }

    router.push(`/trip/${id}`);
    router.refresh();
  }

  async function onDelete() {
    if (!tripId) return;
    const confirmed = window.confirm(
      'Delete this memory and its photos? This cannot be undone.',
    );
    if (!confirmed) return;
    setBusy(true);
    const result = await tripsApi.remove(tripId);
    setBusy(false);
    if (result.ok) {
      router.push('/');
      router.refresh();
      return;
    }
    setError('Could not delete this memory.');
  }

  return (
    <form className={`fade ${styles.form}`} onSubmit={onSubmit}>
      {mode === 'create' && (
        <PhotoSeed
          fileName={seed.file?.name ?? ''}
          preview={seed.preview}
          showNoPreview={Boolean(seed.file) && !seed.busy && !seed.preview}
          note={seed.note}
          busy={seed.busy}
          canUseLocation={seed.offer !== null}
          onPick={pickSeedPhoto}
          onClear={clearSeedPhoto}
          onUseLocation={() => takeSeedLocation(seedContext())}
        />
      )}

      <PlaceFields
        seed={seed}
        dispatch={dispatch}
        onPlacePicked={() => setError('')}
      />

      <div className={styles.row}>
        <Field label="Start date">
          <input
            className="field"
            type="date"
            value={seed.dateStart}
            onChange={(e) =>
              dispatch({
                type: 'userTyped',
                field: 'dateStart',
                value: e.target.value,
              })
            }
          />
        </Field>
        <Field label="End date (optional)">
          <input
            className="field"
            type="date"
            value={dateEnd}
            min={seed.dateStart || undefined}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Highlight" hint={`${highlight.length}/200`}>
        <input
          className="field"
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
          placeholder="One line you never want to forget."
          maxLength={200}
        />
      </Field>

      <Field label="Story" hint={`${story.length}/5000`}>
        <textarea
          className="field"
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="What happened here?"
          maxLength={5000}
          rows={6}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
      </Field>

      <div className="fieldError" style={{ minHeight: 18 }}>
        {error}
      </div>

      {savedWithoutPhoto && (
        <p className={styles.savedNote}>
          Memory saved, but the photo could not be uploaded.{' '}
          <Link href={`/trip/${savedWithoutPhoto}/edit`}>
            Add it on the edit page.
          </Link>
        </p>
      )}

      <div className={styles.actions}>
        <button className="button" type="submit" disabled={busy}>
          {busy
            ? 'Saving…'
            : savedWithoutPhoto
              ? 'Go to this memory'
              : mode === 'create'
                ? 'Save memory'
                : 'Save changes'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            className={styles.deleteButton}
            onClick={onDelete}
            disabled={busy}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
