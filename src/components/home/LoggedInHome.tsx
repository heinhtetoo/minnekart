'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import Globe, { GLOBE_MAX_ZOOM, GlobePin } from '@/components/globe/Globe';
import stage from '@/components/globe/GlobeStage.module.css';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/nav/BottomNav';
import NavIcon from '@/components/nav/navIcons';
import TopNav from '@/components/nav/TopNav';
import { coverGradient } from '@/lib/photos/gradient';
import { TripDTO } from '@/lib/trips/dto';
import { TripStats } from '@/lib/trips/stats';

import { formatPhotoCount, formatTripDates } from './format';
import styles from './LoggedInHome.module.css';

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
  const canvas = useGlobeCanvas();
  const mainRef = useRef<HTMLElement>(null);

  // The page steps back as the globe grows: 0 at rest, 1 fully zoomed in.
  // Written straight to a CSS variable rather than state, because it changes
  // on every animation frame and nothing else needs to re-render.
  const onZoom = useCallback((zoom: number) => {
    const progress = Math.min(
      1,
      Math.max(0, (zoom - 1) / (GLOBE_MAX_ZOOM - 1)),
    );
    mainRef.current?.style.setProperty('--zoom', progress.toFixed(3));
  }, []);

  const pins: GlobePin[] = trips.map((item, index) => ({
    id: String(index),
    lng: item.lng,
    lat: item.lat,
    placeName: item.placeName,
    // Same URL the card below already requests, so the pin is a cache hit and
    // the two always show the same photo.
    thumbUrl: item.thumbUrl,
    gradientSeed: item.id,
  }));

  return (
    <>
      <TopNav name={user.name} email={user.email} isOwner={user.isOwner} />
      <main ref={mainRef} className={`fade ${stage.page}`}>
        <section className={styles.hero}>
          <div className={stage.intro}>
            <p className={stage.eyebrow}>Your world so far</p>
            <h1 className={`serif ${stage.title}`}>
              Welcome back, <em>{firstName(user.name)}.</em>
            </h1>
          </div>

          <div className={stage.globeSlot}>
            <div className={stage.globeAnchor}>
              <Globe
                pins={pins}
                accent="var(--spot)"
                width={canvas}
                height={canvas}
                focusId={selected === null ? null : String(selected)}
                onSelect={(id) => setSelected(Number(id))}
                onZoom={onZoom}
              />
            </div>
          </div>

          <div className={stage.panel}>
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

        <div className={`${stage.after} ${styles.after}`}>
          <div className={styles.wrap}>
            <div className={styles.ledger}>
              <Stat value={stats.countries} label="Countries" />
              <Stat value={stats.cities} label="Cities" />
              <Stat value={stats.photos} label="Photos" />
              <Stat value={stats.years} label="Years" />
            </div>
          </div>

          {featured.length > 0 && <FeaturedSection featured={featured} />}
        </div>
      </main>
      <div className={styles.footerHolder}>
        <Footer loggedIn />
      </div>
      <BottomNav />
    </>
  );
}

// The canvas is sized so the globe's resting radius matches the layout in
// GlobeStage.module.css (--radius): side by side above 1100px, stacked and
// sized to the screen below. The globe only fills its canvas at full zoom.
function restingRadius(viewport: number): number {
  return viewport > 1100
    ? Math.min(292, (viewport - 520) / 2.6)
    : Math.min(viewport * 0.44, 260);
}

function useGlobeCanvas(): number {
  const [radius, setRadius] = useState(292);

  useEffect(() => {
    const measure = () =>
      setRadius(Math.round(restingRadius(window.innerWidth)));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return Math.round(2 * (radius * GLOBE_MAX_ZOOM + 20));
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={`serif ${styles.statValue}`}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

// The photo icon with "1 photo" / "5 photos" (or just the number in the pins
// list). Nothing at all for a trip without photos.
function PhotoCount({ count, short }: { count: number; short?: boolean }) {
  if (count <= 0) return null;
  return (
    <span className={styles.count}>
      <NavIcon name="photo" size={16} strokeWidth={1.6} />
      {short ? count : formatPhotoCount(count)}
    </span>
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
  // Which edges fade: only where there are more pins to scroll to, so the
  // first and last rows read at full strength once you reach them.
  const [fade, setFade] = useState<'none' | 'above' | 'below' | 'both'>('none');

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => {
      const above = el.scrollTop > 1;
      const below = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      setFade(
        above && below ? 'both' : above ? 'above' : below ? 'below' : 'none',
      );
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [trips.length]);

  return (
    <div className={styles.pins}>
      <div className={styles.pinsHead}>
        <span className={styles.label}>Your Pins</span>
        <span className={styles.hint}>
          Drag to spin · pinch or scroll to zoom
        </span>
      </div>
      <ul ref={listRef} className={styles.pinsList} data-fade={fade}>
        {trips.map((trip, index) => (
          <li key={trip.id}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={styles.pinRow}
              aria-current={selected === index}
              data-active={selected === index}
            >
              <span className={`serif ${styles.pinNo}`} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className={styles.pinThumb} style={coverStyle(trip)} />
              <span className={styles.pinInfo}>
                <span className={`serif ${styles.pinName}`}>
                  {trip.placeName}
                </span>
                <span className={styles.pinMeta}>
                  {trip.country} ·{' '}
                  {formatTripDates(trip.dateStart, trip.dateEnd)}
                </span>
              </span>
              <PhotoCount count={trip.photoCount} short />
            </button>
          </li>
        ))}
      </ul>
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
      <div className={`fade ${styles.highlight}`}>
        <span className={styles.label}>
          <i className={styles.diamond} />
          Highlight
        </span>
        <p className={`serif ${styles.prompt}`}>
          Choose any pin on the globe — or in the list — to relive a memory.
        </p>
      </div>
    );
  }

  return (
    <div className={`fade ${styles.highlight}`}>
      <div className={styles.highlightTop}>
        <span className={styles.label}>
          <i className={styles.diamond} />
          {trip.country} · {formatTripDates(trip.dateStart, trip.dateEnd)}
        </span>
        <button type="button" className={styles.reset} onClick={onReset}>
          Reset view
        </button>
      </div>
      <div className={styles.detail}>
        <span className={styles.detailThumb} style={coverStyle(trip)} />
        <div>
          <div className={`serif ${styles.detailName}`}>{trip.placeName}</div>
          {trip.highlight && (
            <p className={`serif ${styles.detailQuote}`}>“{trip.highlight}”</p>
          )}
          <div className={styles.foot}>
            <PhotoCount count={trip.photoCount} />
            <Link href={`/trip/${trip.id}`} className={styles.open}>
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
    <section className={`${styles.wrap} ${styles.featured}`}>
      <div className={styles.featuredHead}>
        <h2 className={`serif ${styles.featuredTitle}`}>Featured journeys</h2>
        <Link href="/timeline" className={styles.seeAll}>
          See all on the timeline →
        </Link>
      </div>
      <div className={styles.featuredGrid}>
        {featured.map((trip) => (
          <Link key={trip.id} href={`/trip/${trip.id}`} className={styles.card}>
            <span className={styles.cardPhoto} style={coverStyle(trip)} />
            <span className={styles.cardCountry}>{trip.country}</span>
            <span className={styles.cardRow}>
              <span className={`serif ${styles.cardName}`}>
                {trip.placeName}
              </span>
              <span className={styles.cardDate}>
                {formatTripDates(trip.dateStart, trip.dateEnd)}
              </span>
            </span>
            {trip.highlight && (
              <span className={`serif ${styles.cardQuote}`}>
                {trip.highlight}
              </span>
            )}
            <span className={`${styles.foot} ${styles.cardFoot}`}>
              <PhotoCount count={trip.photoCount} />
              <span className={styles.open}>Open journey →</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className={styles.highlight}>
      <span className={styles.label}>
        <i className={styles.diamond} />
        Your globe is waiting
      </span>
      <p className={`serif ${styles.prompt}`}>
        You haven&apos;t pinned a place yet. Add your first trip and it will
        light up here, ready to spin.
      </p>
    </div>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
