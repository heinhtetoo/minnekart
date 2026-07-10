import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { invites, rateLimits, users } from '@/db/schema';
import { clearMemoryInbox, readMemoryInbox } from '@/lib/email';

import { POST } from './route';

import { createOwnerWithInvite } from '../../../../../test/auth-fixtures';
import { resetDb, testDb } from '../../../../../test/db';
import {
  jsonRequest,
  postRequest,
  sessionCookieFrom,
} from '../../../../../test/http';

const state = vi.hoisted(() => ({
  turnstileSecret: undefined as string | undefined,
}));

vi.mock('@/lib/auth/signup-mode', () => ({
  openSignupEnabled: () => true,
  turnstileSecret: () => state.turnstileSecret,
}));

const db = testDb();
const url = 'http://test/api/auth/signup';
const DAY_MS = 24 * 60 * 60 * 1000;

function signupBody(overrides: Record<string, unknown> = {}) {
  return {
    email: 'openuser@example.com',
    username: 'openuser',
    name: 'Open User',
    password: 'a-strong-password',
    ...overrides,
  };
}

function dayWindowStart(): Date {
  return new Date(Math.floor(Date.now() / DAY_MS) * DAY_MS);
}

beforeEach(async () => {
  await resetDb();
  clearMemoryInbox();
  state.turnstileSecret = undefined;
});

describe('POST /api/auth/signup with open signup enabled', () => {
  it('creates a free user without an invite', async () => {
    const response = await POST(postRequest(url, signupBody()));

    expect(response.status).toBe(201);
    expect(sessionCookieFrom(response)).toBeTruthy();

    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'openuser@example.com'));
    expect(created.plan).toBe('free');
    expect(created.emailVerifiedAt).toBeNull();
    expect(await db.select().from(invites)).toHaveLength(0);

    const inbox = readMemoryInbox();
    expect(inbox).toHaveLength(1);
    expect(inbox[0].text).toMatch(/\d{6}/);
  });

  it('still consumes an invite when one is provided', async () => {
    const { inviteToken } = await createOwnerWithInvite();

    const response = await POST(
      postRequest(url, signupBody({ invite: inviteToken })),
    );

    expect(response.status).toBe(201);
    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'openuser@example.com'));
    const [invite] = await db.select().from(invites);
    expect(invite.usedBy).toBe(created.id);
  });

  it('rejects a provided invite that is not usable', async () => {
    const response = await POST(
      postRequest(url, signupBody({ invite: 'bogus-token' })),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('invalid_invite');
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('requires a captcha token when Turnstile is configured', async () => {
    state.turnstileSecret = 'secret-1';

    const response = await POST(postRequest(url, signupBody()));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('captcha_failed');
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('enforces the per-IP daily quota', async () => {
    await db.insert(rateLimits).values({
      key: 'signup-day:203.0.113.7',
      windowStart: dayWindowStart(),
      count: 20,
    });

    const response = await POST(postRequest(url, signupBody()));

    expect(response.status).toBe(429);
    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('enforces the global daily quota across IPs', async () => {
    await db.insert(rateLimits).values({
      key: 'signup-global',
      windowStart: dayWindowStart(),
      count: 100,
    });

    const response = await POST(
      jsonRequest('POST', url, signupBody(), {
        'x-forwarded-for': '198.51.100.9',
      }),
    );

    expect(response.status).toBe(429);
    expect(await db.select().from(users)).toHaveLength(0);
  });
});
