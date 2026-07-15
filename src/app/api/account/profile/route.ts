import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { users } from '@/db/schema';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(80).optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
});

function orNull(value: string | undefined): string | null {
  return value ? value : null;
}

export async function PATCH(request: Request): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }

  const parsed = profileSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const [updated] = await database
    .update(users)
    .set({
      name: parsed.data.name,
      tagline: orNull(parsed.data.tagline),
      headline: orNull(parsed.data.headline),
      bio: orNull(parsed.data.bio),
    })
    .where(eq(users.id, guard.user.id))
    .returning();

  return jsonResponse(
    {
      name: updated.name,
      tagline: updated.tagline,
      headline: updated.headline,
      bio: updated.bio,
    },
    200,
  );
}
