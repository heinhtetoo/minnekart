import { db } from '@/db';
import { requireOwner } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';
import { revokeInvite } from '@/lib/auth/invites';

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

  const revoked = await revokeInvite(database, id);
  if (!revoked) {
    return jsonResponse({ error: 'not_found' }, 404);
  }
  return jsonResponse({ ok: true }, 200);
}
