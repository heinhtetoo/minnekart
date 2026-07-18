'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import Globe, { GlobePin } from '@/components/globe/Globe';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import { coverGradient } from '@/lib/photos/gradient';
import { TripDTO } from '@/lib/trips/dto';
import { TripStats } from '@/lib/trips/stats';

import styles from './Home.module.css';
import { formatTripDates } from './format';
import StatCell from './StatCell';

export interface HomeTrip extends TripDTO {
  photoCount: number;
  thumbUrl: string | null;
}

function coverStyle(trip: HomeTrip) {
  return trip.thumbUrl
    ? { backgroundImage: `url(${trip.thumbUrl})` }
    : { background: coverGradient(trip.id) };
}

interface LoggedInHomeProps {
  user: { name: string; email: string; isOwner?: boolean };
  trips: HomeTrip[];
  featured: HomeTrip[];
  stats: TripStats;
}

export default function LoggedInHome({
  user,
  trips,
  featured,
  stats,
}: LoggedInHomeProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const trip = selected === null ? null : trips[selected];

  const pins: GlobePin[] = trips.map((item, index) => ({
    id: String(index),
    lng: item.lng,
    lat: item.lat,
    placeName: item.placeName,
  }));

  return (
    <>
      <TopNav name={user.name} email={user.email} isOwner={user.isOwner} />
      <main
        className="fade"
        style={{ isolation: 'isolate', paddingBottom: 24 }}
      >
        <section className={styles.intro}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 4,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              margin: '0 0 14px',
            }}
          >
            Your world so far
          </p>
          <h1
            className="serif"
            style={{
              fontSize: 'clamp(34px,6vw,60px)',
              fontWeight: 700,
              color: 'var(--foreground)',
              margin: 0,
              lineHeight: 1.04,
              letterSpacing: '-1.5px',
            }}
          >
            Welcome back,{' '}
            <em style={{ color: 'var(--accent)', fontWeight: 400 }}>
              {firstName(user.name)}.
            </em>
          </h1>
        </section>

        <section className={styles.hero}>
          <div className={styles.globeLayer}>
            <Globe
              pins={pins}
              width={960}
              height={960}
              focusId={selected === null ? null : String(selected)}
              onSelect={(id) => setSelected(Number(id))}
            />
          </div>
          <div className={styles.formWrap}>
            {trips.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <DetailCard
                  key={trip ? trip.id : 'empty'}
                  trip={trip}
                  onReset={() => setSelected(null)}
                />
                <PinsList
                  trips={trips}
                  selected={selected}
                  onSelect={setSelected}
                />
              </>
            )}
          </div>
        </section>

        <section
          className={styles.band}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className={styles.stats}>
            <StatCell value={String(stats.countries)} label="Countries" />
            <StatCell value={String(stats.cities)} label="Cities" bordered />
            <StatCell value={String(stats.photos)} label="Photos" bordered />
            <StatCell value={String(stats.years)} label="Years" bordered />
          </div>
        </section>

        {featured.length > 0 && <FeaturedSection featured={featured} />}
      </main>
      <div className={styles.footerHolder}>
        <Footer loggedIn />
      </div>
      <BottomNav />
    </>
  );
}

function PinsList({
  trips,
  selected,
  onSelect,
}: {
  trips: HomeTrip[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [trips.length]);

  return (
    <div className={styles.pinsBlock}>
      <div className={styles.pinsHead}>
        <span className={styles.pinsLabel}>Your Pins</span>
        <span className={styles.pinsHint}>
          Drag to spin · pinch or scroll to zoom
        </span>
      </div>
      <div className={styles.pinsListWrap} data-overflow={overflowing}>
        <ul ref={listRef} className={styles.pinsList}>
          {trips.map((trip, index) => (
            <li key={trip.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={styles.pinCard}
                aria-current={selected === index}
                data-active={selected === index}
              >
                <span className={styles.pinSwatch} style={coverStyle(trip)} />
                <span className={styles.pinInfo}>
                  <span className={styles.pinName}>{trip.placeName}</span>
                  <span className={styles.pinMeta}>
                    {trip.country} ·{' '}
                    {formatTripDates(trip.dateStart, trip.dateEnd)}
                  </span>
                </span>
                <span className={styles.pinCount}>{trip.photoCount}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DetailCard({
  trip,
  onReset,
}: {
  trip: HomeTrip | null;
  onReset: () => void;
}) {
  if (!trip) {
    return (
      <div className={`fade ${styles.detailCard}`}>
        <div className={styles.detailTop}>
          <span className={styles.detailLabel}>
            <span className={styles.detailDot} />
            Highlight
          </span>
        </div>
        <p className={`serif ${styles.detailPrompt}`}>
          Click any pin on the globe — or in the list — to relive a memory.
        </p>
      </div>
    );
  }

  return (
    <div className={`fade ${styles.detailCard}`}>
      <div className={styles.detailTop}>
        <span className={styles.detailLabel}>
          <span className={styles.detailDot} />
          {trip.country} · {formatTripDates(trip.dateStart, trip.dateEnd)}
        </span>
        <button type="button" className={styles.detailReset} onClick={onReset}>
          Reset view
        </button>
      </div>
      <div className={styles.detailBody}>
        <span className={styles.detailThumb} style={coverStyle(trip)} />
        <div className={styles.detailMain}>
          <div className={`serif ${styles.detailName}`}>{trip.placeName}</div>
          {trip.highlight && (
            <p className={`serif ${styles.detailQuote}`}>“{trip.highlight}”</p>
          )}
          <div className={styles.detailFoot}>
            <span className={styles.detailPhotos}>
              {trip.photoCount} photos
            </span>
            <Link href={`/trip/${trip.id}`} className={styles.detailOpen}>
              Open journey →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedSection({ featured }: { featured: HomeTrip[] }) {
  return (
    <section className={styles.featuredSection}>
      <div className={styles.featuredHead}>
        <h2 className={`serif ${styles.featuredTitle}`}>Featured journeys</h2>
        <Link href="/timeline" className={styles.featuredSeeAll}>
          See all on the timeline →
        </Link>
      </div>
      <div className={styles.featuredGrid}>
        {featured.map((trip) => (
          <Link
            key={trip.id}
            href={`/trip/${trip.id}`}
            className={styles.featuredCard}
          >
            <div className={styles.featuredBanner} style={coverStyle(trip)}>
              <span className={styles.countryPill}>{trip.country}</span>
            </div>
            <div className={styles.featuredBody}>
              <div className={styles.featuredRow}>
                <span className={`serif ${styles.featuredName}`}>
                  {trip.placeName}
                </span>
                <span className={styles.featuredDate}>
                  {formatTripDates(trip.dateStart, trip.dateEnd)}
                </span>
              </div>
              {trip.highlight && (
                <p className={styles.featuredHighlight}>{trip.highlight}</p>
              )}
              <div className={styles.featuredFoot}>
                <span className={styles.featuredPhotos}>
                  {trip.photoCount} photos
                </span>
                <span className={styles.featuredOpen}>Open journey →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <p className={styles.panelTitle}>Your globe is waiting</p>
      <p className={styles.emptyBody}>
        You haven&apos;t pinned a place yet. Add your first trip and it will
        light up here, ready to spin.
      </p>
    </div>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
