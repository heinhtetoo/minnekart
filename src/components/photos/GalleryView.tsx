'use client';

import { useMemo, useState } from 'react';

import { SignedPhoto } from '@/lib/photos/dto';
import { distinctCountries } from '@/lib/photos/gallery';

import PhotoGrid, { PhotoTile } from './PhotoGrid';
import styles from './GalleryView.module.css';

export interface GalleryPhoto extends SignedPhoto {
  country: string;
  placeName: string;
}

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

interface GalleryViewProps {
  photos: GalleryPhoto[];
  initialCountry?: string | null;
}

export default function GalleryView({
  photos,
  initialCountry = null,
}: GalleryViewProps) {
  const countries = useMemo(() => distinctCountries(photos), [photos]);
  const [country, setCountry] = useState<string | null>(
    initialCountry && countries.includes(initialCountry)
      ? initialCountry
      : null,
  );

  const filtered = country
    ? photos.filter((photo) => photo.country === country)
    : photos;

  return (
    <>
      {countries.length > 1 && (
        <div className={styles.chips}>
          <Chip
            label="All"
            active={country === null}
            onClick={() => setCountry(null)}
          />
          {countries.map((name) => (
            <Chip
              key={name}
              label={name}
              active={country === name}
              onClick={() => setCountry(name)}
            />
          ))}
        </div>
      )}
      <PhotoGrid photos={filtered.map(toTile)} variant="masonry" />
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
