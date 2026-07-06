'use client';

import { useCallback, useEffect } from 'react';

import styles from './Lightbox.module.css';

interface LightboxProps {
  photos: { displayUrl: string; caption?: string }[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: LightboxProps) {
  const count = photos.length;

  const prev = useCallback(
    () => onNavigate((index - 1 + count) % count),
    [index, count, onNavigate],
  );
  const next = useCallback(
    () => onNavigate((index + 1) % count),
    [index, count, onNavigate],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') prev();
      if (event.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  const photo = photos[index];

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
      {count > 1 && (
        <button
          type="button"
          className={styles.next}
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          aria-label="Next photo"
        >
          ›
        </button>
      )}
    </div>
  );
}
