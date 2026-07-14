import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as cancel } from './cancel/route';
import { POST as paymentMethod } from './payment-method/route';
import { POST as resume } from './resume/route';

import { createMemberWithSession } from '../../../../../test/auth-fixtures';
import { resetDb } from '../../../../../test/db';
import { cookieHeader, jsonRequest } from '../../../../../test/http';

const paddle = vi.hoisted(() => ({
  paddleApiConfigured: vi.fn(() => true),
  cancelSubscription: vi.fn(async () => undefined),
  resumeSubscription: vi.fn(async () => undefined),
  updatePaymentMethodTransaction: vi.fn(async () => 'txn_9'),
}));

vi.mock('@/lib/billing/paddle-api', () => paddle);

const CANCEL_URL = 'http://test/api/account/subscription/cancel';
const RESUME_URL = 'http://test/api/account/subscription/resume';
const CARD_URL = 'http://test/api/account/subscription/payment-method';

function subscriber() {
  return createMemberWithSession({
    verified: true,
    plan: 'paid',
    subscriptionId: 'sub_1',
  });
}

function post(url: string, token: string, body: unknown = {}) {
  return jsonRequest('POST', url, body, cookieHeader(token));
}

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
  paddle.paddleApiConfigured.mockReturnValue(true);
});

describe('POST /api/account/subscription/cancel', () => {
  it('cancels the subscription of the logged-in user', async () => {
    const { sessionToken } = await subscriber();

    const response = await cancel(post(CANCEL_URL, sessionToken));

    expect(response.status).toBe(200);
    expect(paddle.cancelSubscription).toHaveBeenCalledWith('sub_1');
  });

  it('ignores a subscription id supplied in the request body', async () => {
    const { sessionToken } = await subscriber();

    const response = await cancel(
      post(CANCEL_URL, sessionToken, { subscriptionId: 'sub_someone_else' }),
    );

    expect(response.status).toBe(200);
    expect(paddle.cancelSubscription).toHaveBeenCalledWith('sub_1');
  });

  it('rejects a request with no session', async () => {
    const response = await cancel(
      jsonRequest('POST', CANCEL_URL, {}, { 'x-forwarded-for': '203.0.113.7' }),
    );

    expect(response.status).toBe(401);
    expect(paddle.cancelSubscription).not.toHaveBeenCalled();
  });

  it('refuses a paid user who has no subscription (lifetime buyer)', async () => {
    const { sessionToken } = await createMemberWithSession({
      verified: true,
      plan: 'paid',
    });

    const response = await cancel(post(CANCEL_URL, sessionToken));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'no_subscription' });
    expect(paddle.cancelSubscription).not.toHaveBeenCalled();
  });

  it('refuses a free user', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await cancel(post(CANCEL_URL, sessionToken));

    expect(response.status).toBe(409);
    expect(paddle.cancelSubscription).not.toHaveBeenCalled();
  });

  it('reports billing unavailable when no api key is configured', async () => {
    paddle.paddleApiConfigured.mockReturnValue(false);
    const { sessionToken } = await subscriber();

    const response = await cancel(post(CANCEL_URL, sessionToken));

    expect(response.status).toBe(503);
    expect(paddle.cancelSubscription).not.toHaveBeenCalled();
  });

  it('surfaces a Paddle failure as a 502 rather than a false success', async () => {
    paddle.cancelSubscription.mockRejectedValueOnce(new Error('paddle down'));
    const { sessionToken } = await subscriber();

    const response = await cancel(post(CANCEL_URL, sessionToken));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'paddle_failed' });
  });
});

describe('POST /api/account/subscription/resume', () => {
  it('clears a scheduled cancellation for the logged-in user', async () => {
    const { sessionToken } = await subscriber();

    const response = await resume(post(RESUME_URL, sessionToken));

    expect(response.status).toBe(200);
    expect(paddle.resumeSubscription).toHaveBeenCalledWith('sub_1');
  });

  it('refuses a user with no subscription', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await resume(post(RESUME_URL, sessionToken));

    expect(response.status).toBe(409);
    expect(paddle.resumeSubscription).not.toHaveBeenCalled();
  });
});

describe('POST /api/account/subscription/payment-method', () => {
  it('returns a transaction id for the checkout overlay', async () => {
    const { sessionToken } = await subscriber();

    const response = await paymentMethod(post(CARD_URL, sessionToken));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ transactionId: 'txn_9' });
    expect(paddle.updatePaymentMethodTransaction).toHaveBeenCalledWith('sub_1');
  });

  it('refuses a user with no subscription', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await paymentMethod(post(CARD_URL, sessionToken));

    expect(response.status).toBe(409);
    expect(paddle.updatePaymentMethodTransaction).not.toHaveBeenCalled();
  });
});
