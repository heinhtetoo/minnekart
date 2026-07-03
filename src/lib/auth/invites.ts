import { and, eq, gt, isNull } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { invites } from '@/db/schema';

import { generateToken, sha256 } from './tokens';

const INVITE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

export async function createInvite(
  database: DatabaseExecutor,
  createdBy: string,
  note?: string,
) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
  const [invite] = await database
    .insert(invites)
    .values({ tokenHash: sha256(token), createdBy, note, expiresAt })
    .returning();
  return { token, invite };
}

export async function findUsableInvite(
  database: DatabaseExecutor,
  token: string,
) {
  const [invite] = await database
    .select()
    .from(invites)
    .where(
      and(
        eq(invites.tokenHash, sha256(token)),
        isNull(invites.usedAt),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, new Date()),
      ),
    );
  return invite ?? null;
}

export async function consumeInvite(
  database: DatabaseExecutor,
  inviteId: string,
  usedBy: string,
): Promise<boolean> {
  const consumed = await database
    .update(invites)
    .set({ usedBy, usedAt: new Date() })
    .where(and(eq(invites.id, inviteId), isNull(invites.usedAt)))
    .returning();
  return consumed.length > 0;
}
