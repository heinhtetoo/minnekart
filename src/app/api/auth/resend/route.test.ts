import { beforeEach, describe, expect, it } from 'vitest';

import { clearMemoryInbox, readMemoryInbox } from '@/lib/email';

import { POST } from './route';

import { createMemberWithSession } from '../../../../../test/auth-fixtures';
import { resetDb } from '../../../../../test/db';
import { cookieHeader, postRequest } from '../../../../../test/http';

const url = 'http://test/api/auth/resend';

beforeEach(async () => {
  await resetDb();
  clearMemoryInbox();
});

describe('POST /api/auth/resend', () => {
  it('sends a fresh code to an unverified member', async () => {
    const { sessionToken } = await createMemberWithSession();

    const response = await POST(
      postRequest(url, {}, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(200);
    expect(readMemoryInbox()).toHaveLength(1);
  });

  it('throttles a rapid second resend', async () => {
    const { sessionToken } = await createMemberWithSession();
    await POST(postRequest(url, {}, cookieHeader(sessionToken)));

    const second = await POST(postRequest(url, {}, cookieHeader(sessionToken)));

    expect(second.status).toBe(429);
    expect(readMemoryInbox()).toHaveLength(1);
  });

  it('does nothing for an already verified member', async () => {
    const { sessionToken } = await createMemberWithSession({ verified: true });

    const response = await POST(
      postRequest(url, {}, cookieHeader(sessionToken)),
    );

    expect(response.status).toBe(400);
    expect(readMemoryInbox()).toHaveLength(0);
  });
});
