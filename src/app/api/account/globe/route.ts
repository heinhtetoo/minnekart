import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { users } from '@/db/schema';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import { env } from '@/lib/env';

const globeSchema = z.object({ public: z.boolean() });

export async function PATCH(request: Request): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }

  const parsed = globeSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const [updated] = await database
    .update(users)
    .set({ globePublic: parsed.data.public })
    .where(eq(users.id, guard.user.id))
    .returning();

  return jsonResponse(
    {
      globePublic: updated.globePublic,
      url: `${env().APP_URL}/u/${updated.username}`,
    },
    200,
  );
}
