export function postRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.7',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

export function sessionCookieFrom(response: Response): string | null {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    return null;
  }
  const match = setCookie.match(/session=([^;]*)/);
  return match ? match[1] : null;
}

export function cookieHeader(token: string): Record<string, string> {
  return { cookie: `session=${token}` };
}
