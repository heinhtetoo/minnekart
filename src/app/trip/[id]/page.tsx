import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { db } from '@/db';
import { trips as tripsTable } from '@/db/schema';
import pageStyles from '@/components/layout/AppPage.module.css';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/nav/BottomNav';
import TopNav from '@/components/nav/TopNav';
import TripDetailBody from '@/components/trips/TripDetailBody';
import { requireVerifiedPageUser } from '@/lib/auth/session-server';
import { loadTripTiles } from '@/lib/photos/tiles';
import { getOwnedTrip } from '@/lib/trips/access';
import { isTripId } from '@/lib/trips/ids';

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const user = await requireVerifiedPageUser();
  const { id } = await params;
  // A cut-off or malformed address: not found, before any query can fail.
  if (!isTripId(id)) {
    notFound();
  }

  const [trip, tiles, neighbours] = await Promise.all([
    loadOwnedTrip(id, user.id),
    loadTripTiles(id),
    loadNeighbours(user.id, id),
  ]);
  if (!trip) {
    notFound();
  }

  return (
    <>
      <TopNav
        name={user.name}
        email={user.email}
        isOwner={user.role === 'owner'}
      />
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
        smartBack
        editHref={`/trip/${id}/edit`}
        galleryHref={`/gallery?country=${encodeURIComponent(trip.country)}`}
        neighbours={neighbours}
      />
      <div className={pageStyles.footerHolder}>
        <Footer loggedIn />
      </div>
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
