'use client';

import { CSSProperties, useState } from 'react';

import Lightbox from './Lightbox';
import styles from './PhotoGrid.module.css';

export interface PhotoTile {
  id: string;
  thumbUrl: string;
  displayUrl: string;
  width: number;
  height: number;
  caption?: string;
  sublabel?: string;
  // The trip this photo belongs to, for the viewer's "Open journey →".
  href?: string;
}

interface PhotoGridProps {
  photos: PhotoTile[];
  // rows: the gallery's light table, photos in rows, each keeping its shape.
  // grid3: the trip page's contact sheet.
  variant?: 'rows' | 'grid3';
  // rows only: false leaves the sublabel off the tiles (the viewer keeps it).
  tileSublabels?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => Promise<boolean>;
  // Viewer caption for photos without their own (a trip page's photos).
  title?: string;
  meta?: string;
}

export default function PhotoGrid({
  photos,
  variant = 'grid3',
  tileSublabels = true,
  hasMore,
  onLoadMore,
  title,
  meta,
}: PhotoGridProps) {
  const [index, setIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      <div className={variant === 'rows' ? styles.rows : styles.grid3}>
        {photos.map((photo, position) =>
          variant === 'rows' ? (
            <button
              key={photo.id}
              type="button"
              className={styles.tile}
              // Each photo grows in proportion to its shape, so every photo in
              // a row ends up the same height.
              style={{ '--r': ratio(photo) } as CSSProperties}
              onClick={() => setIndex(position)}
            >
              <span className={styles.photo}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbUrl}
                  alt={photo.caption ?? ''}
                  loading="lazy"
                />
              </span>
              {photo.caption && (
                <span className={styles.scrim}>
                  {/* The inner spans carry the two-line limit (it can't sit
                      on a flex item itself). */}
                  <span className={styles.caption}>
                    <span className={styles.clamp}>{photo.caption}</span>
                  </span>
                  {tileSublabels && photo.sublabel && (
                    <span className={styles.sublabel}>
                      <span className={styles.clamp}>{photo.sublabel}</span>
                    </span>
                  )}
                </span>
              )}
            </button>
          ) : (
            <button
              key={photo.id}
              type="button"
              className={styles.tile}
              onClick={() => setIndex(position)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt={photo.caption ?? ''}
                loading="lazy"
              />
              {variant === 'grid3' && (
                <span className={styles.frameNo} aria-hidden="true">
                  {String(position + 1).padStart(2, '0')}
                </span>
              )}
              {photo.caption && (
                <span className={styles.overlay}>
                  <span className={styles.caption}>{photo.caption}</span>
                  {photo.sublabel && (
                    <span className={styles.sublabel}>{photo.sublabel}</span>
                  )}
                </span>
              )}
            </button>
          ),
        )}
      </div>
      {index !== null && (
        <Lightbox
          photos={photos}
          index={index}
          onClose={() => setIndex(null)}
          onNavigate={setIndex}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          title={title}
          meta={meta}
        />
      )}
    </>
  );
}

function ratio(photo: PhotoTile): number {
  return photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 1;
}
