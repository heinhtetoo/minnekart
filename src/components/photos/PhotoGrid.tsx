'use client';

import { useState } from 'react';

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
}

interface PhotoGridProps {
  photos: PhotoTile[];
  variant?: 'masonry' | 'grid3';
}

export default function PhotoGrid({
  photos,
  variant = 'grid3',
}: PhotoGridProps) {
  const [index, setIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      <div className={variant === 'masonry' ? styles.masonry : styles.grid3}>
        {photos.map((photo, position) => (
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
              style={
                variant === 'masonry'
                  ? { aspectRatio: `${photo.width} / ${photo.height}` }
                  : undefined
              }
            />
            {photo.caption && (
              <span className={styles.overlay}>
                <span className={styles.caption}>{photo.caption}</span>
                {photo.sublabel && (
                  <span className={styles.sublabel}>{photo.sublabel}</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>
      {index !== null && (
        <Lightbox
          photos={photos}
          index={index}
          onClose={() => setIndex(null)}
          onNavigate={setIndex}
        />
      )}
    </>
  );
}
