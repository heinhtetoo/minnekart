import Link from 'next/link';

import { formatTripDates } from '@/components/home/format';
import PhotoGrid, { PhotoTile } from '@/components/photos/PhotoGrid';
import { coverGradient } from '@/lib/photos/gradient';

import styles from './TripDetailBody.module.css';

interface Neighbour {
  id: string;
  placeName: string;
}

interface TripDetailBodyProps {
  tripId: string;
  placeName: string;
  country: string;
  dateStart: string;
  dateEnd: string | null;
  highlight: string | null;
  story: string | null;
  tiles: PhotoTile[];
  backHref: string;
  backLabel: string;
  editHref?: string;
  neighbours?: { prev: Neighbour; next: Neighbour } | null;
}

export default function TripDetailBody({
  tripId,
  placeName,
  country,
  dateStart,
  dateEnd,
  highlight,
  story,
  tiles,
  backHref,
  backLabel,
  editHref,
  neighbours,
}: TripDetailBodyProps) {
  const paragraphs = (story ?? '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const heroStyle = tiles[0]
    ? { backgroundImage: `url(${tiles[0].displayUrl})` }
    : { background: coverGradient(tripId) };

  return (
    <main className={`fade ${styles.main}`}>
      <section className={styles.hero} style={heroStyle}>
        <div className={styles.heroScrim} />
        <div className={styles.heroInner}>
          <Link href={backHref} className={styles.backPill}>
            {backLabel}
          </Link>
          <p className={styles.heroMeta}>
            {country} · {formatTripDates(dateStart, dateEnd)}
          </p>
          <h1 className={`serif ${styles.heroTitle}`}>{placeName}</h1>
        </div>
      </section>

      <section className={styles.body}>
        <div>
          {highlight && (
            <p className={`serif ${styles.quote}`}>“{highlight}”</p>
          )}
          {paragraphs.length > 0 ? (
            paragraphs.map((block, index) => (
              <p key={index} className={styles.story}>
                {block}
              </p>
            ))
          ) : (
            <p className={styles.storyEmpty}>No story written yet.</p>
          )}
        </div>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarLabel}>Trip details</div>
          <DetailRow label="Destination" value={placeName} />
          <DetailRow label="Country" value={country} />
          <DetailRow label="When" value={formatTripDates(dateStart, dateEnd)} />
          <DetailRow label="Photos" value={String(tiles.length)} accent />
          {editHref && (
            <Link href={editHref} className={styles.editButton}>
              Edit memory
            </Link>
          )}
        </aside>
      </section>

      <section className={styles.photos}>
        <div className={styles.photosHeading}>Photographs</div>
        {tiles.length > 0 ? (
          <PhotoGrid photos={tiles} variant="grid3" />
        ) : (
          <p className={styles.storyEmpty}>No photos yet.</p>
        )}
        {neighbours && (
          <div className={styles.pager}>
            <Link
              href={`/trip/${neighbours.prev.id}`}
              className={styles.pagerLink}
            >
              ← {neighbours.prev.placeName}
            </Link>
            <Link
              href={`/trip/${neighbours.next.id}`}
              className={styles.pagerLink}
            >
              {neighbours.next.placeName} →
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function DetailRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span
        className={styles.detailValue}
        style={accent ? { color: 'var(--accent)' } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
