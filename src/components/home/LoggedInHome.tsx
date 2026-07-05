'use client';

import { useState } from 'react';

import Globe, { GlobePin } from '@/components/globe/Globe';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import { TripDTO } from '@/lib/trips/dto';
import { TripStats } from '@/lib/trips/stats';

import styles from './Home.module.css';
import { formatTripDates } from './format';
import PeekPanel from './PeekPanel';
import StatCell from './StatCell';

interface LoggedInHomeProps {
  user: { name: string; email: string };
  trips: TripDTO[];
  stats: TripStats;
}

export default function LoggedInHome({
  user,
  trips,
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
      <TopNav name={user.name} email={user.email} />
      <main className="fade" style={{ isolation: 'isolate', paddingBottom: 24 }}>
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
              onSelect={(id) => setSelected(Number(id))}
            />
            {trip && (
              <PeekPanel
                title={trip.placeName}
                subtitle={`${trip.country} · ${formatTripDates(
                  trip.dateStart,
                  trip.dateEnd,
                )}`}
                highlight={trip.highlight}
                story={trip.story}
                href={`/trip/${trip.id}`}
                onClose={() => setSelected(null)}
              />
            )}
          </div>
          <div className={styles.formWrap}>
            {trips.length === 0 ? (
              <EmptyState />
            ) : (
              <PlacesList
                trips={trips}
                selected={selected}
                onSelect={setSelected}
              />
            )}
          </div>
        </section>

        <section
          className={styles.band}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className={styles.stats}>
            <StatCell value={String(trips.length)} label="Places" />
            <StatCell value={String(stats.countries)} label="Countries" bordered />
            <StatCell value={String(stats.years)} label="Years" bordered />
            <StatCell value={String(stats.photos)} label="Photos" bordered />
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  );
}

function PlacesList({
  trips,
  selected,
  onSelect,
}: {
  trips: TripDTO[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <div className={styles.placesPanel}>
      <p className={styles.panelTitle}>Your places</p>
      <ul className={styles.placesList}>
        {trips.map((trip, index) => (
          <li key={trip.id}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={styles.placeRow}
              aria-current={selected === index}
              data-active={selected === index}
            >
              <span>
                <span className={styles.placeName}>{trip.placeName}</span>
                <span className={styles.placeMeta}>{trip.country}</span>
              </span>
              <span className={styles.placeDates}>
                {formatTripDates(trip.dateStart, trip.dateEnd)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
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
