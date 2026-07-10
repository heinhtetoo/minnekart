export interface AuthResult {
  ok: boolean;
  status: number;
  error?: string;
}

async function post(path: string, body: unknown): Promise<AuthResult> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let error: string | undefined;
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    error = data?.error ?? 'request_failed';
  }
  return { ok: response.ok, status: response.status, error };
}

export const authApi = {
  login: (email: string, password: string) =>
    post('/api/auth/login', { email, password }),
  signup: (input: {
    email: string;
    username: string;
    name: string;
    password: string;
    invite?: string;
    captchaToken?: string;
  }) => post('/api/auth/signup', input),
  verify: (code: string) => post('/api/auth/verify', { code }),
  resend: () => post('/api/auth/resend', {}),
  forgot: (email: string) => post('/api/auth/forgot', { email }),
  reset: (token: string, password: string) =>
    post('/api/auth/reset', { token, password }),
  logout: () => post('/api/auth/logout', {}),
};
