import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { trips } from '@/db/schema';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import { updateTripSchema } from '@/lib/trips/validation';

type Context = { params: Promise<{ id: string }> };

export async function GET(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id } = await params;

  const [trip] = await database
    .select()
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, guard.user.id)));
  if (!trip) {
    return jsonResponse({ error: 'not_found' }, 404);
  }
  return jsonResponse({ trip }, 200);
}

export async function PATCH(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id } = await params;

  const parsed = updateTripSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const [updated] = await database
    .update(trips)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(trips.id, id), eq(trips.userId, guard.user.id)))
    .returning();
  if (!updated) {
    return jsonResponse({ error: 'not_found' }, 404);
  }
  return jsonResponse({ trip: updated }, 200);
}

export async function DELETE(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id } = await params;

  const deleted = await database
    .delete(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, guard.user.id)))
    .returning({ id: trips.id });
  if (deleted.length === 0) {
    return jsonResponse({ error: 'not_found' }, 404);
  }
  return jsonResponse({ ok: true }, 200);
}
