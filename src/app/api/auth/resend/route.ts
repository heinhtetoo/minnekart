import { db } from '@/db';
import { getSessionUser, isVerified } from '@/lib/auth/current-user';
import { sendOtpEmail } from '@/lib/auth/emails';
import { jsonResponse } from '@/lib/auth/http';
import { issueOtp } from '@/lib/auth/otp';
import { consumeRateLimit } from '@/lib/auth/rate-limit';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export async function POST(request: Request): Promise<Response> {
  const database = db();
  const user = await getSessionUser(database, request);
  if (!user) {
    return jsonResponse({ error: 'unauthenticated' }, 401);
  }
  if (isVerified(user)) {
    return jsonResponse({ error: 'already_verified' }, 400);
  }

  const perMinute = await consumeRateLimit(
    database,
    `resend-minute:${user.id}`,
    1,
    MINUTE_MS,
  );
  const perHour = await consumeRateLimit(
    database,
    `resend-hour:${user.id}`,
    5,
    HOUR_MS,
  );
  if (!perMinute || !perHour) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const code = await issueOtp(database, user.id);
  await sendOtpEmail(user.email, code);
  return jsonResponse({ ok: true }, 200);
}
