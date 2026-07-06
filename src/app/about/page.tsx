import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { asc, count, eq } from 'drizzle-orm';

import { db } from '@/db';
import Footer from '@/components/layout/Footer';
import PublicChrome from '@/components/public/PublicChrome';
import { photos, trips, users } from '@/db/schema';
import { computeStats } from '@/lib/trips/stats';

import styles from './about.module.css';

export const dynamic = 'force-dynamic';

const TAGLINE = 'Cartographer of small moments';

export const metadata: Metadata = {
  title: 'About · Minnekart',
  description: `${TAGLINE} — the story behind this globe of memories.`,
};

async function loadOwner() {
  const database = db();
  const [owner] = await database
    .select()
    .from(users)
    .where(eq(users.role, 'owner'))
    .orderBy(asc(users.createdAt))
    .limit(1);
  if (!owner) {
    return null;
  }

  const owned = await database
    .select()
    .from(trips)
    .where(eq(trips.userId, owner.id));
  const [photoCount] = await database
    .select({ value: count() })
    .from(photos)
    .where(eq(photos.userId, owner.id));

  return { owner, stats: computeStats(owned, photoCount?.value ?? 0) };
}

export default async function AboutPage() {
  const data = await loadOwner();
  if (!data) {
    notFound();
  }
  const { owner, stats } = data;
  const initial = (owner.name || owner.username || '?')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <PublicChrome ownerName={owner.name} />
      <main className="fade">
        <section className={styles.grid}>
          <div className={styles.card}>
            <div>
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.cardName}>{owner.name}</div>
              <div className={styles.cardTagline}>{TAGLINE}</div>
            </div>
          </div>

          <div>
            <p className={styles.eyebrow}>About</p>
            <h1 className={`serif ${styles.title}`}>
              I collect places the way others collect stamps.
            </h1>
            <p className={styles.body}>
              Minnekart started as a shoebox of ticket stubs and a habit of never
              writing anything down. Now it&apos;s a living globe — every pin a
              place I&apos;ve stood, every photo a moment I&apos;d rather not
              forget.
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
      <Footer loggedIn={false} />
    </>
  );
}
