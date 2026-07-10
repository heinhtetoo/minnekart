import { desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { trips } from '@/db/schema';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import { FREE_TRIP_LIMIT } from '@/lib/billing/limits';
import { createTripSchema } from '@/lib/trips/validation';

export async function POST(request: Request): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }

  const parsed = createTripSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const { placeName, country, lat, lng, dateStart, dateEnd, highlight, story } =
    parsed.data;

  if (guard.user.plan === 'free') {
    const [{ count }] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(trips)
      .where(eq(trips.userId, guard.user.id));
    if (count >= FREE_TRIP_LIMIT) {
      return jsonResponse({ error: 'trip_limit_reached' }, 409);
    }
  }

  const [trip] = await database
    .insert(trips)
    .values({
      userId: guard.user.id,
      placeName,
      country,
      lat,
      lng,
      dateStart,
      dateEnd: dateEnd ?? null,
      highlight: highlight ?? null,
      story: story ?? null,
    })
    .returning();

  return jsonResponse({ trip }, 201);
}

export async function GET(request: Request): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }

  const owned = await database
    .select()
    .from(trips)
    .where(eq(trips.userId, guard.user.id))
    .orderBy(desc(trips.dateStart), desc(trips.createdAt));

  return jsonResponse({ trips: owned }, 200);
}
