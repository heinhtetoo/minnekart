import { count, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { photos, trips } from '@/db/schema';
import { isVerified } from '@/lib/auth/current-user';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { toTripDTO } from '@/lib/trips/dto';
import { computeStats } from '@/lib/trips/stats';
import LoggedInHome, { HomeTrip } from '@/components/home/LoggedInHome';
import LoggedOutHome from '@/components/home/LoggedOutHome';
import VerifyScreen from '@/components/auth/VerifyScreen';

interface HomeProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const user = await getServerSessionUser();
  const { invite } = await searchParams;

  if (!user) {
    return <LoggedOutHome invite={invite} />;
  }

  if (!isVerified(user)) {
    return <VerifyScreen email={user.email} />;
  }

  const database = db();
  const owned = await database
    .select()
    .from(trips)
    .where(eq(trips.userId, user.id))
    .orderBy(desc(trips.dateStart), desc(trips.createdAt));
  const photoCounts = await database
    .select({ tripId: photos.tripId, value: count() })
    .from(photos)
    .where(eq(photos.userId, user.id))
    .groupBy(photos.tripId);

  const photosByTrip = new Map(
    photoCounts.map((row) => [row.tripId, row.value]),
  );
  const totalPhotos = photoCounts.reduce((sum, row) => sum + row.value, 0);

  const toHomeTrip = (row: (typeof owned)[number]): HomeTrip => ({
    ...toTripDTO(row),
    photoCount: photosByTrip.get(row.id) ?? 0,
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
