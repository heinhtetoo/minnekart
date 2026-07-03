import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import { sessionCookieHeader } from '@/lib/auth/cookies';
import { clientIp, jsonResponse, readJsonBody } from '@/lib/auth/http';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { consumeRateLimit } from '@/lib/auth/rate-limit';
import { createSession } from '@/lib/auth/session';
import { loginSchema } from '@/lib/auth/validation';

const WINDOW_MS = 15 * 60 * 1000;

let dummyHashPromise: Promise<string> | undefined;
function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword('timing-attack-mitigation-placeholder');
  return dummyHashPromise;
}

export async function POST(request: Request): Promise<Response> {
  const parsed = loginSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const { email, password } = parsed.data;

  const database = db();
  const withinIpLimit = await consumeRateLimit(
    database,
    `login-ip:${clientIp(request)}`,
    10,
    WINDOW_MS,
  );
  const withinAccountLimit = await consumeRateLimit(
    database,
    `login-account:${email}`,
    5,
    WINDOW_MS,
  );
  if (!withinIpLimit || !withinAccountLimit) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    await verifyPassword(await dummyHash(), password);
    return jsonResponse({ error: 'invalid_credentials' }, 401);
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    return jsonResponse({ error: 'invalid_credentials' }, 401);
  }

  const { token, expiresAt } = await createSession(database, user.id);
  return jsonResponse({ ok: true }, 200, {
    'set-cookie': sessionCookieHeader(token, expiresAt),
  });
}
