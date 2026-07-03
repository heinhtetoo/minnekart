import { db } from '@/db';
import { getSessionUser } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';
import { consumeRateLimit } from '@/lib/auth/rate-limit';
import { searchPlaces } from '@/lib/geocode';

const MINUTE_MS = 60 * 1000;
const REQUESTS_PER_MINUTE = 20;

export async function GET(request: Request): Promise<Response> {
  const database = db();
  const user = await getSessionUser(database, request);
  if (!user) {
    return jsonResponse({ error: 'unauthenticated' }, 401);
  }

  const query = new URL(request.url).searchParams.get('q') ?? '';
  if (query.trim().length === 0) {
    return jsonResponse({ results: [] }, 200);
  }

  const withinLimit = await consumeRateLimit(
    database,
    `geocode:${user.id}`,
    REQUESTS_PER_MINUTE,
    MINUTE_MS,
  );
  if (!withinLimit) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const results = await searchPlaces(query);
  return jsonResponse({ results }, 200);
}
