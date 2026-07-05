export interface ApiResult<T> {
  ok: boolean;
  status: number;
  error?: string;
  data?: T;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const response = await fetch(path, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.error ?? 'request_failed',
    };
  }
  return { ok: true, status: response.status, data: payload as T };
}

export function jsonBody(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
