import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';

import { users, webhookEvents } from '@/db/schema';

import { POST } from './route';

import { createMember } from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import { paddleWebhookRequest } from '../../../../../test/paddle';

const db = testDb();

function subscriptionEvent(overrides: {
  eventId?: string;
  eventType?: string;
  status?: string;
  customerId?: string;
  userId?: string;
  scheduledChange?: { action: string; effective_at: string } | null;
  renewsAt?: string;
}) {
  return {
    event_id: overrides.eventId ?? 'evt_sub_1',
    event_type: overrides.eventType ?? 'subscription.activated',
    data: {
      id: 'sub_1',
      status: overrides.status ?? 'active',
      customer_id: overrides.customerId ?? 'ctm_1',
      current_billing_period: {
        ends_at: overrides.renewsAt ?? '2027-07-14T00:00:00Z',
      },
      ...('scheduledChange' in overrides
        ? { scheduled_change: overrides.scheduledChange }
        : {}),
      ...(overrides.userId
        ? { custom_data: { userId: overrides.userId } }
        : {}),
    },
  };
}

async function userById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

describe('POST /api/webhooks/paddle', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects a missing signature and records nothing', async () => {
    const { user } = await createMember();
    const event = subscriptionEvent({ userId: user.id });
    const response = await POST(
      paddleWebhookRequest(event, { signature: null }),
    );
    expect(response.status).toBe(401);
    expect(await db.select().from(webhookEvents)).toHaveLength(0);
    expect((await userById(user.id)).plan).toBe('free');
  });

  it('rejects an invalid signature', async () => {
    const { user } = await createMember();
    const event = subscriptionEvent({ userId: user.id });
    const response = await POST(
      paddleWebhookRequest(event, { secret: 'wrong_secret' }),
    );
    expect(response.status).toBe(401);
    expect((await userById(user.id)).plan).toBe('free');
  });

  it('rejects a signed but non-JSON body', async () => {
    const response = await POST(paddleWebhookRequest('not json'));
    expect(response.status).toBe(400);
  });

  it('activates a subscription matched by checkout custom_data', async () => {
    const { user } = await createMember();
    const response = await POST(
      paddleWebhookRequest(subscriptionEvent({ userId: user.id })),
    );
    expect(response.status).toBe(200);
    const updated = await userById(user.id);
    expect(updated.plan).toBe('paid');
    expect(updated.subscriptionStatus).toBe('active');
    expect(updated.paddleCustomerId).toBe('ctm_1');
    const events = await db.select().from(webhookEvents);
    expect(events).toHaveLength(1);
    expect(events[0].eventId).toBe('evt_sub_1');
  });

  it('stores the subscription id so the plan can be managed in-app', async () => {
    const { user } = await createMember();
    await POST(paddleWebhookRequest(subscriptionEvent({ userId: user.id })));
    const updated = await userById(user.id);
    expect(updated.paddleSubscriptionId).toBe('sub_1');
    expect(updated.subscriptionEndsAt).toBeNull();
  });

  it('records the renewal date, so cancelling can name the paid-until day', async () => {
    const { user } = await createMember();
    await POST(
      paddleWebhookRequest(
        subscriptionEvent({
          userId: user.id,
          renewsAt: '2027-01-09T00:00:00Z',
        }),
      ),
    );
    expect((await userById(user.id)).subscriptionRenewsAt).toEqual(
      new Date('2027-01-09T00:00:00Z'),
    );
  });

  it('records the end date when a cancellation is scheduled', async () => {
    const { user } = await createMember();
    await POST(paddleWebhookRequest(subscriptionEvent({ userId: user.id })));

    const response = await POST(
      paddleWebhookRequest(
        subscriptionEvent({
          eventId: 'evt_sub_2',
          eventType: 'subscription.updated',
          scheduledChange: {
            action: 'cancel',
            effective_at: '2026-08-03T00:00:00Z',
          },
        }),
      ),
    );

    expect(response.status).toBe(200);
    const updated = await userById(user.id);
    expect(updated.subscriptionEndsAt).toEqual(
      new Date('2026-08-03T00:00:00Z'),
    );
    expect(updated.plan).toBe('paid');
    expect(updated.subscriptionStatus).toBe('active');
  });

  it('clears the end date when the cancellation is called off', async () => {
    const { user } = await createMember();
    await POST(paddleWebhookRequest(subscriptionEvent({ userId: user.id })));
    await POST(
      paddleWebhookRequest(
        subscriptionEvent({
          eventId: 'evt_sub_2',
          eventType: 'subscription.updated',
          scheduledChange: {
            action: 'cancel',
            effective_at: '2026-08-03T00:00:00Z',
          },
        }),
      ),
    );

    await POST(
      paddleWebhookRequest(
        subscriptionEvent({
          eventId: 'evt_sub_3',
          eventType: 'subscription.updated',
          scheduledChange: null,
        }),
      ),
    );

    expect((await userById(user.id)).subscriptionEndsAt).toBeNull();
  });

  it('ignores a scheduled pause when setting the end date', async () => {
    const { user } = await createMember();
    await POST(paddleWebhookRequest(subscriptionEvent({ userId: user.id })));

    await POST(
      paddleWebhookRequest(
        subscriptionEvent({
          eventId: 'evt_sub_2',
          eventType: 'subscription.updated',
          scheduledChange: {
            action: 'pause',
            effective_at: '2026-08-03T00:00:00Z',
          },
        }),
      ),
    );

    expect((await userById(user.id)).subscriptionEndsAt).toBeNull();
  });

  it('ignores a duplicate event_id without reapplying it', async () => {
    const { user } = await createMember();
    await POST(paddleWebhookRequest(subscriptionEvent({ userId: user.id })));
    const replay = subscriptionEvent({
      status: 'canceled',
      userId: user.id,
    });
    const response = await POST(paddleWebhookRequest(replay));
    expect(response.status).toBe(200);
    const updated = await userById(user.id);
    expect(updated.plan).toBe('paid');
    expect(updated.subscriptionStatus).toBe('active');
    expect(await db.select().from(webhookEvents)).toHaveLength(1);
  });

  it('cancels a subscription matched by stored customer id', async () => {
    const { user } = await createMember();
    await POST(paddleWebhookRequest(subscriptionEvent({ userId: user.id })));
    const response = await POST(
      paddleWebhookRequest(
        subscriptionEvent({
          eventId: 'evt_sub_2',
          eventType: 'subscription.canceled',
          status: 'canceled',
        }),
      ),
    );
    expect(response.status).toBe(200);
    const updated = await userById(user.id);
    expect(updated.plan).toBe('free');
    expect(updated.subscriptionStatus).toBe('canceled');
  });

  it('keeps a past_due subscriber on the paid plan (dunning grace)', async () => {
    const { user } = await createMember();
    await POST(paddleWebhookRequest(subscriptionEvent({ userId: user.id })));
    const response = await POST(
      paddleWebhookRequest(
        subscriptionEvent({
          eventId: 'evt_sub_2',
          eventType: 'subscription.past_due',
          status: 'past_due',
        }),
      ),
    );
    expect(response.status).toBe(200);
    const updated = await userById(user.id);
    expect(updated.plan).toBe('paid');
    expect(updated.subscriptionStatus).toBe('past_due');
  });

  it('grants lifetime paid on a completed lifetime transaction', async () => {
    const { user } = await createMember();
    const event = {
      event_id: 'evt_txn_1',
      event_type: 'transaction.completed',
      data: {
        id: 'txn_1',
        customer_id: 'ctm_9',
        custom_data: { userId: user.id },
        items: [{ price: { id: 'pri_lifetime_test' } }],
      },
    };
    const response = await POST(paddleWebhookRequest(event));
    expect(response.status).toBe(200);
    const updated = await userById(user.id);
    expect(updated.plan).toBe('paid');
    expect(updated.subscriptionStatus).toBeNull();
    expect(updated.paddleCustomerId).toBe('ctm_9');
  });

  it('ignores a completed transaction for a non-lifetime price', async () => {
    const { user } = await createMember();
    const event = {
      event_id: 'evt_txn_2',
      event_type: 'transaction.completed',
      data: {
        id: 'txn_2',
        customer_id: 'ctm_9',
        custom_data: { userId: user.id },
        items: [{ price: { id: 'pri_annual_test' } }],
      },
    };
    const response = await POST(paddleWebhookRequest(event));
    expect(response.status).toBe(200);
    expect((await userById(user.id)).plan).toBe('free');
  });

  it('acknowledges unknown event types without touching users', async () => {
    const { user } = await createMember();
    const event = {
      event_id: 'evt_misc_1',
      event_type: 'address.updated',
      data: { id: 'add_1', customer_id: 'ctm_1' },
    };
    const response = await POST(paddleWebhookRequest(event));
    expect(response.status).toBe(200);
    expect((await userById(user.id)).plan).toBe('free');
  });

  it('acknowledges events that match no user', async () => {
    const response = await POST(
      paddleWebhookRequest(
        subscriptionEvent({ userId: 'b8b7f0a2-0000-4000-8000-000000000000' }),
      ),
    );
    expect(response.status).toBe(200);
  });

  it('acknowledges a non-uuid custom_data userId without crashing', async () => {
    const response = await POST(
      paddleWebhookRequest(subscriptionEvent({ userId: 'not-a-uuid' })),
    );
    expect(response.status).toBe(200);
  });

  it('ignores a subscription status outside the known set', async () => {
    const { user } = await createMember();
    const response = await POST(
      paddleWebhookRequest(
        subscriptionEvent({ status: 'imported', userId: user.id }),
      ),
    );
    expect(response.status).toBe(200);
    expect((await userById(user.id)).plan).toBe('free');
  });
});
