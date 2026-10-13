import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';

import { db } from '@/db';
import { trips as tripsTable } from '@/db/schema';
import { formatPhotoCount, formatTripDates } from '@/components/home/format';
import AppPage from '@/components/layout/AppPage';
import form from '@/components/ui/Form.module.css';
import NavIcon from '@/components/nav/navIcons';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { coverGradient } from '@/lib/photos/gradient';
import { tripCovers } from '@/lib/trips/covers';

import styles from './timeline.module.css';

export default async function TimelinePage() {
  const user = await requireVerifiedPageUser();
  const database = db();

  const [trips, covers] = await Promise.all([
    database
      .select()
      .from(tripsTable)
      .where(eq(tripsTable.userId, user.id))
      .orderBy(desc(tripsTable.dateStart), desc(tripsTable.createdAt)),
    tripCovers(user.id),
  ]);

  return (
    <AppPage
      user={{
        name: user.name,
        email: user.email,
        isOwner: user.role === 'owner',
      }}
      width="wide"
    >
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
            <Link href="/trip/new" className={`${form.link} ${styles.link}`}>
              Add your first place
            </Link>
            .
          </p>
        ) : (
          <div className={styles.thread}>
            {byStartYear(trips).map(({ year, items }) => (
              <section key={year} className={styles.year}>
                <h2 className={`serif ${styles.yearLabel}`}>{year}</h2>
                <div className={styles.rows}>
                  {items.map((trip) => {
                    const cover = covers.get(trip.id);
                    const photos = formatPhotoCount(cover?.count ?? 0);
                    return (
                      <Link
                        key={trip.id}
                        href={`/trip/${trip.id}`}
                        className={styles.row}
                      >
                        <span className={styles.print}>
                          <span
                            className={styles.thumb}
                            style={
                              cover?.thumbUrl
                                ? { backgroundImage: `url(${cover.thumbUrl})` }
                                : { background: coverGradient(trip.id) }
                            }
                          />
                        </span>
                        <span className={styles.body}>
                          {/* Two unbreakable halves: if it must wrap, it wraps at the dot. */}
                          <span className={styles.meta}>
                            <span>
                              {formatTripDates(trip.dateStart, trip.dateEnd)} ·
                            </span>{' '}
                            <span>{trip.country}</span>
                          </span>
                          <span className={`serif ${styles.place}`}>
                            {trip.placeName}
                          </span>
                          {trip.highlight && (
                            <span className={`serif ${styles.highlight}`}>
                              {trip.highlight}
                            </span>
                          )}
                          <span className={styles.foot}>
                            {photos && (
                              <>
                                <span className={styles.count}>
                                  <NavIcon
                                    name="photo"
                                    size={15}
                                    strokeWidth={1.6}
                                  />
                                  {photos}
                                </span>
                                <span className={styles.sep} aria-hidden="true">
                                  ·
                                </span>
                              </>
                            )}
                            <span className={styles.open}>Open journey →</span>
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
            <p className={`serif ${styles.endNote}`}>Where the story begins.</p>
          </div>
        )}
      </div>
    </AppPage>
  );
}

// Groups the (already newest-first) trips under the year each one started.
function byStartYear<T extends { dateStart: string }>(
  trips: T[],
): { year: string; items: T[] }[] {
  const groups: { year: string; items: T[] }[] = [];
  for (const trip of trips) {
    const year = trip.dateStart.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.items.push(trip);
    else groups.push({ year, items: [trip] });
  }
  return groups;
}
