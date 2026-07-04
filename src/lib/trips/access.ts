import { and, eq } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { trips } from '@/db/schema';

export async function getOwnedTrip(
  database: DatabaseExecutor,
  tripId: string,
  userId: string,
) {
  const [trip] = await database
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)));
  return trip ?? null;
}
