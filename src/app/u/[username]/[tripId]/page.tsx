import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { db } from '@/db';
import PublicTripView from '@/components/public/PublicTripView';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { loadTripTiles } from '@/lib/photos/tiles';
import { publicTripMetadata } from '@/lib/trips/public-meta';
import { getPublicTrip, getPublicUser } from '@/lib/trips/sharing';

interface PublicTripPageProps {
  params: Promise<{ username: string; tripId: string }>;
}

async function resolve(username: string, tripId: string) {
  const owner = await getPublicUser(db(), username);
  if (!owner) {
    return null;
  }
  const trip = await getPublicTrip(db(), owner.id, tripId);
  if (!trip) {
    return null;
  }
  const tiles = await loadTripTiles(trip.id);
  return { owner, trip, tiles };
}

export async function generateMetadata({
  params,
}: PublicTripPageProps): Promise<Metadata> {
  const { username, tripId } = await params;
  const resolved = await resolve(username, tripId);
  if (!resolved) {
    return { title: 'Memory not found · Minnekart' };
  }
  return publicTripMetadata(resolved.trip, resolved.tiles);
}

export default async function PublicTripPage({ params }: PublicTripPageProps) {
  const { username, tripId } = await params;
  const [resolved, viewer] = await Promise.all([
    resolve(username, tripId),
    getServerSessionUser(),
  ]);
  if (!resolved) {
    notFound();
  }

  return (
    <PublicTripView
      ownerName={resolved.owner.name}
      viewerLoggedIn={viewer !== null}
      backHref={`/u/${resolved.owner.username}`}
      backLabel="← Back to globe"
      trip={resolved.trip}
      tiles={resolved.tiles}
    />
  );
}
