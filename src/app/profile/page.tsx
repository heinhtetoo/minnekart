import type { Metadata } from 'next';
import { count, eq } from 'drizzle-orm';

import { db } from '@/db';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import { photos, trips } from '@/db/schema';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { computeStats } from '@/lib/trips/stats';

import styles from './profile.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profile · Minnekart',
  description: 'The story behind your globe of memories.',
};

function paragraphs(bio: string): string[] {
  return bio
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
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

export default async function ProfilePage() {
  const user = await requireVerifiedPageUser();
  const stats = await loadStatsFor(user.id);
  const initial = (user.name || user.username || '?')
    .trim()
    .charAt(0)
    .toUpperCase();
  const headline = user.headline?.trim() ?? '';
  const bioParagraphs = user.bio ? paragraphs(user.bio) : [];
  const hasStory = headline.length > 0 || bioParagraphs.length > 0;

  return (
    <>
      <TopNav
        name={user.name}
        email={user.email}
        isOwner={user.role === 'owner'}
      />
      <main className="fade">
        <section className={styles.grid}>
          <div className={styles.card}>
            <div>
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.cardName}>{user.name}</div>
              {user.tagline && (
                <div className={styles.cardTagline}>{user.tagline}</div>
              )}
            </div>
          </div>

          <div>
            <p className={styles.eyebrow}>Profile</p>
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
      <div className={`${styles.footerHolder} ${styles.footerHolderApp}`}>
        <Footer loggedIn />
      </div>
      <BottomNav />
    </>
  );
}
