import { or, eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { verifySignupCaptcha } from '@/lib/auth/captcha';
import { sessionCookieHeader } from '@/lib/auth/cookies';
import { sendOtpEmail } from '@/lib/auth/emails';
import { clientIp, jsonResponse, readJsonBody } from '@/lib/auth/http';
import { consumeInvite, findUsableInvite } from '@/lib/auth/invites';
import { issueOtp } from '@/lib/auth/otp';
import { hashPassword } from '@/lib/auth/password';
import { consumeRateLimit } from '@/lib/auth/rate-limit';
import { createSession } from '@/lib/auth/session';
import { openSignupEnabled } from '@/lib/auth/signup-mode';
import { signupSchema } from '@/lib/auth/validation';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SIGNUPS_PER_IP_HOUR = 5;
const SIGNUPS_PER_IP_DAY = 20;
const SIGNUPS_GLOBAL_DAY = 100;

class InviteUnavailableError extends Error {}

export async function POST(request: Request): Promise<Response> {
  const parsed = signupSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const { email, username, name, password, invite, captchaToken } = parsed.data;

  if (!openSignupEnabled() && !invite) {
    return jsonResponse({ error: 'invalid_invite' }, 400);
  }

  const ip = clientIp(request);
  if (!(await verifySignupCaptcha(captchaToken, ip))) {
    return jsonResponse({ error: 'captcha_failed' }, 400);
  }

  const database = db();
  const withinQuotas =
    (await consumeRateLimit(
      database,
      `signup:${ip}`,
      SIGNUPS_PER_IP_HOUR,
      HOUR_MS,
    )) &&
    (await consumeRateLimit(
      database,
      `signup-day:${ip}`,
      SIGNUPS_PER_IP_DAY,
      DAY_MS,
    )) &&
    (await consumeRateLimit(
      database,
      'signup-global',
      SIGNUPS_GLOBAL_DAY,
      DAY_MS,
    ));
  if (!withinQuotas) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const [existing] = await database
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)));
  if (existing) {
    return jsonResponse({ error: 'account_exists' }, 409);
  }

  const usableInvite = invite ? await findUsableInvite(database, invite) : null;
  if (invite && !usableInvite) {
    return jsonResponse({ error: 'invalid_invite' }, 400);
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    userId = await database.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ email, username, name, passwordHash })
        .returning({ id: users.id });
      if (usableInvite) {
        const consumed = await consumeInvite(tx, usableInvite.id, user.id);
        if (!consumed) {
          throw new InviteUnavailableError();
        }
      }
      return user.id;
    });
  } catch (error) {
    if (error instanceof InviteUnavailableError) {
      return jsonResponse({ error: 'invalid_invite' }, 400);
    }
    if (isUniqueViolation(error)) {
      return jsonResponse({ error: 'account_exists' }, 409);
    }
    throw error;
  }

  const code = await issueOtp(database, userId);
  await sendOtpEmail(email, code);

  const { token, expiresAt } = await createSession(database, userId);
  return jsonResponse({ ok: true }, 201, {
    'set-cookie': sessionCookieHeader(token, expiresAt),
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'cause' in error &&
    typeof error.cause === 'object' &&
    error.cause !== null &&
    'code' in error.cause &&
    error.cause.code === '23505'
  );
}
