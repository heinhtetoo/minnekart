import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { sendResetEmail } from '@/lib/auth/emails';
import { clientIp, jsonResponse, readJsonBody } from '@/lib/auth/http';
import { consumeRateLimit } from '@/lib/auth/rate-limit';
import { issueResetToken } from '@/lib/auth/reset';
import { forgotSchema } from '@/lib/auth/validation';

const HOUR_MS = 60 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  const parsed = forgotSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const { email } = parsed.data;

  const database = db();
  const withinIpLimit = await consumeRateLimit(
    database,
    `forgot-ip:${clientIp(request)}`,
    10,
    HOUR_MS,
  );
  const withinAccountLimit = await consumeRateLimit(
    database,
    `forgot-account:${email}`,
    3,
    HOUR_MS,
  );
  if (!withinIpLimit || !withinAccountLimit) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.email, email));
  if (user) {
    const token = await issueResetToken(database, user.id);
    await sendResetEmail(user.email, token);
  }

  return jsonResponse({ ok: true }, 200);
}
