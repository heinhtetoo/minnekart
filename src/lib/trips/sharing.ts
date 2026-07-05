import { and, desc, eq } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { trips, users } from '@/db/schema';

export async function getTripByShareToken(
  database: DatabaseExecutor,
  token: string,
) {
  if (!token.trim()) {
    return null;
  }
  const [trip] = await database
    .select()
    .from(trips)
    .where(eq(trips.shareToken, token));
  return trip ?? null;
}

export async function getPublicUser(
  database: DatabaseExecutor,
  username: string,
) {
  if (!username.trim()) {
    return null;
  }
  const [user] = await database
    .select()
    .from(users)
    .where(and(eq(users.username, username), eq(users.globePublic, true)));
  return user ?? null;
}

export function getPublicTrips(database: DatabaseExecutor, userId: string) {
  return database
    .select()
    .from(trips)
    .where(and(eq(trips.userId, userId), eq(trips.isPublic, true)))
    .orderBy(desc(trips.dateStart), desc(trips.createdAt));
}

export async function getPublicTrip(
  database: DatabaseExecutor,
  userId: string,
  tripId: string,
) {
  const [trip] = await database
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.id, tripId),
        eq(trips.userId, userId),
        eq(trips.isPublic, true),
      ),
    );
  return trip ?? null;
}
