import type { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { db } from '@/db';
import { users } from '@/db/schema';
import PublicTripView from '@/components/public/PublicTripView';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { loadTripTiles } from '@/lib/photos/tiles';
import { publicTripMetadata } from '@/lib/trips/public-meta';
import { getTripByShareToken } from '@/lib/trips/sharing';

interface SharedTripPageProps {
  params: Promise<{ token: string }>;
}

async function resolve(token: string) {
  const trip = await getTripByShareToken(db(), token);
  if (!trip) {
    return null;
  }
  const [owner] = await db()
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, trip.userId));
  const tiles = await loadTripTiles(trip.id);
  return { trip, ownerName: owner?.name ?? 'Someone', tiles };
}

export async function generateMetadata({
  params,
}: SharedTripPageProps): Promise<Metadata> {
  const { token } = await params;
  const resolved = await resolve(token);
  if (!resolved) {
    return { title: 'Memory not found · Minnekart' };
  }
  // Keep share links out of search results, but let preview crawlers fetch the
  // page so the card still renders — robots.txt disallow would block both.
  return {
    ...publicTripMetadata(resolved.trip),
    robots: { index: false, follow: false },
  };
}

export default async function SharedTripPage({ params }: SharedTripPageProps) {
  const { token } = await params;
  const [resolved, viewer] = await Promise.all([
    resolve(token),
    getServerSessionUser(),
  ]);
  if (!resolved) {
    notFound();
  }

  return (
    <PublicTripView
      ownerName={resolved.ownerName}
      viewerLoggedIn={viewer !== null}
      backHref="/"
      backLabel="← Minnekart"
      trip={resolved.trip}
      tiles={resolved.tiles}
    />
  );
}
