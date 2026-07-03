import { eq } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { sessions, users } from '@/db/schema';

import { generateToken, sha256 } from './tokens';

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const RENEWAL_THRESHOLD_MS = SESSION_LIFETIME_MS / 2;

export type SessionUser = typeof users.$inferSelect;

export async function createSession(
  database: DatabaseExecutor,
  userId: string,
) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  await database
    .insert(sessions)
    .values({ tokenHash: sha256(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function validateSession(
  database: DatabaseExecutor,
  token: string,
): Promise<{ user: SessionUser; expiresAt: Date } | null> {
  const tokenHash = sha256(token);
  const [result] = await database
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash));
  if (!result) {
    return null;
  }

  const now = Date.now();
  if (result.session.expiresAt.getTime() <= now) {
    await database.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }

  let expiresAt = result.session.expiresAt;
  if (expiresAt.getTime() - now < RENEWAL_THRESHOLD_MS) {
    expiresAt = new Date(now + SESSION_LIFETIME_MS);
    await database
      .update(sessions)
      .set({ expiresAt })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  return { user: result.user, expiresAt };
}

export async function revokeSession(database: DatabaseExecutor, token: string) {
  await database.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function revokeAllSessions(
  database: DatabaseExecutor,
  userId: string,
) {
  await database.delete(sessions).where(eq(sessions.userId, userId));
}
