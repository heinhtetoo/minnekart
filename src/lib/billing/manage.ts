import { DatabaseExecutor } from '@/db';
import { requireVerifiedUser } from '@/lib/auth/current-user';
import { jsonResponse } from '@/lib/auth/http';

import { paddleApiConfigured } from './paddle-api';

type SubscriptionGuard =
  | { subscriptionId: string; response?: undefined }
  | { subscriptionId?: undefined; response: Response };

// The subscription id is read from the logged-in user's row, never from the
// request — a client-supplied id would let anyone manage anyone's plan.
export async function requireSubscription(
  database: DatabaseExecutor,
  request: Request,
): Promise<SubscriptionGuard> {
  const guard = await requireVerifiedUser(database, request);
  if (guard.response) {
    return { response: guard.response };
  }
  if (!paddleApiConfigured()) {
    return { response: jsonResponse({ error: 'billing_unavailable' }, 503) };
  }
  const subscriptionId = guard.user.paddleSubscriptionId;
  if (!subscriptionId) {
    return { response: jsonResponse({ error: 'no_subscription' }, 409) };
  }
  return { subscriptionId };
}

export function paddleFailed(action: string, error: unknown): Response {
  console.error(`[paddle] ${action} failed`, error);
  return jsonResponse({ error: 'paddle_failed' }, 502);
}
