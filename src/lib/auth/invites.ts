import { and, desc, eq, gt, isNull } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { invites, users } from '@/db/schema';

import { generateToken, sha256 } from './tokens';

const INVITE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

export type InviteStatus = 'used' | 'revoked' | 'expired' | 'unused';

type InviteRow = typeof invites.$inferSelect;

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

export async function listInvites(database: DatabaseExecutor) {
  return database
    .select({
      invite: invites,
      usedByUsername: users.username,
    })
    .from(invites)
    .leftJoin(users, eq(invites.usedBy, users.id))
    .orderBy(desc(invites.createdAt));
}

export async function revokeInvite(
  database: DatabaseExecutor,
  inviteId: string,
): Promise<boolean> {
  const revoked = await database
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(invites.id, inviteId),
        isNull(invites.usedAt),
        isNull(invites.revokedAt),
      ),
    )
    .returning();
  return revoked.length > 0;
}

export function inviteStatus(invite: InviteRow): InviteStatus {
  if (invite.usedAt) {
    return 'used';
  }
  if (invite.revokedAt) {
    return 'revoked';
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    return 'expired';
  }
  return 'unused';
}
