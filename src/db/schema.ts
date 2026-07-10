import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['owner', 'member']);
export const authTokenType = pgEnum('auth_token_type', ['verify_otp', 'reset']);
export const userPlan = pgEnum('user_plan', ['free', 'paid']);
export const subscriptionStatus = pgEnum('subscription_status', [
  'active',
  'trialing',
  'past_due',
  'paused',
  'canceled',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  role: userRole('role').notNull().default('member'),
  globePublic: boolean('globe_public').notNull().default(false),
  plan: userPlan('plan').notNull().default('free'),
  subscriptionStatus: subscriptionStatus('subscription_status'),
  paddleCustomerId: text('paddle_customer_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: authTokenType('type').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('auth_tokens_user_id_type_idx').on(table.userId, table.type),
  ],
);

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  note: text('note'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedBy: uuid('used_by').references(() => users.id),
  usedAt: timestamp('used_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    placeName: text('place_name').notNull(),
    country: text('country').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    dateStart: date('date_start').notNull(),
    dateEnd: date('date_end'),
    highlight: text('highlight'),
    story: text('story'),
    isPublic: boolean('is_public').notNull().default(false),
    isFeatured: boolean('is_featured').notNull().default(false),
    shareToken: text('share_token').unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('trips_user_id_idx').on(table.userId)],
);

export const photos = pgTable(
  'photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayKey: text('display_key').notNull(),
    thumbKey: text('thumb_key').notNull(),
    originalKey: text('original_key'),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    takenAt: timestamp('taken_at', { withTimezone: true }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('photos_trip_id_idx').on(table.tripId),
    index('photos_user_id_idx').on(table.userId),
  ],
);

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(1),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
