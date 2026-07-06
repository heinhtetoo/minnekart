import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';

import { db } from '@/db';
import { trips as tripsTable } from '@/db/schema';
import { formatTripDates } from '@/components/home/format';
import AppPage from '@/components/layout/AppPage';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { coverGradient } from '@/lib/photos/gradient';
import { tripCovers } from '@/lib/trips/covers';

import styles from './timeline.module.css';

export default async function TimelinePage() {
  const user = await requireVerifiedPageUser();
  const database = db();

  const trips = await database
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.userId, user.id))
    .orderBy(desc(tripsTable.dateStart), desc(tripsTable.createdAt));
  const covers = await tripCovers(user.id);

  return (
    <AppPage user={{ name: user.name, email: user.email, isOwner: user.role === 'owner' }} width="wide">
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Chronology</p>
          <h1 className={`serif ${styles.title}`}>The timeline</h1>
          <p className={styles.lede}>
            Every place you&apos;ve pinned, newest first.
          </p>
        </header>

        {trips.length === 0 ? (
          <p className={styles.empty}>
            No memories yet.{' '}
            <Link href="/trip/new" className="authlink">
              Add your first place
            </Link>
            .
          </p>
        ) : (
          <div className={styles.thread}>
            <div className={styles.line} />
            {trips.map((trip) => {
              const cover = covers.get(trip.id);
              return (
                <div key={trip.id} className={styles.entry}>
                  <span className={styles.dot} />
                  <Link href={`/trip/${trip.id}`} className={styles.card}>
                    <span
                      className={styles.thumb}
                      style={
                        cover?.thumbUrl
                          ? { backgroundImage: `url(${cover.thumbUrl})` }
                          : { background: coverGradient(trip.id) }
                      }
                    />
                    <span className={styles.body}>
                      <span className={styles.meta}>
                        {formatTripDates(trip.dateStart, trip.dateEnd)} ·{' '}
                        {trip.country}
                      </span>
                      <span className={`serif ${styles.place}`}>
                        {trip.placeName}
                      </span>
                      {trip.highlight && (
                        <span className={styles.highlight}>
                          {trip.highlight}
                        </span>
                      )}
                      <span className={styles.open}>
                        {cover?.count ?? 0} photos · Open journey →
                      </span>
                    </span>
                  </Link>
                </div>
              );
            })}
            <span className={styles.endDot} />
            <p className={styles.endNote}>Where the story begins.</p>
          </div>
        )}
      </div>
    </AppPage>
  );
}
