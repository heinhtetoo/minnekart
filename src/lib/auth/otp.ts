import { and, desc, eq } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { authTokens, users } from '@/db/schema';

import { hashPassword, verifyPassword } from './password';
import { generateOtpCode } from './tokens';

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export async function issueOtp(
  database: DatabaseExecutor,
  userId: string,
): Promise<string> {
  await database
    .delete(authTokens)
    .where(
      and(eq(authTokens.userId, userId), eq(authTokens.type, 'verify_otp')),
    );

  const code = generateOtpCode();
  await database.insert(authTokens).values({
    userId,
    type: 'verify_otp',
    tokenHash: await hashPassword(code),
    expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
  });
  return code;
}

export type OtpResult =
  'verified' | 'invalid' | 'expired' | 'too_many_attempts';

export async function verifyOtp(
  database: DatabaseExecutor,
  userId: string,
  code: string,
): Promise<OtpResult> {
  const [token] = await database
    .select()
    .from(authTokens)
    .where(
      and(eq(authTokens.userId, userId), eq(authTokens.type, 'verify_otp')),
    )
    .orderBy(desc(authTokens.createdAt))
    .limit(1);

  if (!token) {
    return 'invalid';
  }
  if (token.attempts >= MAX_OTP_ATTEMPTS) {
    return 'too_many_attempts';
  }
  if (token.expiresAt.getTime() <= Date.now()) {
    return 'expired';
  }

  if (!(await verifyPassword(token.tokenHash, code))) {
    await database
      .update(authTokens)
      .set({ attempts: token.attempts + 1 })
      .where(eq(authTokens.id, token.id));
    return 'invalid';
  }

  await database
    .delete(authTokens)
    .where(
      and(eq(authTokens.userId, userId), eq(authTokens.type, 'verify_otp')),
    );
  await database
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, userId));
  return 'verified';
}
