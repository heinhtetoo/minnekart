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

export const metadata: Metadata = {
  title: 'About · Minnekart',
  description: 'The story behind this globe of memories.',
};

function paragraphs(bio: string): string[] {
  return bio
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

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
  const [owned, photoCountRows] = await Promise.all([
    database.select().from(trips).where(eq(trips.userId, userId)),
    database
      .select({ value: count() })
      .from(photos)
      .where(eq(photos.userId, userId)),
  ]);
  return computeStats(owned, photoCountRows[0]?.value ?? 0);
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
  const headline = subject.headline?.trim() ?? '';
  const bioParagraphs = subject.bio ? paragraphs(subject.bio) : [];
  const hasStory = headline.length > 0 || bioParagraphs.length > 0;

  return (
    <>
      {viewer && isVerified(viewer) ? (
        <TopNav
          name={viewer.name}
          email={viewer.email}
          isOwner={viewer.role === 'owner'}
        />
      ) : (
        <PublicChrome ownerName={subject.name} viewerLoggedIn={false} />
      )}
      <main className="fade">
        <section className={styles.grid}>
          <div className={styles.card}>
            <div>
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.cardName}>{subject.name}</div>
              {subject.tagline && (
                <div className={styles.cardTagline}>{subject.tagline}</div>
              )}
            </div>
          </div>

          <div>
            <p className={styles.eyebrow}>About</p>
            {hasStory ? (
              <>
                {headline && (
                  <h1 className={`serif ${styles.title}`}>{headline}</h1>
                )}
                {bioParagraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className={`${styles.body}${
                      index === bioParagraphs.length - 1
                        ? ` ${styles.bodyLast}`
                        : ''
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </>
            ) : (
              <h1 className={`serif ${styles.title}`}>Coming soon</h1>
            )}
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
