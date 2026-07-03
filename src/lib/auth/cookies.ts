import { env } from '@/lib/env';

const SESSION_COOKIE_NAME = 'session';

export function sessionCookieHeader(token: string, expiresAt: Date): string {
  return buildCookie(token, expiresAt);
}

export function clearedSessionCookieHeader(): string {
  return buildCookie('', new Date(0));
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) {
    return null;
  }
  for (const pair of header.split(';')) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const name = pair.slice(0, separatorIndex).trim();
    if (name === SESSION_COOKIE_NAME) {
      return pair.slice(separatorIndex + 1).trim();
    }
  }
  return null;
}

function buildCookie(value: string, expires: Date): string {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${expires.toUTCString()}`,
  ];
  if (env().NODE_ENV === 'production') {
    attributes.push('Secure');
  }
  return attributes.join('; ');
}
