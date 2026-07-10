import { createHmac } from 'node:crypto';

const WEBHOOK_URL = 'http://localhost/api/webhooks/paddle';

export function signPaddleBody(
  rawBody: string,
  secret: string,
  ts = Math.floor(Date.now() / 1000),
): string {
  const h1 = createHmac('sha256', secret)
    .update(`${ts}:${rawBody}`)
    .digest('hex');
  return `ts=${ts};h1=${h1}`;
}

export function paddleWebhookRequest(
  body: unknown,
  options: { secret?: string; signature?: string | null } = {},
): Request {
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
  const secret = options.secret ?? process.env.PADDLE_WEBHOOK_SECRET ?? '';
  const signature =
    options.signature === undefined
      ? signPaddleBody(rawBody, secret)
      : options.signature;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (signature !== null) {
    headers['paddle-signature'] = signature;
  }
  return new Request(WEBHOOK_URL, { method: 'POST', headers, body: rawBody });
}
