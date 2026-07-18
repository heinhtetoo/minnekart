import { desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { trips } from '@/db/schema';
import { isVerified } from '@/lib/auth/current-user';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { openSignupEnabled } from '@/lib/auth/signup-mode';
import { env } from '@/lib/env';
import { tripCovers } from '@/lib/trips/covers';
import { toTripDTO } from '@/lib/trips/dto';
import { computeStats } from '@/lib/trips/stats';
import LoggedInHome, { HomeTrip } from '@/components/home/LoggedInHome';
import LoggedOutHome from '@/components/home/LoggedOutHome';
import VerifyScreen from '@/components/auth/VerifyScreen';

import type { Metadata } from 'next';

const DESCRIPTION =
  'A private globe of everywhere you have been. Pin each place, keep every ' +
  'photograph — no trackers, no live location. Your journeys, mapped.';

export const metadata: Metadata = {
  title: 'Minnekart — your journeys, mapped',
  description: DESCRIPTION,
  openGraph: {
    title: 'Minnekart — your journeys, mapped',
    description: DESCRIPTION,
    type: 'website',
  },
};

interface HomeProps {
  searchParams: Promise<{ invite?: string; signup?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const user = await getServerSessionUser();
  const { invite, signup } = await searchParams;

  if (!user) {
    return (
      <LoggedOutHome
        invite={invite}
        openSignup={openSignupEnabled()}
        turnstileSiteKey={env().TURNSTILE_SITE_KEY}
        startOnSignup={signup === '1'}
      />
    );
  }

  if (!isVerified(user)) {
    return <VerifyScreen email={user.email} />;
  }

  const database = db();
  const [owned, covers] = await Promise.all([
    database
      .select()
      .from(trips)
      .where(eq(trips.userId, user.id))
      .orderBy(desc(trips.dateStart), desc(trips.createdAt)),
    tripCovers(user.id),
  ]);

  let totalPhotos = 0;
  for (const cover of covers.values()) {
    totalPhotos += cover.count;
  }

  const toHomeTrip = (row: (typeof owned)[number]): HomeTrip => ({
    ...toTripDTO(row),
    photoCount: covers.get(row.id)?.count ?? 0,
    thumbUrl: covers.get(row.id)?.thumbUrl ?? null,
  });

  const stats = computeStats(owned, totalPhotos);
  const featured = owned.filter((row) => row.isFeatured).slice(0, 3);

  return (
    <LoggedInHome
      user={{
        name: user.name,
        email: user.email,
        isOwner: user.role === 'owner',
      }}
      trips={owned.map(toHomeTrip)}
      featured={featured.map(toHomeTrip)}
      stats={stats}
    />
  );
}
