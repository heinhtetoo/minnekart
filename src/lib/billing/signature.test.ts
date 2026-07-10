import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyPaddleSignature } from './signature';

const SECRET = 'pdl_ntfset_test_secret';
const BODY = '{"event_id":"evt_1","event_type":"subscription.activated"}';

function sign(body: string, secret: string, ts: number): string {
  const h1 = createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

describe('verifyPaddleSignature', () => {
  const now = 1_752_100_000_000;
  const ts = Math.floor(now / 1000);

  it('accepts a valid signature over the exact raw body', () => {
    const header = sign(BODY, SECRET, ts);
    expect(verifyPaddleSignature(BODY, header, SECRET, now)).toBe(true);
  });

  it('rejects when the body was tampered with after signing', () => {
    const header = sign(BODY, SECRET, ts);
    const tampered = BODY.replace('evt_1', 'evt_2');
    expect(verifyPaddleSignature(tampered, header, SECRET, now)).toBe(false);
  });

  it('rejects a signature made with a different secret', () => {
    const header = sign(BODY, 'wrong_secret', ts);
    expect(verifyPaddleSignature(BODY, header, SECRET, now)).toBe(false);
  });

  it('rejects a stale timestamp outside the tolerance window', () => {
    const staleTs = ts - 120;
    const header = sign(BODY, SECRET, staleTs);
    expect(verifyPaddleSignature(BODY, header, SECRET, now)).toBe(false);
  });

  it('accepts a timestamp slightly in the future (clock skew)', () => {
    const header = sign(BODY, SECRET, ts + 5);
    expect(verifyPaddleSignature(BODY, header, SECRET, now)).toBe(true);
  });

  it('rejects a missing header', () => {
    expect(verifyPaddleSignature(BODY, null, SECRET, now)).toBe(false);
  });

  it('rejects a malformed header', () => {
    expect(verifyPaddleSignature(BODY, 'not-a-signature', SECRET, now)).toBe(
      false,
    );
    expect(verifyPaddleSignature(BODY, 'ts=abc;h1=', SECRET, now)).toBe(false);
    expect(verifyPaddleSignature(BODY, `ts=${ts}`, SECRET, now)).toBe(false);
  });

  it('rejects an h1 of the wrong length without throwing', () => {
    expect(verifyPaddleSignature(BODY, `ts=${ts};h1=abcd`, SECRET, now)).toBe(
      false,
    );
  });
});
