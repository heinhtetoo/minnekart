'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './Lightbox.module.css';

interface LightboxPhoto {
  displayUrl: string;
  caption?: string;
  sublabel?: string;
  // Where "Open journey →" goes (gallery photos).
  href?: string;
}

interface LightboxProps {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => Promise<boolean>;
  // Caption for photos that have none of their own: a trip page's photos all
  // belong to that trip, so they show its name and dates.
  title?: string;
  meta?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Print: the photo shown as a framed print, its caption and counter written in
// the margin. Drawn at the top of the page (a portal), so it covers the top bar.
export default function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
  hasMore = false,
  onLoadMore,
  title,
  meta,
}: LightboxProps) {
  const count = photos.length;
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
      // Keep keyboard focus inside the viewer while it is open.
      if (event.key === 'Tab' && dialogRef.current) {
        const items = [
          ...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        ].filter((item) => item.getClientRects().length > 0);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        const inside = dialogRef.current.contains(active);
        if (event.shiftKey && (active === first || !inside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !inside)) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  // While open: the page behind doesn't scroll, focus starts on the viewer and
  // goes back to the photo that opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, []);

  // The photos list and the index update from different components, so clamp
  // rather than risk a frame where the index outruns the list.
  const position = Math.min(index, count - 1);
  const photo = photos[position];
  const place = photo.caption ?? title;
  const detail = photo.caption ? photo.sublabel : meta;
  const many = count > 1 || hasMore;

  const prevButton = count > 1 && (
    <button
      type="button"
      className={styles.nav}
      onClick={(event) => {
        event.stopPropagation();
        prev();
      }}
      aria-label="Previous photo"
    >
      <Chevron left />
    </button>
  );
  const nextButton = many && (
    <button
      type="button"
      className={styles.nav}
      onClick={(event) => {
        event.stopPropagation();
        next();
      }}
      disabled={loading}
      aria-label="Next photo"
    >
      {loading ? '…' : <Chevron />}
    </button>
  );
  // No counter for a single photo: "1 / 1" says nothing.
  const counter = many && (
    <span className={styles.counter}>
      <b>{position + 1}</b> / {count}
      {hasMore ? '+' : ''}
    </span>
  );

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={place ?? 'Photo'}
    >
      <button
        ref={closeRef}
        type="button"
        className={`${styles.nav} ${styles.close}`}
        onClick={onClose}
        aria-label="Close"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <span className={`${styles.side} ${styles.sideLeft}`}>{prevButton}</span>

      <figure
        className={styles.print}
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.image}
          src={photo.displayUrl}
          alt={photo.caption ?? ''}
        />
        {(place || counter) && (
          <figcaption className={styles.margin}>
            <div>
              {place && <div className={`serif ${styles.place}`}>{place}</div>}
              {detail && <div className={styles.meta}>{detail}</div>}
              {photo.href && (
                <Link href={photo.href} className={styles.open}>
                  Open journey →
                </Link>
              )}
            </div>
            <span className={styles.marginCounter}>{counter}</span>
          </figcaption>
        )}
      </figure>

      <span className={`${styles.side} ${styles.sideRight}`}>{nextButton}</span>
      {many && (
        <div
          className={styles.bottomNav}
          onClick={(event) => event.stopPropagation()}
        >
          {prevButton || <span />}
          {counter}
          {nextButton}
        </div>
      )}
    </div>,
    document.body,
  );
}

function Chevron({ left }: { left?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}
