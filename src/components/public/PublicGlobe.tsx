'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Globe, { GLOBE_MAX_ZOOM, GlobePin } from '@/components/globe/Globe';
import stage from '@/components/globe/GlobeStage.module.css';
import { formatTripDates } from '@/components/home/format';
import { coverGradient } from '@/lib/photos/gradient';
import { TripDTO } from '@/lib/trips/dto';

import PeekPanel from './PeekPanel';
import styles from './PublicGlobe.module.css';

interface PublicGlobeProps {
  ownerName: string;
  username: string;
  trips: TripDTO[];
  viewerLoggedIn: boolean;
}

// The homes' globe stage (screens 1 and 9): the globe overflows its section,
// and the heading steps back as it zooms. Pins and list thumbnails show each
// trip's colour gradient: this page loads no photos.
export default function PublicGlobe({
  ownerName,
  username,
  trips,
  viewerLoggedIn,
}: PublicGlobeProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const trip = selected === null ? null : trips[selected];
  const canvas = useGlobeCanvas();
  const mainRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Whenever a place is chosen, its postcard takes focus (so keyboard and
  // screen-reader users land on it) and, if it isn't fully on screen — the
  // list is below the fold on phones, or the page was scrolled — the page
  // scrolls just enough to show it. The chosen pin sits at the globe's
  // centre — just above the postcard when stacked, just below it on desktop —
  // so it is kept in view too. Reduced motion jumps instead of sliding.
  useEffect(() => {
    const card = cardRef.current;
    if (selected === null || !card) return;
    card.focus({ preventScroll: true });
    const box = card.getBoundingClientRect();
    const pin = anchorRef.current?.getBoundingClientRect().top ?? box.top;
    // The postcard plus the pin and its halo, whichever side the pin is on.
    const from = Math.min(box.top, pin - 28);
    const to = Math.max(box.bottom, pin + 28);
    const header = document.querySelector('header');
    const top = (header?.getBoundingClientRect().bottom ?? 0) + 16;
    const bottom = window.innerHeight - 16;
    if (from >= top && to <= bottom) return;
    // Line the lower edge up with the bottom of the screen, which keeps both
    // in view — unless that would hide the upper one, or the postcard's top.
    let delta = to - bottom;
    if (from - delta < top) delta = from - top;
    if (box.top - delta < top) delta = box.top - top;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    window.scrollBy({ top: delta, behavior: reduce ? 'instant' : 'smooth' });
  }, [selected]);

  // 0 at rest, 1 fully zoomed in. Written straight to a CSS variable rather
  // than state, because it changes on every animation frame.
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
    gradientSeed: item.id,
  }));

  return (
    <main ref={mainRef} className={`fade ${stage.page}`}>
      <section className={styles.hero}>
        <div className={stage.intro}>
          <p className={stage.eyebrow}>A public globe</p>
          <h1
            className={`serif ${stage.title} ${styles.title}`}
            data-long={ownerName.length > 12}
          >
            {ownerName}&apos;s <em>world.</em>
          </h1>
        </div>

        <div className={stage.globeSlot}>
          <div ref={anchorRef} className={stage.globeAnchor}>
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

        {trip && (
          <div className={styles.cardSlot}>
            <PeekPanel
              ref={cardRef}
              title={trip.placeName}
              country={trip.country}
              dates={formatTripDates(trip.dateStart, trip.dateEnd)}
              year={trip.dateStart.slice(0, 4)}
              highlight={trip.highlight}
              story={trip.story}
              href={`/u/${username}/${trip.id}`}
              showSignupHook={!viewerLoggedIn}
              onClose={() => setSelected(null)}
            />
          </div>
        )}

        <div className={stage.panel}>
          {trips.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.ornament} aria-hidden="true">
                <i />
              </span>
              <p className={`serif ${styles.emptyTitle}`}>
                No public places yet
              </p>
              <p className={styles.emptyBody}>
                {/* One string: the compiler drops the space before text that
                    follows a value at the start of a line. */}
                {`${ownerName} hasn't shared any memories on this globe yet.`}{' '}
                Check back soon.
              </p>
            </div>
          ) : (
            <div className={styles.places}>
              <p className={styles.panelTitle}>Public places</p>
              <ul className={styles.placesList}>
                {trips.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(index)}
                      className={styles.placeRow}
                      aria-current={selected === index}
                      data-active={selected === index}
                    >
                      <span
                        className={styles.placeThumb}
                        style={{ background: coverGradient(item.id) }}
                      />
                      <span className={styles.placeInfo}>
                        <span className={`serif ${styles.placeName}`}>
                          {item.placeName}
                        </span>
                        <span className={styles.placeMeta}>{item.country}</span>
                      </span>
                      <span className={styles.placeDates}>
                        {formatTripDates(item.dateStart, item.dateEnd)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// The canvas is sized so the globe's resting radius matches --radius in
// GlobeStage.module.css, exactly as on both homes.
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
