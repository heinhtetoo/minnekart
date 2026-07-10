import { turnstileSecret } from './signup-mode';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface CaptchaDeps {
  secret?: string;
  fetchImpl?: typeof fetch;
}

export async function verifySignupCaptcha(
  token: string | undefined,
  ip: string,
  deps: CaptchaDeps = {},
): Promise<boolean> {
  const secret = 'secret' in deps ? deps.secret : turnstileSecret();
  if (!secret) {
    return true;
  }
  if (!token) {
    return false;
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    if (!response.ok) {
      return false;
    }
    const body = (await response.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return false;
  }
}
