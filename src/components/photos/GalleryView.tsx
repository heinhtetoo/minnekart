'use client';

import { useEffect, useRef, useState } from 'react';

import { LibraryPhoto } from '@/lib/photos/library';

import { photosApi } from './api';
import PhotoGrid, { PhotoTile } from './PhotoGrid';
import styles from './GalleryView.module.css';

export type GalleryPhoto = LibraryPhoto;

function toTile(photo: GalleryPhoto): PhotoTile {
  return {
    id: photo.id,
    thumbUrl: photo.thumbUrl,
    displayUrl: photo.displayUrl,
    width: photo.width,
    height: photo.height,
    caption: photo.placeName,
    sublabel: photo.country,
    href: `/trip/${photo.tripId}`,
  };
}

// Guards the one real race: a photo added in another tab shifts the offset,
// which would otherwise repeat a photo on the next page.
function appendUnique(
  current: GalleryPhoto[],
  incoming: GalleryPhoto[],
): GalleryPhoto[] {
  const seen = new Set(current.map((photo) => photo.id));
  return [...current, ...incoming.filter((photo) => !seen.has(photo.id))];
}

interface GalleryViewProps {
  initialPhotos: GalleryPhoto[];
  initialHasMore: boolean;
  countries: string[];
  initialCountry?: string | null;
}

export default function GalleryView({
  initialPhotos,
  initialHasMore,
  countries,
  initialCountry = null,
}: GalleryViewProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [country, setCountry] = useState<string | null>(initialCountry);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Display only: which chip was pressed while its photos load (undefined when
  // nothing is loading; null is "All").
  const [pending, setPending] = useState<string | null | undefined>(undefined);
  const chipsRef = useRef<HTMLDivElement>(null);

  // On phones the chips scroll sideways; arriving with a country chosen (from
  // a trip page) brings that chip into view. Only the chip row scrolls.
  useEffect(() => {
    const row = chipsRef.current;
    const active = row?.querySelector<HTMLElement>('[data-active="true"]');
    if (row && active && row.scrollWidth > row.clientWidth) {
      row.scrollLeft = active.offsetLeft - row.offsetLeft - 20;
    }
  }, []);

  async function selectCountry(next: string | null) {
    if (next === country) {
      return;
    }
    setBusy(true);
    setError(null);
    setPending(next);
    const result = await photosApi.listMine(0, next);
    setBusy(false);
    setPending(undefined);
    if (!result.ok || !result.data) {
      setError('Could not load those photos.');
      return;
    }
    setCountry(next);
    setPhotos(result.data.photos);
    setHasMore(result.data.hasMore);
  }

  async function loadMore(): Promise<boolean> {
    setBusy(true);
    setError(null);
    const result = await photosApi.listMine(photos.length, country);
    setBusy(false);
    if (!result.ok || !result.data) {
      setError('Could not load more photos.');
      return false;
    }
    const next = appendUnique(photos, result.data.photos);
    setPhotos(next);
    setHasMore(result.data.hasMore);
    return next.length > photos.length;
  }

  return (
    <>
      {countries.length > 1 && (
        <div className={styles.chips} ref={chipsRef}>
          <Chip
            label="All"
            active={country === null}
            loading={pending === null}
            onClick={() => selectCountry(null)}
          />
          {countries.map((name) => (
            <Chip
              key={name}
              label={name}
              active={country === name}
              loading={pending === name}
              onClick={() => selectCountry(name)}
            />
          ))}
        </div>
      )}
      <div className={styles.grid} data-switching={pending !== undefined}>
        {/* With a country chosen, every tile would repeat it, so tiles show
            the place only; the viewer still shows the country. */}
        <PhotoGrid
          photos={photos.map(toTile)}
          variant="rows"
          tileSublabels={country === null}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {hasMore && (
        <div className={styles.more}>
          <button
            type="button"
            className={styles.moreButton}
            onClick={loadMore}
            disabled={busy}
          >
            {busy ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}

function Chip({
  label,
  active,
  loading,
  onClick,
}: {
  label: string;
  active: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.chip}
      data-active={active}
      onClick={onClick}
    >
      {label}
      {/* While its photos load, a short light runs round the pill's border.
          Drawn as an outline (ry is half the height, so the ends are round)
          so it moves at an even speed along the sides and round the ends. */}
      {loading && (
        <svg className={styles.running} aria-hidden="true">
          <rect width="100%" height="100%" ry="50%" pathLength={100} />
        </svg>
      )}
    </button>
  );
}
