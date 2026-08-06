'use client';

import { useEffect, useRef, useState } from 'react';

import { PlaceResult } from '@/lib/geocode';

import Field from './Field';
import styles from './TripForm.module.css';
import { geocodeApi } from './api';

export default function PlaceSearch({
  onPick,
}: {
  onPick: (place: PlaceResult) => void;
}) {
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
