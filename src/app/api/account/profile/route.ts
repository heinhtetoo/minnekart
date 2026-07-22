import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { Database, db } from '@/db';
import { photos, users } from '@/db/schema';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(80).optional(),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  profilePhotoId: z.uuid().nullable().optional(),
});

function orNull(value: string | undefined): string | null {
  return value ? value : null;
}

// A caller may only point at their own photo; otherwise they could harvest
// a photo id from a shared trip page and keep a signed URL to it for good.
async function ownsPhoto(
  database: Database,
  photoId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await database
    .select({ id: photos.id })
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.userId, userId)));
  return row !== undefined;
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

  const profilePhotoId = parsed.data.profilePhotoId ?? null;
  if (
    profilePhotoId &&
    !(await ownsPhoto(database, profilePhotoId, guard.user.id))
  ) {
    return jsonResponse({ error: 'invalid_photo' }, 400);
  }

  const [updated] = await database
    .update(users)
    .set({
      name: parsed.data.name,
      tagline: orNull(parsed.data.tagline),
      headline: orNull(parsed.data.headline),
      bio: orNull(parsed.data.bio),
      profilePhotoId,
    })
    .where(eq(users.id, guard.user.id))
    .returning();

  return jsonResponse(
    {
      name: updated.name,
      tagline: updated.tagline,
      headline: updated.headline,
      bio: updated.bio,
      profilePhotoId: updated.profilePhotoId,
    },
    200,
  );
}
