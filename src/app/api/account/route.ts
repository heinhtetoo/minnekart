import { z } from 'zod';

import { db } from '@/db';
import { deleteAccount } from '@/lib/account/delete';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { clearedSessionCookieHeader } from '@/lib/auth/cookies';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import { verifyPassword } from '@/lib/auth/password';
import { storage } from '@/lib/storage';

const deleteSchema = z.object({ password: z.string().min(1) });

export async function DELETE(request: Request): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  if (guard.user.role === 'owner') {
    return jsonResponse({ error: 'owner_undeletable' }, 403);
  }

  const parsed = deleteSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const passwordMatches = await verifyPassword(
    guard.user.passwordHash,
    parsed.data.password,
  );
  if (!passwordMatches) {
    return jsonResponse({ error: 'invalid_password' }, 403);
  }

  await deleteAccount(database, storage(), guard.user);

  return jsonResponse({ ok: true }, 200, {
    'set-cookie': clearedSessionCookieHeader(),
  });
}
