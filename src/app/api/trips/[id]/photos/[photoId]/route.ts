import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { photos } from '@/db/schema';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';
import { deletePhotoObjects } from '@/lib/photos/cleanup';
import { storage } from '@/lib/storage';

type Context = { params: Promise<{ id: string; photoId: string }> };

export async function DELETE(
  request: Request,
  { params }: Context,
): Promise<Response> {
  const database = db();
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return guard.response;
  }
  const { id, photoId } = await params;

  const [photo] = await database
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.id, photoId),
        eq(photos.tripId, id),
        eq(photos.userId, guard.user.id),
      ),
    );
  if (!photo) {
    return jsonResponse({ error: 'not_found' }, 404);
  }

  await database.delete(photos).where(eq(photos.id, photo.id));
  await deletePhotoObjects(storage(), [photo]);

  return jsonResponse({ ok: true }, 200);
}
