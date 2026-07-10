import { env } from '@/lib/env';

export function openSignupEnabled(): boolean {
  return env().OPEN_SIGNUP === 'true';
}

export function turnstileSecret(): string | undefined {
  return env().TURNSTILE_SECRET_KEY;
}
