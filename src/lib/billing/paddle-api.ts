import { env } from '@/lib/env';

type PaddleEnvironment = 'sandbox' | 'production';

export interface PaddleApiDeps {
  apiKey?: string;
  environment?: PaddleEnvironment;
  fetchImpl?: typeof fetch;
}

const BASE_URL: Record<PaddleEnvironment, string> = {
  sandbox: 'https://sandbox-api.paddle.com',
  production: 'https://api.paddle.com',
};

export function paddleApiConfigured(deps: PaddleApiDeps = {}): boolean {
  return Boolean(resolveApiKey(deps));
}

type CancelEffectiveFrom = 'next_billing_period' | 'immediately';

export async function cancelSubscription(
  subscriptionId: string,
  deps: PaddleApiDeps = {},
  effectiveFrom: CancelEffectiveFrom = 'next_billing_period',
): Promise<void> {
  await request(`/subscriptions/${subscriptionId}/cancel`, deps, {
    method: 'POST',
    body: { effective_from: effectiveFrom },
  });
}

export async function resumeSubscription(
  subscriptionId: string,
  deps: PaddleApiDeps = {},
): Promise<void> {
  await request(`/subscriptions/${subscriptionId}`, deps, {
    method: 'PATCH',
    body: { scheduled_change: null },
  });
}

export async function updatePaymentMethodTransaction(
  subscriptionId: string,
  deps: PaddleApiDeps = {},
): Promise<string> {
  const payload = await request(
    `/subscriptions/${subscriptionId}/update-payment-method-transaction`,
    deps,
    { method: 'GET' },
  );
  const transactionId = payload?.data?.id;
  if (!transactionId) {
    throw new Error('Paddle returned no transaction to update the card with');
  }
  return transactionId;
}

interface PaddlePayload {
  data?: { id?: string };
}

async function request(
  path: string,
  deps: PaddleApiDeps,
  options: { method: string; body?: unknown },
): Promise<PaddlePayload> {
  const apiKey = resolveApiKey(deps);
  if (!apiKey) {
    throw new Error('Missing PADDLE_API_KEY');
  }
  const environment = deps.environment ?? env().PADDLE_ENV;
  const fetchImpl = deps.fetchImpl ?? fetch;

  const response = await fetchImpl(`${BASE_URL[environment]}${path}`, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });

  if (!response.ok) {
    throw new Error(`Paddle API ${options.method} ${path} failed`);
  }
  return (await response.json()) as PaddlePayload;
}

function resolveApiKey(deps: PaddleApiDeps): string | undefined {
  return 'apiKey' in deps ? deps.apiKey : env().PADDLE_API_KEY;
}
