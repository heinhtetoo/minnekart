import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { db } from '@/db';
import { trips as tripsTable } from '@/db/schema';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import TripDetailBody from '@/components/trips/TripDetailBody';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { loadTripTiles } from '@/lib/photos/tiles';
import { getOwnedTrip } from '@/lib/trips/access';

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const user = await requireVerifiedPageUser();
  const { id } = await params;

  const trip = await loadOwnedTrip(id, user.id);
  if (!trip) {
    notFound();
  }

  const tiles = await loadTripTiles(id);
  const neighbours = await loadNeighbours(user.id, id);

  return (
    <>
      <TopNav name={user.name} email={user.email} />
      <TripDetailBody
        tripId={trip.id}
        placeName={trip.placeName}
        country={trip.country}
        dateStart={trip.dateStart}
        dateEnd={trip.dateEnd}
        highlight={trip.highlight}
        story={trip.story}
        tiles={tiles}
        backHref="/"
        backLabel="← Back to globe"
        editHref={`/trip/${id}/edit`}
        neighbours={neighbours}
      />
      <BottomNav />
    </>
  );
}

async function loadOwnedTrip(id: string, userId: string) {
  try {
    return await getOwnedTrip(db(), id, userId);
  } catch {
    return null;
  }
}

async function loadNeighbours(userId: string, tripId: string) {
  const rows = await db()
    .select({ id: tripsTable.id, placeName: tripsTable.placeName })
    .from(tripsTable)
    .where(eq(tripsTable.userId, userId))
    .orderBy(desc(tripsTable.dateStart), desc(tripsTable.createdAt));
  if (rows.length < 2) {
    return null;
  }
  const index = rows.findIndex((row) => row.id === tripId);
  if (index === -1) {
    return null;
  }
  return {
    prev: rows[(index - 1 + rows.length) % rows.length],
    next: rows[(index + 1) % rows.length],
  };
}
