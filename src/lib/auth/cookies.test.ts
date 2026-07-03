import { describe, expect, it } from 'vitest';

import {
  clearedSessionCookieHeader,
  readSessionToken,
  sessionCookieHeader,
} from './cookies';

describe('session cookies', () => {
  it('builds an httpOnly lax cookie carrying the token', () => {
    const header = sessionCookieHeader('token-value', new Date());

    expect(header).toContain('session=token-value');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain('Path=/');
  });

  it('reads the token back from a request cookie header', () => {
    const request = new Request('http://test/', {
      headers: { cookie: 'other=1; session=token-value; more=2' },
    });

    expect(readSessionToken(request)).toBe('token-value');
  });

  it('returns null when no session cookie is present', () => {
    expect(readSessionToken(new Request('http://test/'))).toBeNull();
  });

  it('clears by expiring the cookie in the past', () => {
    const header = clearedSessionCookieHeader();

    expect(header).toContain('session=;');
    expect(header).toContain('Expires=Thu, 01 Jan 1970');
  });
});
