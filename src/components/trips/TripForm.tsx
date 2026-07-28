'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import { uploadPhoto } from '@/components/photos/upload';
import { PlaceResult } from '@/lib/geocode';
import { readPhotoExif } from '@/lib/photos/exif';
import { sniffImageFormat } from '@/lib/photos/format';
import { tripDateError } from '@/lib/trips/dates';
import { TripDTO } from '@/lib/trips/dto';

import { geocodeApi, tripsApi } from './api';
import styles from './TripForm.module.css';

const SAVE_ERRORS: Record<string, string> = {
  invalid_request: 'Please check the details and try again.',
  not_found: 'This memory could not be found.',
  rate_limited: 'Too many requests. Please wait a moment.',
  trip_limit_reached:
    "You've used your 15 free memories. Upgrade in Settings for unlimited.",
};

const MAX_SEED_BYTES = 50 * 1024 * 1024;

// Fields the seed photo filled and the user has not touched since. Only
// these get replaced by the next photo or cleared when the photo is removed,
// so nothing typed by hand is ever discarded.
type SeedField = 'placeName' | 'country' | 'dateStart' | 'coords';

interface TripFormProps {
  mode: 'create' | 'edit';
  tripId?: string;
  initial?: TripDTO;
}

export default function TripForm({ mode, tripId, initial }: TripFormProps) {
  const router = useRouter();

  const [placeName, setPlaceName] = useState(initial?.placeName ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [dateStart, setDateStart] = useState(initial?.dateStart ?? '');
  const [dateEnd, setDateEnd] = useState(initial?.dateEnd ?? '');
  const [highlight, setHighlight] = useState(initial?.highlight ?? '');
  const [story, setStory] = useState(initial?.story ?? '');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [seedFile, setSeedFile] = useState<File | null>(null);
  const [seedNote, setSeedNote] = useState('');
  const [seedBusy, setSeedBusy] = useState(false);
  const [savedWithoutPhoto, setSavedWithoutPhoto] = useState('');
  const [seedOffer, setSeedOffer] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const seedPick = useRef(0);
  const seedOwned = useRef<Set<SeedField>>(new Set());

  // readSeedPhoto branches on whether a pin already exists, and it does so
  // after awaits, where the closed-over state would be stale.
  const coordsRef = useRef(coords);
  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  function releaseSeedField(field: SeedField) {
    seedOwned.current.delete(field);
  }

  function fillFromPhoto(
    field: SeedField,
    setValue: Dispatch<SetStateAction<string>>,
    value: string,
  ) {
    setValue((current) => {
      if (!seedOwned.current.has(field) && current !== '') {
        return current;
      }
      seedOwned.current.add(field);
      return value;
    });
  }

  // Place name, country and pin describe one place, so whenever the photo's
  // location changes they move together. Anything typed by hand is left
  // alone — that is a label the user chose, not a stale reading.
  function clearOwnedPlaceName() {
    if (seedOwned.current.has('placeName')) {
      setPlaceName('');
      releaseSeedField('placeName');
    }
    if (seedOwned.current.has('country')) {
      setCountry('');
      releaseSeedField('country');
    }
  }

  function clearOwnedCoords() {
    if (seedOwned.current.has('coords')) {
      setCoords(null);
      releaseSeedField('coords');
    }
  }

  function pickPlace(place: PlaceResult) {
    setPlaceName(place.placeName);
    setCountry(place.country);
    setCoords({ lat: place.lat, lng: place.lng });
    (['placeName', 'country', 'coords'] as SeedField[]).forEach(
      releaseSeedField,
    );
    setSeedOffer(null);
    setError('');
  }

  // An explicit swap takes the photo's place whole, overwriting the searched
  // one. Moving the pin alone would leave the old name beside new
  // coordinates, which is the mismatch this is meant to prevent.
  async function useSeedLocation() {
    if (!seedOffer) return;
    const pick = seedPick.current;
    const { lat, lng } = seedOffer;

    setCoords({ lat, lng });
    seedOwned.current.add('coords');
    setSeedOffer(null);
    setSeedBusy(true);

    const result = await geocodeApi.reverse(lat, lng);
    if (pick !== seedPick.current) return;
    setSeedBusy(false);

    const place = result.data?.place;
    if (!place) {
      setSeedNote('Pinned from this photo. Check the place name and country.');
      return;
    }
    seedOwned.current.add('placeName');
    seedOwned.current.add('country');
    setPlaceName(place.placeName);
    setCountry(place.country);
    setSeedNote('Filled in from this photo. Check it before saving.');
  }

  async function readSeedPhoto(file: File) {
    seedPick.current += 1;
    const pick = seedPick.current;
    const isStale = () => pick !== seedPick.current;

    if (file.size > MAX_SEED_BYTES) {
      setSeedFile(null);
      setSeedNote('');
      setError('That file is too large. Pick a photo under 50MB.');
      return;
    }

    setSeedFile(file);
    setSeedBusy(true);
    setSeedNote('');
    setError('');

    const buffer = await file.arrayBuffer();
    if (isStale()) return;

    const format = sniffImageFormat(buffer);
    if (!format) {
      setSeedFile(null);
      setSeedBusy(false);
      setError('That file is not a photo. Pick a JPEG, PNG, WebP or HEIC.');
      return;
    }

    const exif = await readPhotoExif(buffer);
    if (isStale()) return;

    if (exif.takenAt) {
      fillFromPhoto('dateStart', setDateStart, exif.takenAt.slice(0, 10));
    }

    if (exif.lat === null || exif.lng === null) {
      // A photo with no location must not leave the last photo's place behind.
      clearOwnedPlaceName();
      clearOwnedCoords();
      setSeedBusy(false);
      setSeedNote(
        exif.takenAt
          ? 'Date read from this photo. It has no location saved in it.'
          : 'This photo has no location or date saved in it.',
      );
      return;
    }

    const photoCoords = { lat: exif.lat, lng: exif.lng };
    if (!seedOwned.current.has('coords') && coordsRef.current !== null) {
      setSeedBusy(false);
      setSeedOffer(photoCoords);
      setSeedNote('This photo was taken somewhere else.');
      return;
    }

    // Drop the previous photo's name before adopting this one's, so a failed
    // lookup cannot leave it sitting beside the new pin.
    clearOwnedPlaceName();
    setCoords(photoCoords);
    seedOwned.current.add('coords');
    const result = await geocodeApi.reverse(exif.lat, exif.lng);
    if (isStale()) return;
    setSeedBusy(false);

    const place = result.data?.place;
    if (!place) {
      setSeedNote('Pinned from this photo. Add a place name and country.');
      return;
    }
    fillFromPhoto('placeName', setPlaceName, place.placeName);
    fillFromPhoto('country', setCountry, place.country);
    setSeedNote('Filled in from this photo. Check it before saving.');
  }

  function clearSeedPhoto() {
    seedPick.current += 1;
    if (seedOwned.current.has('placeName')) setPlaceName('');
    if (seedOwned.current.has('country')) setCountry('');
    if (seedOwned.current.has('dateStart')) setDateStart('');
    if (seedOwned.current.has('coords')) setCoords(null);
    seedOwned.current.clear();
    setSeedFile(null);
    setSeedNote('');
    setSeedOffer(null);
    setSeedBusy(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    // The memory already exists; re-submitting would create a duplicate.
    if (savedWithoutPhoto) {
      router.push(`/trip/${savedWithoutPhoto}/edit`);
      return;
    }
    setError('');
    if (!placeName.trim() || !country.trim()) {
      setError('Add a place name and country.');
      return;
    }
    if (!coords) {
      setError('Search and choose a place to set its location on the globe.');
      return;
    }
    const dateProblem = tripDateError(dateStart, dateEnd || null);
    if (dateProblem) {
      setError(dateProblem);
      return;
    }

    const body = {
      placeName: placeName.trim(),
      country: country.trim(),
      lat: coords.lat,
      lng: coords.lng,
      dateStart,
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
    if (mode === 'create' && seedFile) {
      const upload = await uploadPhoto(id, seedFile).catch(() => ({
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
          fileName={seedFile?.name ?? ''}
          note={seedNote}
          busy={seedBusy}
          canUseLocation={seedOffer !== null}
          onPick={readSeedPhoto}
          onClear={clearSeedPhoto}
          onUseLocation={useSeedLocation}
        />
      )}

      <PlaceSearch onPick={pickPlace} />

      <div className={styles.row}>
        <Field label="Place name">
          <input
            className="field"
            value={placeName}
            onChange={(e) => {
              releaseSeedField('placeName');
              setPlaceName(e.target.value);
            }}
            placeholder="Kyoto"
            maxLength={120}
          />
        </Field>
        <Field label="Country">
          <input
            className="field"
            value={country}
            onChange={(e) => {
              releaseSeedField('country');
              setCountry(e.target.value);
            }}
            placeholder="Japan"
            maxLength={80}
          />
        </Field>
      </div>

      {coords ? (
        <p className={styles.coords}>
          Pin set · {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
        </p>
      ) : (
        <p className={styles.coordsPrompt}>
          Search above to drop a pin on the globe.
        </p>
      )}

      <div className={styles.row}>
        <Field label="Start date">
          <input
            className="field"
            type="date"
            value={dateStart}
            onChange={(e) => {
              releaseSeedField('dateStart');
              setDateStart(e.target.value);
            }}
          />
        </Field>
        <Field label="End date (optional)">
          <input
            className="field"
            type="date"
            value={dateEnd}
            min={dateStart || undefined}
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

function PhotoSeed({
  fileName,
  note,
  busy,
  canUseLocation,
  onPick,
  onClear,
  onUseLocation,
}: {
  fileName: string;
  note: string;
  busy: boolean;
  canUseLocation: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  onUseLocation: () => void;
}) {
  return (
    <div className={styles.seed}>
      <label className={styles.seedPick}>
        {/*
          No accept filter on purpose. An image-only accept steers Chrome on
          Android to the gallery picker, whose media provider blanks EXIF
          location; the file browser hands over the original bytes. The file
          is vetted by its magic bytes instead, which accept never did.
        */}
        <input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onPick(file);
          }}
          hidden
        />
        {fileName ? `Photo: ${fileName}` : 'Start from a photo'}
      </label>

      {!fileName && (
        <p className={styles.seedHint}>
          Pick one photo and we&apos;ll read its location and date to fill this
          in. It gets added to the memory when you save. On a phone, a photo you
          take now keeps its location; saved ones usually only give us the date.
        </p>
      )}

      {busy && <p className={styles.seedHint}>Reading the photo…</p>}

      {!busy && fileName && (
        <p className={styles.seedNote}>
          <span>
            {note}
            {canUseLocation && (
              <button
                type="button"
                className={styles.seedSwap}
                onClick={onUseLocation}
              >
                Use the photo&apos;s place
              </button>
            )}
          </span>
          <button type="button" className={styles.seedClear} onClick={onClear}>
            Remove
          </button>
        </p>
      )}
    </div>
  );
}

function PlaceSearch({ onPick }: { onPick: (place: PlaceResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const trimmed = query.trim();
    const timer = setTimeout(
      async () => {
        if (trimmed.length < 2) {
          setResults([]);
          setOpen(false);
          return;
        }
        setSearching(true);
        setOpen(true);
        const result = await geocodeApi.search(trimmed);
        setSearching(false);
        setResults(result.data?.results ?? []);
      },
      trimmed.length < 2 ? 0 : 400,
    );
    return () => clearTimeout(timer);
  }, [query]);

  function choose(place: PlaceResult) {
    onPick(place);
    skipNextSearch.current = true;
    setQuery(place.displayName);
    setResults([]);
    setOpen(false);
  }

  return (
    <div className={styles.search}>
      <Field label="Search for a place">
        <input
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Type a city, landmark, or address…"
          autoComplete="off"
        />
      </Field>
      {open && (
        <ul className={styles.results}>
          {searching && <li className={styles.resultEmpty}>Searching…</li>}
          {!searching && results.length === 0 && (
            <li className={styles.resultEmpty}>No matches.</li>
          )}
          {results.map((place, index) => (
            <li key={`${place.lat},${place.lng},${index}`}>
              <button
                type="button"
                className={styles.result}
                onClick={() => choose(place)}
              >
                <span className={styles.resultName}>{place.placeName}</span>
                <span className={styles.resultMeta}>{place.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={styles.fieldWrap}>
      <span className={styles.fieldHead}>
        <span className="label" style={{ margin: 0 }}>
          {label}
        </span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}
