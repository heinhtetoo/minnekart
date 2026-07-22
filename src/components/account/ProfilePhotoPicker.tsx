'use client';

import { useState } from 'react';

import { photosApi } from '@/components/photos/api';
import { LibraryPhoto } from '@/lib/photos/library';

import styles from './ProfilePhotoPicker.module.css';

interface ProfilePhotoPickerProps {
  selectedId: string | null;
  fallbackThumbUrl: string | null;
  onSelect: (photoId: string | null) => void;
}

export default function ProfilePhotoPicker({
  selectedId,
  fallbackThumbUrl,
  onSelect,
}: ProfilePhotoPickerProps) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<LibraryPhoto[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = photos.find((photo) => photo.id === selectedId);
  const previewUrl = selectedId
    ? (selected?.thumbUrl ?? fallbackThumbUrl)
    : null;

  async function fetchPage(offset: number) {
    setBusy(true);
    setError(null);
    const result = await photosApi.listMine(offset, null);
    setBusy(false);
    if (!result.ok || !result.data) {
      setError('Could not load your photos.');
      return;
    }
    setPhotos(
      offset === 0 ? result.data.photos : [...photos, ...result.data.photos],
    );
    setHasMore(result.data.hasMore);
    setLoaded(true);
  }

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!loaded) {
      await fetchPage(0);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <span
          className={styles.preview}
          style={
            previewUrl ? { backgroundImage: `url(${previewUrl})` } : undefined
          }
          data-empty={!previewUrl}
          aria-hidden="true"
        />
        <div className={styles.rowText}>
          <p className={styles.rowTitle}>
            {previewUrl ? 'Your card photo' : 'No photo chosen'}
          </p>
          <p className={styles.hint}>
            {previewUrl
              ? 'Shown behind your name on your profile.'
              : 'Your profile card uses the plain gradient.'}
          </p>
          <div className={styles.rowActions}>
            <button type="button" className={styles.link} onClick={toggle}>
              {open ? 'Close library' : 'Choose from library'}
            </button>
            {selectedId && (
              <button
                type="button"
                className={styles.remove}
                onClick={() => onSelect(null)}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {open && loaded && photos.length === 0 && (
        <p className={styles.hint}>
          Upload a photo to one of your memories and it will appear here.
        </p>
      )}

      {open && (
        <ul className={styles.grid}>
          {photos.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                className={styles.tile}
                aria-pressed={photo.id === selectedId}
                data-active={photo.id === selectedId}
                onClick={() => {
                  onSelect(photo.id);
                  setOpen(false);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbUrl}
                  alt={photo.placeName}
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && hasMore && (
        <button
          type="button"
          className={styles.more}
          onClick={() => fetchPage(photos.length)}
          disabled={busy}
        >
          {busy ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
