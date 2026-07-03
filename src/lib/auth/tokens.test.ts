import { describe, expect, it } from 'vitest';

import { generateOtpCode, generateToken, sha256 } from './tokens';

describe('tokens', () => {
  it('generates unique url-safe tokens with high entropy', () => {
    const first = generateToken();
    const second = generateToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes deterministically with sha256', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256('abc')).not.toBe(sha256('abd'));
  });

  it('generates six-digit otp codes, zero-padded', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});
