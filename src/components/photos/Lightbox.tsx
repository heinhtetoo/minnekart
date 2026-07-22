'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from './Lightbox.module.css';

interface LightboxProps {
  photos: { displayUrl: string; caption?: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => Promise<boolean>;
}

export default function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
  hasMore = false,
  onLoadMore,
}: LightboxProps) {
  const count = photos.length;
  const [loading, setLoading] = useState(false);

  const prev = useCallback(
    () => onNavigate((index - 1 + count) % count),
    [index, count, onNavigate],
  );

  // Past the last loaded photo, pull the next page in rather than wrapping
  // back to the start — otherwise a paged gallery looks like it ends at 25.
  const next = useCallback(async () => {
    if (index < count - 1) {
      onNavigate(index + 1);
      return;
    }
    if (hasMore && onLoadMore && !loading) {
      setLoading(true);
      const loaded = await onLoadMore();
      setLoading(false);
      if (loaded) {
        onNavigate(index + 1);
      }
      return;
    }
    onNavigate(0);
  }, [index, count, onNavigate, hasMore, onLoadMore, loading]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') prev();
      if (event.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  // The photos list and the index update from different components, so clamp
  // rather than risk a frame where the index outruns the list.
  const photo = photos[Math.min(index, count - 1)];

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      {count > 1 && (
        <button
          type="button"
          className={styles.prev}
          onClick={(event) => {
            event.stopPropagation();
            prev();
          }}
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.image}
        src={photo.displayUrl}
        alt={photo.caption ?? ''}
        onClick={(event) => event.stopPropagation()}
      />
      {(count > 1 || hasMore) && (
        <button
          type="button"
          className={styles.next}
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          disabled={loading}
          aria-label="Next photo"
        >
          {loading ? '…' : '›'}
        </button>
      )}
    </div>
  );
}
