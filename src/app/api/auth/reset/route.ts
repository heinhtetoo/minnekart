import { db } from '@/db';
import { jsonResponse, readJsonBody } from '@/lib/auth/http';
import { resetPassword } from '@/lib/auth/reset';
import { resetSchema } from '@/lib/auth/validation';

export async function POST(request: Request): Promise<Response> {
  const parsed = resetSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const ok = await resetPassword(db(), parsed.data.token, parsed.data.password);
  if (!ok) {
    return jsonResponse({ error: 'invalid_token' }, 400);
  }
  return jsonResponse({ ok: true }, 200);
}
