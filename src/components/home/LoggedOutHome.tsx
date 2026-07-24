'use client';

import { ReactNode, useRef } from 'react';

import demoTrips from '@/data/demo-trips.json';
import { computeStats } from '@/lib/trips/stats';
import AuthCard, { AuthCardHandle } from '@/components/auth/AuthCard';
import Globe, { GlobePin } from '@/components/globe/Globe';
import Wordmark from '@/components/brand/Wordmark';
import Footer from '@/components/layout/Footer';

import styles from './Home.module.css';
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
    <main className="fade" style={{ isolation: 'isolate' }}>
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
      <section className={styles.intro}>
        <div className={styles.introWordmark} style={{ marginBottom: 34 }}>
          <Wordmark />
        </div>
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
          The World, Tagged
        </p>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(44px,8vw,84px)',
            fontWeight: 700,
            color: 'var(--foreground)',
            margin: 0,
            lineHeight: 1.02,
            letterSpacing: '-2px',
            maxWidth: 760,
          }}
        >
          Your journeys,{' '}
          <em style={{ color: 'var(--accent)', fontWeight: 400 }}>mapped.</em>
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'var(--muted)',
            margin: '20px 0 0',
            maxWidth: 440,
            lineHeight: 1.6,
            fontWeight: 300,
          }}
        >
          Every pin a story. Spin the globe, revisit the places that shaped you,
          and keep the memories close.
        </p>
      </section>

      <section className={styles.hero}>
        <div className={styles.globeLayer}>
          <Globe pins={pins} width={960} height={960} />
        </div>
        <div ref={getStartedRef} id="get-started" className={styles.formWrap}>
          <AuthCard
            ref={authRef}
            invite={invite}
            openSignup={openSignup}
            turnstileSiteKey={turnstileSiteKey}
            startOnSignup={startOnSignup}
          />
          <p
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--muted)',
              margin: '14px 0 0',
              fontStyle: 'italic',
            }}
          >
            Drag the globe to spin it · click any pin to zoom in on a sample
            place.
          </p>
        </div>
      </section>

      <section
        className={styles.band}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div className={styles.stats}>
          <StatCell value={String(demoTrips.length)} label="Sample places" />
          <StatCell
            value={String(demoStats.countries)}
            label="Countries"
            bordered
          />
          <StatCell value={String(demoStats.years)} label="Years" bordered />
          <StatCell value="$0" label="Free forever" bordered />
        </div>
      </section>

      <section
        className={styles.section}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div
          style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 44px' }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 4,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              margin: '0 0 12px',
            }}
          >
            How it works
          </p>
          <h2
            className="serif"
            style={{
              fontSize: 'clamp(26px,4vw,38px)',
              fontWeight: 600,
              color: 'var(--foreground)',
              margin: '0 0 12px',
              letterSpacing: '-0.8px',
            }}
          >
            Everything your travels deserve
          </h2>
          <p
            style={{
              fontSize: 15,
              color: 'var(--muted)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            A living globe that remembers every place you&apos;ve stood — and
            every photograph you took there.
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
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button
            type="button"
            className="button"
            onClick={startSignup}
            style={{ width: 'auto', padding: '13px 32px' }}
          >
            Create your Minnekart — it&apos;s free
          </button>
        </div>
      </section>

      <Footer loggedIn={false} />
    </main>
  );
}

function PinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"
        stroke="var(--accent)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.4" stroke="var(--accent)" strokeWidth="1.7" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="6"
        width="16"
        height="13"
        rx="2.2"
        stroke="var(--accent)"
        strokeWidth="1.7"
      />
      <path
        d="M4 15l4.5-4 3.5 3 3-2.5L20 15.5"
        stroke="var(--accent)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="10" r="1.5" fill="var(--accent)" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2.2"
        stroke="var(--accent)"
        strokeWidth="1.7"
      />
      <path
        d="M8.5 10V7.5a3.5 3.5 0 017 0V10"
        stroke="var(--accent)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
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
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '28px 26px',
        border: '1px solid rgba(28,25,23,.07)',
        boxShadow: '0 2px 12px rgba(28,25,23,.05)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 13,
          background: 'var(--accent-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        {icon}
      </div>
      <h3
        className="serif"
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--foreground)',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 14,
          color: 'var(--muted)',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  );
}
