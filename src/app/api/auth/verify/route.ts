import { db } from '@/db';
import { getSessionUser, isVerified } from '@/lib/auth/current-user';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import { verifyOtp } from '@/lib/auth/otp';
import { verifySchema } from '@/lib/auth/validation';

export async function POST(request: Request): Promise<Response> {
  const database = db();
  const user = await getSessionUser(database, request);
  if (!user) {
    return jsonResponse({ error: 'unauthenticated' }, 401);
  }
  if (isVerified(user)) {
    return jsonResponse({ ok: true }, 200);
  }

  const parsed = verifySchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const result = await verifyOtp(database, user.id, parsed.data.code);
  if (result === 'verified') {
    return jsonResponse({ ok: true }, 200);
  }
  if (result === 'too_many_attempts') {
    return jsonResponse({ error: result }, 429);
  }
  return jsonResponse({ error: result }, 400);
}
