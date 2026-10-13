import type { Metadata } from 'next';
import Link from 'next/link';
import { count, eq } from 'drizzle-orm';

import { db } from '@/db';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import { photos, trips } from '@/db/schema';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { signedPhotoFor } from '@/lib/photos/library';
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
  const [stats, cardPhoto] = await Promise.all([
    loadStatsFor(user.id),
    user.profilePhotoId
      ? signedPhotoFor(user.id, user.profilePhotoId)
      : Promise.resolve(null),
  ]);
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
        {/* Portrait print: a centred title page. The profile photo is a framed
            print with the initial as a seal on its corner; without a photo the
            print holds the initial on a Dusk gradient. */}
        <section className={styles.page}>
          <p className={styles.eyebrow}>Profile</p>

          <div className={styles.printWrap}>
            <div className={styles.print}>
              {cardPhoto ? (
                <div
                  className={styles.photo}
                  style={{ backgroundImage: `url(${cardPhoto.displayUrl})` }}
                />
              ) : (
                <div className={`serif ${styles.photo} ${styles.noPhoto}`}>
                  {initial}
                </div>
              )}
            </div>
            {cardPhoto && (
              <div className={`serif ${styles.seal}`}>{initial}</div>
            )}
          </div>

          <div className={`serif ${styles.name}`}>{user.name}</div>
          {user.tagline && (
            <div className={`serif ${styles.tagline}`}>{user.tagline}</div>
          )}

          <div className={styles.ornament} aria-hidden="true">
            <span />
          </div>

          {hasStory ? (
            <>
              {headline && (
                <h1 className={`serif ${styles.title}`}>{headline}</h1>
              )}
              {bioParagraphs.length > 0 && (
                <div className={styles.bio}>
                  {bioParagraphs.map((paragraph, index) => (
                    <p key={index} className={`serif ${styles.body}`}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className={`serif ${styles.title}`}>
                Your story, in your words
              </h1>
              <p className={`serif ${styles.storyPrompt}`}>
                Add a headline and a few lines about your travels — they&apos;ll
                live here, beside your globe.
              </p>
              <Link href="/settings" className={styles.storyLink}>
                Write your story →
              </Link>
            </>
          )}

          {/* The same four stats, in the same ruled row, as the home page. */}
          <div className={styles.stats}>
            <Stat value={stats.countries} label="Countries" />
            <Stat value={stats.cities} label="Cities" />
            <Stat value={stats.photos} label="Photos" />
            <Stat value={stats.years} label="Years" />
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={styles.stat}>
      <div className={`serif ${styles.statValue}`}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}
