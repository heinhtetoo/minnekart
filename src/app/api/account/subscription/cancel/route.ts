import { db } from '@/db';
import { jsonResponse } from '@/lib/auth/http';
import { paddleFailed, requireSubscription } from '@/lib/billing/manage';
import { cancelSubscription } from '@/lib/billing/paddle-api';

export async function POST(request: Request): Promise<Response> {
  const guard = await requireSubscription(db(), request);
  if (guard.response) {
    return guard.response;
  }

  try {
    await cancelSubscription(guard.subscriptionId);
  } catch (error) {
    return paddleFailed('cancel', error);
  }

  return jsonResponse({ ok: true }, 200);
}
