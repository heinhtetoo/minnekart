import { describe, expect, it, vi } from 'vitest';

import {
  cancelSubscription,
  paddleApiConfigured,
  resumeSubscription,
  updatePaymentMethodTransaction,
} from './paddle-api';

function fetchReturning(body: unknown, ok = true) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 403,
    json: async () => body,
  })) as unknown as typeof fetch;
}

function callOf(fetchImpl: typeof fetch) {
  const [url, init] = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0];
  return { url: url as string, init: init as RequestInit };
}

const deps = { apiKey: 'pdl_test_key', environment: 'sandbox' as const };

describe('paddleApiConfigured', () => {
  it('is false without an api key, so the caller can hide the UI', () => {
    expect(paddleApiConfigured({ apiKey: undefined })).toBe(false);
  });

  it('is true once an api key is set', () => {
    expect(paddleApiConfigured({ apiKey: 'pdl_test_key' })).toBe(true);
  });
});

describe('cancelSubscription', () => {
  it('cancels at the end of the paid period, never immediately', async () => {
    const fetchImpl = fetchReturning({ data: { id: 'sub_1' } });
    await cancelSubscription('sub_1', { ...deps, fetchImpl });

    const { url, init } = callOf(fetchImpl);
    expect(url).toBe(
      'https://sandbox-api.paddle.com/subscriptions/sub_1/cancel',
    );
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      effective_from: 'next_billing_period',
    });
  });

  it('authorises with a bearer token', async () => {
    const fetchImpl = fetchReturning({ data: {} });
    await cancelSubscription('sub_1', { ...deps, fetchImpl });

    const headers = callOf(fetchImpl).init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer pdl_test_key');
  });

  it('targets the live api when the environment is production', async () => {
    const fetchImpl = fetchReturning({ data: {} });
    await cancelSubscription('sub_1', {
      ...deps,
      environment: 'production',
      fetchImpl,
    });

    expect(callOf(fetchImpl).url).toBe(
      'https://api.paddle.com/subscriptions/sub_1/cancel',
    );
  });

  it('throws when Paddle rejects the call', async () => {
    const fetchImpl = fetchReturning({ error: { code: 'forbidden' } }, false);
    await expect(
      cancelSubscription('sub_1', { ...deps, fetchImpl }),
    ).rejects.toThrow(/paddle/i);
  });

  it('throws when no api key is configured', async () => {
    await expect(
      cancelSubscription('sub_1', { apiKey: undefined }),
    ).rejects.toThrow(/PADDLE_API_KEY/);
  });
});

describe('resumeSubscription', () => {
  it('clears the scheduled change', async () => {
    const fetchImpl = fetchReturning({ data: {} });
    await resumeSubscription('sub_1', { ...deps, fetchImpl });

    const { url, init } = callOf(fetchImpl);
    expect(url).toBe('https://sandbox-api.paddle.com/subscriptions/sub_1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ scheduled_change: null });
  });
});

describe('updatePaymentMethodTransaction', () => {
  it('returns the transaction id the checkout overlay needs', async () => {
    const fetchImpl = fetchReturning({ data: { id: 'txn_9' } });
    const transactionId = await updatePaymentMethodTransaction('sub_1', {
      ...deps,
      fetchImpl,
    });

    expect(transactionId).toBe('txn_9');
    const { url, init } = callOf(fetchImpl);
    expect(url).toBe(
      'https://sandbox-api.paddle.com/subscriptions/sub_1/update-payment-method-transaction',
    );
    expect(init.method).toBe('GET');
  });

  it('throws when Paddle returns no transaction', async () => {
    const fetchImpl = fetchReturning({ data: {} });
    await expect(
      updatePaymentMethodTransaction('sub_1', { ...deps, fetchImpl }),
    ).rejects.toThrow(/transaction/i);
  });
});
