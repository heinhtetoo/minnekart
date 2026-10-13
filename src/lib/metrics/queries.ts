import { and, eq, gte, sql } from 'drizzle-orm';

import { DatabaseExecutor } from '@/db';
import { photos, planEvents, trips, users } from '@/db/schema';
import { FREE_TRIP_LIMIT } from '@/lib/billing/limits';

// Product metrics computed from data the app already holds. No collection, no
// third-party script, nothing that contradicts the published "no analytics"
// claim — these are questions asked of rows that were always there, which also
// means a question asked today can look at last March.

const DAY_MS = 24 * 60 * 60 * 1000;

// Members only. The owner account would skew every rate on a small base, and
// it isn't a customer.
const isMember = eq(users.role, 'member');

export interface PlanMix {
  free: number;
  // Paying, on a live Paddle subscription.
  subscriber: number;
  // Bought the one-off founding-member price: paid, with a Paddle customer
  // record but no subscription to manage.
  foundingMember: number;
  // Migration 0002 backfilled every pre-existing user to paid. They pay
  // nothing and never converted, so counting them as paid makes conversion
  // look spectacular and mean nothing.
  grandfathered: number;
}

export async function planMix(database: DatabaseExecutor): Promise<PlanMix> {
  const [row] = await database
    .select({
      free: sql<number>`count(*) filter (where ${users.plan} = 'free')::int`,
      subscriber: sql<number>`
        count(*) filter (where ${users.paddleSubscriptionId} is not null)::int`,
      foundingMember: sql<number>`
        count(*) filter (
          where ${users.paddleCustomerId} is not null
            and ${users.paddleSubscriptionId} is null
        )::int`,
      grandfathered: sql<number>`
        count(*) filter (
          where ${users.plan} = 'paid' and ${users.paddleCustomerId} is null
        )::int`,
    })
    .from(users)
    .where(isMember);
  return row;
}

export interface ActivationStats {
  signups: number;
  activated: number;
  rate: number | null;
}

// Activation: a first memory within 24h of signing up. The question is whether
// someone got far enough to see what the product is for, so it is deliberately
// first-trip and not first-login.
export async function activation(
  database: DatabaseExecutor,
  withinMs: number = DAY_MS,
): Promise<ActivationStats> {
  // Counted over distinct users: the join multiplies rows for anyone who added
  // several memories in the window, which would inflate both sides.
  const [row] = await database
    .select({
      signups: sql<number>`count(distinct ${users.id})::int`,
      activated: sql<number>`
        count(distinct ${users.id}) filter (
          where ${trips.createdAt} is not null
        )::int`,
    })
    .from(users)
    .leftJoin(
      trips,
      and(
        eq(trips.userId, users.id),
        sql`${trips.createdAt} <= ${users.createdAt} + make_interval(secs => ${
          withinMs / 1000
        })`,
      ),
    )
    .where(isMember);

  const { signups, activated } = row;
  return {
    signups,
    activated,
    rate: signups === 0 ? null : activated / signups,
  };
}

export interface CapPressure {
  atCap: number;
  atCapAndPaid: number;
}

// How many people ran into the free ceiling, and how many of those are paying.
// Correlation only: nothing here proves the cap caused the upgrade, because
// the cap is not what plan_events records.
export async function capPressure(
  database: DatabaseExecutor,
): Promise<CapPressure> {
  const counts = database
    .select({
      userId: trips.userId,
      tripCount: sql<number>`count(*)::int`.as('trip_count'),
    })
    .from(trips)
    .groupBy(trips.userId)
    .as('counts');

  const [row] = await database
    .select({
      atCap: sql<number>`count(*)::int`,
      atCapAndPaid: sql<number>`
        count(*) filter (where ${users.plan} = 'paid')::int`,
    })
    .from(counts)
    .innerJoin(users, eq(users.id, counts.userId))
    .where(and(isMember, gte(counts.tripCount, FREE_TRIP_LIMIT)));
  return row;
}

export interface Depth {
  medianTrips: number;
  medianPhotos: number;
}

// Median rather than mean: one person backfilling a decade would drag an
// average somewhere useless.
//
// Counts come from joined derived tables rather than correlated subqueries
// written inline. Drizzle only qualifies column names for tables it knows are
// in the query's FROM/JOIN graph — a table referenced only inside a raw `sql`
// subquery gets bare names, so `trips.user_id = users.id` silently rendered as
// `"user_id" = "id"` and compared trips to itself.
export async function depth(database: DatabaseExecutor): Promise<Depth> {
  const tripCounts = database
    .select({
      userId: trips.userId,
      tripCount: sql<number>`count(*)::int`.as('trip_count'),
    })
    .from(trips)
    .groupBy(trips.userId)
    .as('trip_counts');

  const photoCounts = database
    .select({
      userId: photos.userId,
      photoCount: sql<number>`count(*)::int`.as('photo_count'),
    })
    .from(photos)
    .groupBy(photos.userId)
    .as('photo_counts');

  const [row] = await database
    .select({
      medianTrips: sql<number>`
        coalesce(percentile_cont(0.5) within group (
          order by coalesce(${tripCounts.tripCount}, 0)
        ), 0)::float`,
      medianPhotos: sql<number>`
        coalesce(percentile_cont(0.5) within group (
          order by coalesce(${photoCounts.photoCount}, 0)
        ), 0)::float`,
    })
    .from(users)
    .leftJoin(tripCounts, eq(tripCounts.userId, users.id))
    .leftJoin(photoCounts, eq(photoCounts.userId, users.id))
    .where(isMember);
  return row;
}

export interface Retention {
  eligible: number;
  returned: number;
  rate: number | null;
}

// Activity retention, NOT login retention — and the distinction matters when
// reading the number. Sessions carry a sliding 30-day expiry renewed in place,
// so session rows are updated rather than appended and logged-out sessions are
// deleted outright: they cannot answer "did they come back". Creating a memory
// or a photo can, and is closer to what the product is for anyway.
export async function activityRetention(
  database: DatabaseExecutor,
  afterDays = 30,
): Promise<Retention> {
  // Last activity per user via joined derived tables — see the note on depth()
  // for why this isn't a correlated subquery inside a template.
  const lastTrip = database
    .select({
      userId: trips.userId,
      at: sql<Date>`max(${trips.createdAt})`.as('last_trip_at'),
    })
    .from(trips)
    .groupBy(trips.userId)
    .as('last_trip');

  const lastPhoto = database
    .select({
      userId: photos.userId,
      at: sql<Date>`max(${photos.createdAt})`.as('last_photo_at'),
    })
    .from(photos)
    .groupBy(photos.userId)
    .as('last_photo');

  const eligibleFilter = sql`
    ${users.createdAt} <= now() - make_interval(days => ${afterDays})`;
  const cutoff = sql`${users.createdAt} + make_interval(days => ${afterDays})`;

  const [row] = await database
    .select({
      eligible: sql<number>`count(*) filter (where ${eligibleFilter})::int`,
      returned: sql<number>`
        count(*) filter (
          where ${eligibleFilter}
            and greatest(
              coalesce(${lastTrip.at}, '-infinity'::timestamptz),
              coalesce(${lastPhoto.at}, '-infinity'::timestamptz)
            ) >= ${cutoff}
        )::int`,
    })
    .from(users)
    .leftJoin(lastTrip, eq(lastTrip.userId, users.id))
    .leftJoin(lastPhoto, eq(lastPhoto.userId, users.id))
    .where(isMember);

  const { eligible, returned } = row;
  return {
    eligible,
    returned,
    rate: eligible === 0 ? null : returned / eligible,
  };
}

export interface Conversion {
  // Null when nothing has been recorded yet — distinct from a real zero, and
  // the report must say so rather than print 0%.
  recorded: number;
  converted: number;
  eligible: number;
  rate: number | null;
  medianDaysToConvert: number | null;
}

// Conversion over users who could actually convert: the grandfathered cohort
// is excluded, since they were moved to paid by a migration and never made a
// decision.
export async function conversion(
  database: DatabaseExecutor,
): Promise<Conversion> {
  const [recordedRow] = await database
    .select({ recorded: sql<number>`count(*)::int` })
    .from(planEvents);

  const [eligibleRow] = await database
    .select({ eligible: sql<number>`count(*)::int` })
    .from(users)
    .where(
      and(
        isMember,
        // Not grandfathered: either still free, or paid via Paddle.
        sql`(${users.plan} = 'free' or ${users.paddleCustomerId} is not null)`,
      ),
    );

  const firstUpgrade = database
    .select({
      userId: planEvents.userId,
      convertedAt: sql<Date>`min(${planEvents.createdAt})`.as('converted_at'),
    })
    .from(planEvents)
    .where(eq(planEvents.toPlan, 'paid'))
    .groupBy(planEvents.userId)
    .as('first_upgrade');

  const [convertedRow] = await database
    .select({
      converted: sql<number>`count(*)::int`,
      medianDays: sql<number | null>`
        percentile_cont(0.5) within group (
          order by extract(epoch from (${firstUpgrade.convertedAt} - ${users.createdAt})) / 86400
        )::float`,
    })
    .from(firstUpgrade)
    .innerJoin(users, eq(users.id, firstUpgrade.userId))
    .where(isMember);

  const { recorded } = recordedRow;
  const { eligible } = eligibleRow;
  const { converted, medianDays } = convertedRow;

  return {
    recorded,
    converted,
    eligible,
    rate: eligible === 0 ? null : converted / eligible,
    medianDaysToConvert: converted === 0 ? null : medianDays,
  };
}

export interface MetricsReport {
  planMix: PlanMix;
  activation: ActivationStats;
  capPressure: CapPressure;
  depth: Depth;
  retention: Retention;
  conversion: Conversion;
}

export async function collectMetrics(
  database: DatabaseExecutor,
): Promise<MetricsReport> {
  return {
    planMix: await planMix(database),
    activation: await activation(database),
    capPressure: await capPressure(database),
    depth: await depth(database),
    retention: await activityRetention(database),
    conversion: await conversion(database),
  };
}
