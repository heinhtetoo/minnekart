'use client';

import { useState } from 'react';

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

  async function selectCountry(next: string | null) {
    if (next === country) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await photosApi.listMine(0, next);
    setBusy(false);
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
        <div className={styles.chips}>
          <Chip
            label="All"
            active={country === null}
            onClick={() => selectCountry(null)}
          />
          {countries.map((name) => (
            <Chip
              key={name}
              label={name}
              active={country === name}
              onClick={() => selectCountry(name)}
            />
          ))}
        </div>
      )}
      <PhotoGrid
        photos={photos.map(toTile)}
        variant="masonry"
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
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
  onClick,
}: {
  label: string;
  active: boolean;
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
    </button>
  );
}
