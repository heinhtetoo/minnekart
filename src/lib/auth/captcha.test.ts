import { describe, expect, it, vi } from 'vitest';

import { verifySignupCaptcha } from './captcha';

function fetchReturning(body: unknown, ok = true) {
  return vi.fn(async () => ({
    ok,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('verifySignupCaptcha', () => {
  it('passes when no secret is configured', async () => {
    const result = await verifySignupCaptcha(undefined, '203.0.113.7', {
      secret: undefined,
    });
    expect(result).toBe(true);
  });

  it('accepts a token Turnstile verifies', async () => {
    const fetchImpl = fetchReturning({ success: true });
    const result = await verifySignupCaptcha('token-1', '203.0.113.7', {
      secret: 'secret-1',
      fetchImpl,
    });
    expect(result).toBe(true);
    const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('challenges.cloudflare.com');
    const sent = init.body as URLSearchParams;
    expect(sent.get('secret')).toBe('secret-1');
    expect(sent.get('response')).toBe('token-1');
    expect(sent.get('remoteip')).toBe('203.0.113.7');
  });

  it('rejects a token Turnstile rejects', async () => {
    const result = await verifySignupCaptcha('token-1', '203.0.113.7', {
      secret: 'secret-1',
      fetchImpl: fetchReturning({ success: false }),
    });
    expect(result).toBe(false);
  });

  it('rejects a missing token when a secret is configured', async () => {
    const fetchImpl = fetchReturning({ success: true });
    const result = await verifySignupCaptcha(undefined, '203.0.113.7', {
      secret: 'secret-1',
      fetchImpl,
    });
    expect(result).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fails closed on a non-2xx siteverify response', async () => {
    const result = await verifySignupCaptcha('token-1', '203.0.113.7', {
      secret: 'secret-1',
      fetchImpl: fetchReturning({}, false),
    });
    expect(result).toBe(false);
  });

  it('fails closed when the siteverify call throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const result = await verifySignupCaptcha('token-1', '203.0.113.7', {
      secret: 'secret-1',
      fetchImpl,
    });
    expect(result).toBe(false);
  });
});
