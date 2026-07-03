import { beforeEach, describe, expect, it } from 'vitest';

import { clearMemoryInbox, readMemoryInbox } from '@/lib/email';

import { POST } from './route';

import { createMember } from '../../../../../test/auth-fixtures';
import { resetDb } from '../../../../../test/db';
import { postRequest } from '../../../../../test/http';

const url = 'http://test/api/auth/forgot';

beforeEach(async () => {
  await resetDb();
  clearMemoryInbox();
});

describe('POST /api/auth/forgot', () => {
  it('emails a reset link to a known address', async () => {
    await createMember({ verified: true });

    const response = await POST(
      postRequest(url, { email: 'member@example.com' }),
    );

    expect(response.status).toBe(200);
    const inbox = readMemoryInbox();
    expect(inbox).toHaveLength(1);
    expect(inbox[0].text).toContain('/reset?token=');
  });

  it('returns 200 but sends nothing for an unknown address', async () => {
    const response = await POST(
      postRequest(url, { email: 'nobody@example.com' }),
    );

    expect(response.status).toBe(200);
    expect(readMemoryInbox()).toHaveLength(0);
  });
});
