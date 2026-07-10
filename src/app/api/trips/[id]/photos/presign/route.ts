import { db } from '@/db';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import { consumeRateLimit } from '@/lib/auth/rate-limit';
import { newPhotoKeys } from '@/lib/photos/keys';
import { presignSchema } from '@/lib/photos/validation';
import { storage } from '@/lib/storage';
import { getOwnedTrip } from '@/lib/trips/access';

type Context = { params: Promise<{ id: string }> };

const MINUTE_MS = 60 * 1000;
const PRESIGNS_PER_MINUTE = 60;
const UPLOAD_EXPIRY_SECONDS = 300;

export async function POST(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id } = await params;

  const trip = await getOwnedTrip(database, id, guard.user.id);
  if (!trip) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  const parsed = presignSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const withinLimit = await consumeRateLimit(
    database,
    `presign:${guard.user.id}`,
    PRESIGNS_PER_MINUTE,
    MINUTE_MS,
  );
  if (!withinLimit) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const { contentType } = parsed.data;
  const { displayKey, thumbKey } = newPhotoKeys(
    guard.user.id,
    trip.id,
    contentType,
  );
  const store = storage();
  const [displayUploadUrl, thumbUploadUrl] = await Promise.all([
    store.presignPut(displayKey, contentType, UPLOAD_EXPIRY_SECONDS),
    store.presignPut(thumbKey, contentType, UPLOAD_EXPIRY_SECONDS),
  ]);

  return jsonResponse(
    { displayKey, thumbKey, displayUploadUrl, thumbUploadUrl },
    200,
  );
}
