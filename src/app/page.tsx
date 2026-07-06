import { count, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { photos, trips } from '@/db/schema';
import { isVerified } from '@/lib/auth/current-user';
import { getServerSessionUser } from '@/lib/auth/session-server';
import { toTripDTO } from '@/lib/trips/dto';
import { computeStats } from '@/lib/trips/stats';
import LoggedInHome from '@/components/home/LoggedInHome';
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
  const [photoCount] = await database
    .select({ value: count() })
    .from(photos)
    .where(eq(photos.userId, user.id));

  const stats = computeStats(owned, photoCount?.value ?? 0);

  return (
    <LoggedInHome
      user={{
        name: user.name,
        email: user.email,
        isOwner: user.role === 'owner',
      }}
      trips={owned.map(toTripDTO)}
      stats={stats}
    />
  );
}
