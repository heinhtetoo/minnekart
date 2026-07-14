import { db } from '@/db';
import { jsonResponse } from '@/lib/auth/http';
import { paddleFailed, requireSubscription } from '@/lib/billing/manage';
import { resumeSubscription } from '@/lib/billing/paddle-api';

export async function POST(request: Request): Promise<Response> {
  const guard = await requireSubscription(db(), request);
  if (guard.response) {
    return guard.response;
  }

  try {
    await resumeSubscription(guard.subscriptionId);
  } catch (error) {
    return paddleFailed('resume', error);
  }

  return jsonResponse({ ok: true }, 200);
}
