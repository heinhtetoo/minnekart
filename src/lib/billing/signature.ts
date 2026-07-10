import { createHmac, timingSafeEqual } from 'node:crypto';

const TOLERANCE_SECONDS = 60;

function parseHeader(header: string): { ts: string; h1: string } | null {
  const parts = new Map(
    header.split(';').map((part) => {
      const [key, ...rest] = part.split('=');
      return [key, rest.join('=')] as const;
    }),
  );
  const ts = parts.get('ts');
  const h1 = parts.get('h1');
  if (!ts || !h1 || !/^\d+$/.test(ts)) {
    return null;
  }
  return { ts, h1 };
}

export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (!header) {
    return false;
  }
  const parsed = parseHeader(header);
  if (!parsed) {
    return false;
  }
  const ageSeconds = Math.floor(nowMs / 1000) - Number(parsed.ts);
  if (ageSeconds > TOLERANCE_SECONDS) {
    return false;
  }
  const expected = createHmac('sha256', secret)
    .update(`${parsed.ts}:${rawBody}`)
    .digest('hex');
  const given = Buffer.from(parsed.h1, 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  if (given.length !== wanted.length) {
    return false;
  }
  return timingSafeEqual(given, wanted);
}
