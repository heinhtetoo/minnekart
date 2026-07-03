import { db } from '@/db';
import {
  clearedSessionCookieHeader,
  readSessionToken,
} from '@/lib/auth/cookies';
import { jsonResponse } from '@/lib/auth/http';
import { revokeSession } from '@/lib/auth/session';

export async function POST(request: Request): Promise<Response> {
  const token = readSessionToken(request);
  if (token) {
    await revokeSession(db(), token);
  }
  return jsonResponse({ ok: true }, 200, {
    'set-cookie': clearedSessionCookieHeader(),
  });
}
