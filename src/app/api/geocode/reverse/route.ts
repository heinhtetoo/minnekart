import { db } from '@/db';
import { getSessionUser } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';
import { consumeRateLimit } from '@/lib/auth/rate-limit';
import { reverseGeocode } from '@/lib/geocode';

const MINUTE_MS = 60 * 1000;
const REQUESTS_PER_MINUTE = 20;
const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

function coordinate(raw: string | null, max: number): number | null {
  if (raw === null || raw.trim().length === 0) {
    return null;
  }
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || Math.abs(value) > max) {
    return null;
  }
  return value;
}

export async function GET(request: Request): Promise<Response> {
  const database = db();
  const user = await getSessionUser(database, request);
  if (!user) {
    return jsonResponse({ error: 'unauthenticated' }, 401);
  }

  const params = new URL(request.url).searchParams;
  const lat = coordinate(params.get('lat'), MAX_LATITUDE);
  const lng = coordinate(params.get('lng'), MAX_LONGITUDE);
  if (lat === null || lng === null) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const withinLimit = await consumeRateLimit(
    database,
    `reverse-geocode:${user.id}`,
    REQUESTS_PER_MINUTE,
    MINUTE_MS,
  );
  if (!withinLimit) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const place = await reverseGeocode(lat, lng);
  return jsonResponse({ place }, 200);
}
