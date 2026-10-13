import Link from 'next/link';
import { CSSProperties } from 'react';

import { formatTripDates } from '@/components/home/format';
import NavIcon from '@/components/nav/navIcons';
import PhotoGrid, { PhotoTile } from '@/components/photos/PhotoGrid';
import { coverGradient } from '@/lib/photos/gradient';

import BackLink from './BackLink';
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
  // The owner's page: the back link returns to wherever they came from, and
  // backHref / backLabel are only the fallback.
  smartBack?: boolean;
  editHref?: string;
  galleryHref?: string;
  neighbours?: { prev: Neighbour; next: Neighbour } | null;
}

// Plate: the cover is framed like a print beside the title, never under text.
// A blur of the cover washes the header in the trip's own colours, and with
// three or more photos the next two peek out behind the print.
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
  smartBack,
  editHref,
  galleryHref,
  neighbours,
}: TripDetailBodyProps) {
  const paragraphs = (story ?? '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const cover = tiles[0];
  const coverStyle = cover
    ? { backgroundImage: `url(${cover.displayUrl})` }
    : { background: coverGradient(tripId) };
  // The wash is blurred anyway, so the small thumbnail is enough.
  const washStyle = {
    '--wash': cover ? `url("${cover.thumbUrl}")` : coverGradient(tripId),
  } as CSSProperties;
  const stack = tiles.length > 2 ? [tiles[2], tiles[1]] : [];

  return (
    <main className={`fade ${styles.main}`}>
      <div className={styles.headWrap} style={washStyle}>
        <section className={styles.head}>
          <div className={styles.headText}>
            {smartBack ? (
              <BackLink
                className={styles.back}
                fallbackHref={backHref}
                fallbackLabel={backLabel}
              />
            ) : (
              <Link href={backHref} className={styles.back}>
                {backLabel}
              </Link>
            )}
            <p className={styles.eyebrow}>
              {country} · {formatTripDates(dateStart, dateEnd)}
            </p>
            <h1
              className={`serif ${styles.title}`}
              data-long={placeName.length > 20}
            >
              {placeName}
            </h1>
            {highlight && (
              <p className={`serif ${styles.quote}`}>“{highlight}”</p>
            )}
          </div>
          <div className={styles.plateWrap} aria-hidden="true">
            {stack.map((tile, index) => (
              <span
                key={tile.id}
                className={`${styles.print} ${index === 0 ? styles.printBack : styles.printMid}`}
              >
                <span
                  className={styles.printPhoto}
                  style={{ backgroundImage: `url(${tile.thumbUrl})` }}
                />
              </span>
            ))}
            <span className={styles.plate}>
              <span className={styles.platePhoto} style={coverStyle} />
              <span className={styles.plateFoot}>
                <i className={styles.diamond} />
              </span>
            </span>
          </div>
        </section>
      </div>

      {/* Same rule as the timeline and home: "1 Photo", "5 Photos", and no
          count when there are none. With no count and no actions (a public
          trip without photos) the row has nothing to say, so it's left out. */}
      {(tiles.length > 0 || editHref || galleryHref) && (
        <section className={styles.ledger} aria-label="Trip details">
          <div
            className={styles.ledgerRow}
            data-actions={Boolean(editHref || galleryHref)}
            data-count={tiles.length > 0}
          >
            {tiles.length > 0 && (
              <div className={styles.ledgerCount}>
                <span className={`serif ${styles.countValue}`}>
                  {tiles.length}
                </span>
                <span className={styles.countLabel}>
                  {tiles.length === 1 ? 'Photo' : 'Photos'}
                </span>
              </div>
            )}
            {/* The link opens the gallery filtered to this country, so it says
                so. With no photos here the country may have none, and the
                gallery would fall back to All, so the label stays general. */}
            {galleryHref && (
              <Link href={galleryHref} className={styles.ledgerLink}>
                <NavIcon name="gallery" size={18} />
                <span>
                  {tiles.length > 0
                    ? `All photos from ${country}`
                    : 'View full gallery'}
                </span>
              </Link>
            )}
            {editHref && (
              <Link
                href={editHref}
                className={`${styles.ledgerLink} ${styles.edit}`}
              >
                Edit this memory
              </Link>
            )}
          </div>
        </section>
      )}

      <section className={styles.story}>
        {paragraphs.length > 0 ? (
          paragraphs.map((block, index) => (
            <p key={index} className={`serif ${styles.paragraph}`}>
              {block}
            </p>
          ))
        ) : (
          <p className={`serif ${styles.empty}`}>No story written yet.</p>
        )}
      </section>

      <section className={styles.photos}>
        <h2 className={styles.photosHeading}>Photographs</h2>
        {tiles.length > 0 ? (
          <PhotoGrid
            photos={tiles}
            variant="grid3"
            title={placeName}
            meta={formatTripDates(dateStart, dateEnd)}
          />
        ) : (
          <div className={styles.noPhotos}>
            <p className={`serif ${styles.empty}`}>No photos yet.</p>
          </div>
        )}
      </section>

      {neighbours && (
        <nav className={styles.pager} aria-label="Other journeys">
          <Link
            href={`/trip/${neighbours.prev.id}`}
            className={styles.pagerLink}
          >
            <span className={styles.pagerArrow} aria-hidden="true">
              ←
            </span>
            <span className="serif">{neighbours.prev.placeName}</span>
          </Link>
          <Link
            href={`/trip/${neighbours.next.id}`}
            className={styles.pagerLink}
          >
            <span className="serif">{neighbours.next.placeName}</span>
            <span className={styles.pagerArrow} aria-hidden="true">
              →
            </span>
          </Link>
        </nav>
      )}
    </main>
  );
}
