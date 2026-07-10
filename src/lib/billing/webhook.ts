import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { DatabaseExecutor } from '@/db';
import { subscriptionStatus, users, webhookEvents } from '@/db/schema';

type SubscriptionStatus = (typeof subscriptionStatus.enumValues)[number];

const PLAN_BY_STATUS: Record<SubscriptionStatus, 'free' | 'paid'> = {
  active: 'paid',
  trialing: 'paid',
  past_due: 'paid',
  paused: 'free',
  canceled: 'free',
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const eventSchema = z.object({
  event_id: z.string().min(1),
  event_type: z.string().min(1),
  data: z.object({
    id: z.string().optional(),
    status: z.string().optional(),
    customer_id: z.string().optional(),
    custom_data: z
      .object({ userId: z.string().optional() })
      .nullish()
      .catch(null),
    items: z
      .array(z.object({ price: z.object({ id: z.string() }).optional() }))
      .optional()
      .catch(undefined),
  }),
});

export type PaddleEvent = z.infer<typeof eventSchema>;

export function parsePaddleEvent(payload: unknown): PaddleEvent | null {
  const parsed = eventSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function recordEvent(
  database: DatabaseExecutor,
  event: PaddleEvent,
): Promise<boolean> {
  const inserted = await database
    .insert(webhookEvents)
    .values({ eventId: event.event_id, eventType: event.event_type })
    .onConflictDoNothing()
    .returning();
  return inserted.length > 0;
}

async function findUserId(
  database: DatabaseExecutor,
  event: PaddleEvent,
): Promise<string | null> {
  const customUserId = event.data.custom_data?.userId;
  if (customUserId && UUID_PATTERN.test(customUserId)) {
    const [user] = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, customUserId));
    if (user) {
      return user.id;
    }
  }
  const customerId = event.data.customer_id;
  if (customerId) {
    const [user] = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.paddleCustomerId, customerId));
    if (user) {
      return user.id;
    }
  }
  return null;
}

function isKnownStatus(status: string): status is SubscriptionStatus {
  return (subscriptionStatus.enumValues as readonly string[]).includes(status);
}

async function updateBilling(
  database: DatabaseExecutor,
  userId: string,
  fields: {
    plan: 'free' | 'paid';
    subscriptionStatus: SubscriptionStatus | null;
    customerId?: string;
  },
): Promise<void> {
  await database
    .update(users)
    .set({
      plan: fields.plan,
      subscriptionStatus: fields.subscriptionStatus,
      ...(fields.customerId ? { paddleCustomerId: fields.customerId } : {}),
    })
    .where(eq(users.id, userId));
}

export async function applyEvent(
  database: DatabaseExecutor,
  event: PaddleEvent,
  lifetimePriceId?: string,
): Promise<void> {
  if (event.event_type.startsWith('subscription.')) {
    const status = event.data.status;
    if (!status || !isKnownStatus(status)) {
      return;
    }
    const userId = await findUserId(database, event);
    if (!userId) {
      return;
    }
    await updateBilling(database, userId, {
      plan: PLAN_BY_STATUS[status],
      subscriptionStatus: status,
      customerId: event.data.customer_id,
    });
    return;
  }
  if (event.event_type === 'transaction.completed') {
    const boughtLifetime =
      lifetimePriceId !== undefined &&
      (event.data.items ?? []).some(
        (item) => item.price?.id === lifetimePriceId,
      );
    if (!boughtLifetime) {
      return;
    }
    const userId = await findUserId(database, event);
    if (!userId) {
      return;
    }
    await updateBilling(database, userId, {
      plan: 'paid',
      subscriptionStatus: null,
      customerId: event.data.customer_id,
    });
  }
}
