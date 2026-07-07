import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { asc, count, eq } from 'drizzle-orm';

import { db } from '@/db';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import PublicChrome from '@/components/public/PublicChrome';
import { photos, trips, users } from '@/db/schema';
import { isVerified } from '@/lib/auth/current-user';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { computeStats } from '@/lib/trips/stats';

import styles from './about.module.css';

export const dynamic = 'force-dynamic';

const TAGLINE = 'Cartographer of small moments';

export const metadata: Metadata = {
  title: 'About · Minnekart',
  description: `${TAGLINE} — the story behind this globe of memories.`,
};

async function loadOwner() {
  const [owner] = await db()
    .select()
    .from(users)
    .where(eq(users.role, 'owner'))
    .orderBy(asc(users.createdAt))
    .limit(1);
  return owner ?? null;
}

async function loadStatsFor(userId: string) {
  const database = db();
  const owned = await database
    .select()
    .from(trips)
    .where(eq(trips.userId, userId));
  const [photoCount] = await database
    .select({ value: count() })
    .from(photos)
    .where(eq(photos.userId, userId));
  return computeStats(owned, photoCount?.value ?? 0);
}

export default async function AboutPage() {
  const viewer = await getServerSessionUser();
  const loggedIn = viewer !== null && isVerified(viewer);
  const subject = loggedIn ? viewer : await loadOwner();
  if (!subject) {
    notFound();
  }
  const stats = await loadStatsFor(subject.id);
  const initial = (subject.name || subject.username || '?')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {viewer && isVerified(viewer) ? (
        <TopNav
          name={viewer.name}
          email={viewer.email}
          isOwner={viewer.role === 'owner'}
        />
      ) : (
        <PublicChrome ownerName={subject.name} />
      )}
      <main className="fade">
        <section className={styles.grid}>
          <div className={styles.card}>
            <div>
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.cardName}>{subject.name}</div>
              <div className={styles.cardTagline}>{TAGLINE}</div>
            </div>
          </div>

          <div>
            <p className={styles.eyebrow}>About</p>
            <h1 className={`serif ${styles.title}`}>
              I collect places the way others collect stamps.
            </h1>
            <p className={styles.body}>
              Minnekart started as a shoebox of ticket stubs and a habit of
              never writing anything down. Now it&apos;s a living globe — every
              pin a place I&apos;ve stood, every photo a moment I&apos;d rather
              not forget.
            </p>
            <p className={`${styles.body} ${styles.bodyLast}`}>
              I travel slowly and photograph badly, but that&apos;s rather the
              point. This is less a highlight reel and more a memory palace you
              can spin with your thumb.
            </p>
            <div className={styles.stats}>
              <div>
                <div className={styles.statValue}>{stats.countries}</div>
                <div className={styles.statLabel}>Countries</div>
              </div>
              <div>
                <div className={styles.statValue}>{stats.photos}</div>
                <div className={styles.statLabel}>Photos</div>
              </div>
              <div>
                <div className={styles.statValue}>{stats.years}</div>
                <div className={styles.statLabel}>Years</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <div
        className={`${styles.footerHolder}${
          loggedIn ? ` ${styles.footerHolderApp}` : ''
        }`}
      >
        <Footer loggedIn={loggedIn} />
      </div>
      {loggedIn && <BottomNav />}
    </>
  );
}
