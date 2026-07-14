import { db } from '@/db';
import { jsonResponse } from '@/lib/auth/http';
import { paddleFailed, requireSubscription } from '@/lib/billing/manage';
import { updatePaymentMethodTransaction } from '@/lib/billing/paddle-api';

export async function POST(request: Request): Promise<Response> {
  const guard = await requireSubscription(db(), request);
  if (guard.response) {
    return guard.response;
  }

  try {
    const transactionId = await updatePaymentMethodTransaction(
      guard.subscriptionId,
    );
    return jsonResponse({ transactionId }, 200);
  } catch (error) {
    return paddleFailed('payment-method', error);
  }
}
