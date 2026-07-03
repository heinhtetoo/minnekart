import { and, eq, gt, isNull } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { authTokens, users } from '@/db/schema';

import { hashPassword } from './password';
import { revokeAllSessions } from './session';
import { generateToken, sha256 } from './tokens';

const RESET_LIFETIME_MS = 30 * 60 * 1000;

export async function issueResetToken(
  database: DatabaseExecutor,
  userId: string,
): Promise<string> {
  await database
    .delete(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.type, 'reset')));

  const token = generateToken();
  await database.insert(authTokens).values({
    userId,
    type: 'reset',
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + RESET_LIFETIME_MS),
  });
  return token;
}

export async function resetPassword(
  database: DatabaseExecutor,
  token: string,
  newPassword: string,
): Promise<boolean> {
  const [record] = await database
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, sha256(token)),
        eq(authTokens.type, 'reset'),
        isNull(authTokens.consumedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    );
  if (!record) {
    return false;
  }

  const passwordHash = await hashPassword(newPassword);
  await database.transaction(async (tx) => {
    await tx
      .update(authTokens)
      .set({ consumedAt: new Date() })
      .where(eq(authTokens.id, record.id));
    await tx
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, record.userId));
    await revokeAllSessions(tx, record.userId);
  });
  return true;
}
