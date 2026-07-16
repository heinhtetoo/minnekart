import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { deleteAccount } from '@/lib/account/delete';
import { requireOwner } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';
import { storage } from '@/lib/storage';

type Context = { params: Promise<{ id: string }> };

export async function DELETE(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireOwner(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id } = await params;

  const [target] = await database.select().from(users).where(eq(users.id, id));
  if (!target) {
    return jsonResponse({ error: 'not_found' }, 404);
  }
  if (target.role === 'owner') {
    return jsonResponse({ error: 'owner_undeletable' }, 403);
  }

  await deleteAccount(database, storage(), target);

  return jsonResponse({ ok: true }, 200);
}
