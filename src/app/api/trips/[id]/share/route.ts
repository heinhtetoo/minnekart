import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { trips } from '@/db/schema';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';
import { generateToken } from '@/lib/auth/tokens';
import { env } from '@/lib/env';

type Context = { params: Promise<{ id: string }> };

function shareUrl(token: string): string {
  return `${env().APP_URL}/t/${token}`;
}

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

  const [trip] = await database
    .select()
    .from(trips)
    .where(and(eq(trips.id, id), eq(trips.userId, guard.user.id)));
  if (!trip) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  let token = trip.shareToken;
  if (!token) {
    token = generateToken();
    await database
      .update(trips)
      .set({ shareToken: token, updatedAt: new Date() })
      .where(eq(trips.id, id));
  }
  return jsonResponse({ shareToken: token, url: shareUrl(token) }, 200);
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

  const [updated] = await database
    .update(trips)
    .set({ shareToken: null, updatedAt: new Date() })
    .where(and(eq(trips.id, id), eq(trips.userId, guard.user.id)))
    .returning();
  if (!updated) {
    return jsonResponse({ error: 'not_found' }, 404);
  }
  return jsonResponse({ ok: true }, 200);
}
