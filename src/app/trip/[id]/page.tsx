import { asc, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { db } from '@/db';
import { photos as photosTable, trips as tripsTable } from '@/db/schema';
import { formatTripDates } from '@/components/home/format';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import PhotoGrid, { PhotoTile } from '@/components/photos/PhotoGrid';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { toSignedPhotoDTO } from '@/lib/photos/dto';
import { coverGradient } from '@/lib/photos/gradient';
import { signPhotos } from '@/lib/photos/sign';
import { storage } from '@/lib/storage';
import { getOwnedTrip } from '@/lib/trips/access';

import styles from './detail.module.css';

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const user = await requireVerifiedPageUser();
  const { id } = await params;

  const trip = await loadOwnedTrip(id, user.id);
  if (!trip) {
    notFound();
  }

  const tiles = await loadPhotoTiles(id);
  const neighbours = await loadNeighbours(user.id, id);
  const paragraphs = (trip.story ?? '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const heroStyle = tiles[0]
    ? { backgroundImage: `url(${tiles[0].displayUrl})` }
    : { background: coverGradient(trip.id) };

  return (
    <>
      <TopNav name={user.name} email={user.email} />
      <main className={`fade ${styles.main}`}>
        <section className={styles.hero} style={heroStyle}>
          <div className={styles.heroScrim} />
          <div className={styles.heroInner}>
            <Link href="/" className={styles.backPill}>
              ← Back to globe
            </Link>
            <p className={styles.heroMeta}>
              {trip.country} · {formatTripDates(trip.dateStart, trip.dateEnd)}
            </p>
            <h1 className={`serif ${styles.heroTitle}`}>{trip.placeName}</h1>
          </div>
        </section>

        <section className={styles.body}>
          <div>
            {trip.highlight && (
              <p className={`serif ${styles.quote}`}>“{trip.highlight}”</p>
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
            <DetailRow label="Destination" value={trip.placeName} />
            <DetailRow label="Country" value={trip.country} />
            <DetailRow
              label="When"
              value={formatTripDates(trip.dateStart, trip.dateEnd)}
            />
            <DetailRow label="Photos" value={String(tiles.length)} accent />
            <Link href={`/trip/${id}/edit`} className={styles.editButton}>
              Edit memory
            </Link>
          </aside>
        </section>

        <section className={styles.photos}>
          <div className={styles.photosHeading}>Photographs</div>
          {tiles.length > 0 ? (
            <PhotoGrid photos={tiles} variant="grid3" />
          ) : (
            <p className={styles.storyEmpty}>
              No photos yet —{' '}
              <Link href={`/trip/${id}/edit`} className="authlink">
                add some
              </Link>
              .
            </p>
          )}
          {neighbours && (
            <div className={styles.pager}>
              <Link href={`/trip/${neighbours.prev.id}`} className={styles.pagerLink}>
                ← {neighbours.prev.placeName}
              </Link>
              <Link href={`/trip/${neighbours.next.id}`} className={styles.pagerLink}>
                {neighbours.next.placeName} →
              </Link>
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </>
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

async function loadOwnedTrip(id: string, userId: string) {
  try {
    return await getOwnedTrip(db(), id, userId);
  } catch {
    return null;
  }
}

async function loadPhotoTiles(tripId: string): Promise<PhotoTile[]> {
  const rows = await db()
    .select()
    .from(photosTable)
    .where(eq(photosTable.tripId, tripId))
    .orderBy(asc(photosTable.position));
  const signed = await signPhotos(storage(), rows);
  return signed.map(toSignedPhotoDTO).map((photo) => ({
    id: photo.id,
    thumbUrl: photo.thumbUrl,
    displayUrl: photo.displayUrl,
    width: photo.width,
    height: photo.height,
  }));
}

async function loadNeighbours(userId: string, tripId: string) {
  const rows = await db()
    .select({ id: tripsTable.id, placeName: tripsTable.placeName })
    .from(tripsTable)
    .where(eq(tripsTable.userId, userId))
    .orderBy(desc(tripsTable.dateStart), desc(tripsTable.createdAt));
  if (rows.length < 2) {
    return null;
  }
  const index = rows.findIndex((row) => row.id === tripId);
  if (index === -1) {
    return null;
  }
  return {
    prev: rows[(index - 1 + rows.length) % rows.length],
    next: rows[(index + 1) % rows.length],
  };
}
