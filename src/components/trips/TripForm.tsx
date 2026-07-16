'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';

import { PlaceResult } from '@/lib/geocode';
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

  function pickPlace(place: PlaceResult) {
    setPlaceName(place.placeName);
    setCountry(place.country);
    setCoords({ lat: place.lat, lng: place.lng });
    setError('');
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
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
    setBusy(false);

    if (result.ok) {
      const id = mode === 'create' ? result.data!.trip.id : tripId!;
      router.push(`/trip/${id}`);
      router.refresh();
      return;
    }
    setError(SAVE_ERRORS[result.error ?? ''] ?? 'Could not save this memory.');
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
      <PlaceSearch onPick={pickPlace} />

      <div className={styles.row}>
        <Field label="Place name">
          <input
            className="field"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            placeholder="Kyoto"
            maxLength={120}
          />
        </Field>
        <Field label="Country">
          <input
            className="field"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
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
            onChange={(e) => setDateStart(e.target.value)}
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

      <div className={styles.actions}>
        <button className="button" type="submit" disabled={busy}>
          {busy
            ? 'Saving…'
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
