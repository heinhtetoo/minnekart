import { db } from '@/db';
import { jsonResponse } from '@/lib/auth/http';
import { verifyPaddleSignature } from '@/lib/billing/signature';
import {
  applyEvent,
  parsePaddleEvent,
  recordEvent,
} from '@/lib/billing/webhook';
import { env } from '@/lib/env';

export async function POST(request: Request): Promise<Response> {
  const secret = env().PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    return jsonResponse({ error: 'webhook_not_configured' }, 503);
  }
  const rawBody = await request.text();
  const signature = request.headers.get('paddle-signature');
  if (!verifyPaddleSignature(rawBody, signature, secret)) {
    return jsonResponse({ error: 'invalid_signature' }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }
  const event = parsePaddleEvent(payload);
  if (!event) {
    return jsonResponse({ error: 'invalid_request' }, 400);
  }

  const database = db();
  const fresh = await recordEvent(database, event);
  if (fresh) {
    await applyEvent(database, event, env().PADDLE_PRICE_LIFETIME);
  }
  return jsonResponse({ ok: true });
}
