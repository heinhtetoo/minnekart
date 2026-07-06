import { z } from 'zod';

import { db } from '@/db';
import { requireOwner } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import { createInvite } from '@/lib/auth/invites';
import { env } from '@/lib/env';

const createSchema = z.object({
  note: z.string().trim().min(1).max(100).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const database = db();
  const guard = await requireOwner(database, request);
  if (guard.response) {
    return guard.response;
  }

  const parsed = createSchema.safeParse((await readJsonBody(request)) ?? {});
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const { token, invite } = await createInvite(
    database,
    guard.user.id,
    parsed.data.note,
  );

  return jsonResponse(
    {
      token,
      id: invite.id,
      url: `${env().APP_URL}/signup?invite=${token}`,
    },
    200,
  );
}
