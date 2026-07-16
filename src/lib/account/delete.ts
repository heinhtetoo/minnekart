import { eq } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { photos, users } from '@/db/schema';
import { SessionUser } from '@/lib/auth/session';
import {
  PaddleApiDeps,
  cancelSubscription,
  paddleApiConfigured,
} from '@/lib/billing/paddle-api';
import { deletePhotoObjects } from '@/lib/photos/cleanup';
import { ObjectStorage } from '@/lib/storage/types';

export interface DeleteAccountDeps {
  paddle?: PaddleApiDeps;
}

export async function deleteAccount(
  database: DatabaseExecutor,
  storage: ObjectStorage,
  user: SessionUser,
  deps: DeleteAccountDeps = {},
): Promise<void> {
  await cancelPaddleSubscription(user, deps);

  const userPhotos = await database
    .select()
    .from(photos)
    .where(eq(photos.userId, user.id));

  await database.delete(users).where(eq(users.id, user.id));
  await deletePhotoObjects(storage, userPhotos);
}

// A dead account must stop billing; a Paddle failure must not strand a user who
// wants out, so we log and carry on — their local data still deletes, and a
// webhook for a now-missing user is already acked and ignored.
async function cancelPaddleSubscription(
  user: SessionUser,
  deps: DeleteAccountDeps,
): Promise<void> {
  if (!user.paddleSubscriptionId) {
    return;
  }
  if (!paddleApiConfigured(deps.paddle)) {
    return;
  }
  try {
    await cancelSubscription(
      user.paddleSubscriptionId,
      deps.paddle,
      'immediately',
    );
  } catch (error) {
    console.error('[account] paddle cancel on delete failed', error);
  }
}
