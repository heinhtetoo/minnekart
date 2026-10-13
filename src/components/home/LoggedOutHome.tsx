'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import demoTrips from '@/data/demo-trips.json';
import { computeStats } from '@/lib/trips/stats';
import AuthCard, { AuthCardHandle } from '@/components/auth/AuthCard';
import Globe, { GLOBE_MAX_ZOOM, GlobePin } from '@/components/globe/Globe';
import Wordmark from '@/components/brand/Wordmark';
import Footer from '@/components/layout/Footer';

import styles from './LoggedOutHome.module.css';
import StatCell from './StatCell';

const pins: GlobePin[] = demoTrips.map((trip, index) => ({
  id: String(index),
  lng: trip.lng,
  lat: trip.lat,
  placeName: trip.placeName,
}));

const demoStats = computeStats(
  demoTrips.map((trip) => ({
    country: trip.country,
    placeName: trip.placeName,
    dateStart: trip.dateStart,
    dateEnd: trip.dateEnd,
  })),
  0,
);

interface LoggedOutHomeProps {
  invite?: string;
  openSignup?: boolean;
  turnstileSiteKey?: string;
  startOnSignup?: boolean;
}

export default function LoggedOutHome({
  invite,
  openSignup,
  turnstileSiteKey,
  startOnSignup,
}: LoggedOutHomeProps) {
  const authRef = useRef<AuthCardHandle>(null);
  const getStartedRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const canvas = useGlobeCanvas();

  // The page steps back as the globe grows, as on the signed-in home: 0 at
  // rest, 1 fully zoomed in. Written straight to a CSS variable.
  const onZoom = useCallback((zoom: number) => {
    const progress = Math.min(
      1,
      Math.max(0, (zoom - 1) / (GLOBE_MAX_ZOOM - 1)),
    );
    mainRef.current?.style.setProperty('--zoom', progress.toFixed(3));
  }, []);

  function scrollToAuth() {
    getStartedRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  function startSignup() {
    authRef.current?.openSignup();
    scrollToAuth();
  }

  function startLogin() {
    authRef.current?.openLogin();
    scrollToAuth();
  }

  return (
    <main ref={mainRef} className={`fade ${styles.page}`}>
      <header className={styles.mobileAuthHeader}>
        <Wordmark />
        <div className={styles.mobileAuthActions}>
          <button
            type="button"
            className={styles.mobileSignIn}
            onClick={startLogin}
          >
            Sign in
          </button>
          <button
            type="button"
            className={styles.mobileSignUp}
            onClick={startSignup}
          >
            Sign up
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.head}>
          <div className={styles.wordmark}>
            <Wordmark />
          </div>
          <p className={styles.eyebrow}>The World, Tagged</p>
          <h1 className={`serif ${styles.title}`}>
            Your journeys, <em>mapped.</em>
          </h1>
        </div>
        <p className={styles.lede}>
          Every pin a story. Spin the globe, revisit the places that shaped you,
          and keep the memories close.
        </p>

        <div className={styles.globeSlot}>
          <div className={styles.globeAnchor}>
            {/*
              No idle spin on touch here: the auth card sits beside this globe,
              and the spin's continuous redraw is what made its taps need
              repeating on iOS. Every other globe keeps it.
            */}
            <Globe
              pins={pins}
              accent="var(--spot)"
              width={canvas}
              height={canvas}
              spinOnTouch={false}
              onZoom={onZoom}
            />
          </div>
        </div>

        <div ref={getStartedRef} id="get-started" className={styles.side}>
          <AuthCard
            ref={authRef}
            invite={invite}
            openSignup={openSignup}
            turnstileSiteKey={turnstileSiteKey}
            startOnSignup={startOnSignup}
          />
          <p className={styles.hint}>
            Drag the globe to spin it · choose any pin to zoom in on a sample
            place.
          </p>
        </div>
      </section>

      <div className={styles.after}>
        <div className={styles.wrap}>
          <div className={styles.ledger}>
            <StatCell value={String(demoTrips.length)} label="Sample places" />
            <StatCell value={String(demoStats.countries)} label="Countries" />
            <StatCell value={String(demoStats.years)} label="Years" />
            <StatCell value="$0" label="Free forever" />
          </div>

          <section className={styles.how}>
            <div className={styles.howHead}>
              <p className={styles.eyebrow}>How it works</p>
              <h2 className={`serif ${styles.howTitle}`}>
                Everything your travels deserve
              </h2>
              <p className={styles.howLine}>
                A living globe that remembers every place you&apos;ve stood —
                and every photograph you took there.
              </p>
            </div>
            <div className={styles.cards3}>
              <HowCard
                icon={<PinIcon />}
                title="Pin every place"
                body="Drop a pin the moment you arrive. Your globe fills in as you go, spin it any time to see it all."
              />
              <HowCard
                icon={<PhotoIcon />}
                title="Relive the journey"
                body="Every pin opens into the story, the dates, and the photographs — a gallery and timeline built as you travel."
              />
              <HowCard
                icon={<LockIcon />}
                title="Yours, kept close"
                body="Private by default — no ad trackers, no analytics, and it never follows your live location. Just your places, kept close."
              />
            </div>
            <div className={styles.cta}>
              <button type="button" className="button" onClick={startSignup}>
                Create your Minnekart — it&apos;s free
              </button>
            </div>
          </section>
        </div>
      </div>

      <Footer loggedIn={false} />
    </main>
  );
}

// The canvas is sized so the globe's resting radius matches the layout in
// LoggedOutHome.module.css (--radius), exactly as on the signed-in home.
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

function PinIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14 25s8-7.6 8-14a8 8 0 10-16 0c0 6.4 8 14 8 14z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="11" r="2.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="6.5"
        width="20"
        height="16"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="12" r="1.8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 20l5.6-5 4.4 3.8 3-2.6 6 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="12"
        width="16"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M9.5 12V9a4.5 4.5 0 019 0v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}

function HowCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className={styles.howCard}>
      <span className={styles.howIcon}>{icon}</span>
      <h3 className={`serif ${styles.howCardTitle}`}>{title}</h3>
      <p className={styles.howBody}>{body}</p>
    </div>
  );
}
