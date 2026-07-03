import { beforeEach, describe, expect, it } from 'vitest';

import { POST } from './route';

import { createMember } from '../../../../../test/auth-fixtures';
import { resetDb } from '../../../../../test/db';
import { postRequest, sessionCookieFrom } from '../../../../../test/http';

const url = 'http://test/api/auth/login';

beforeEach(async () => {
  await resetDb();
});

describe('POST /api/auth/login', () => {
  it('sets a session cookie on correct credentials', async () => {
    await createMember({ verified: true });

    const response = await POST(
      postRequest(url, {
        email: 'member@example.com',
        password: 'a-strong-password',
      }),
    );

    expect(response.status).toBe(200);
    expect(sessionCookieFrom(response)).toBeTruthy();
  });

  it('rejects a wrong password with a generic 401', async () => {
    await createMember({ verified: true });

    const response = await POST(
      postRequest(url, {
        email: 'member@example.com',
        password: 'wrong-password',
      }),
    );

    expect(response.status).toBe(401);
    expect(sessionCookieFrom(response)).toBeNull();
  });

  it('rejects an unknown email with the same generic 401', async () => {
    const response = await POST(
      postRequest(url, {
        email: 'nobody@example.com',
        password: 'whatever-password',
      }),
    );

    expect(response.status).toBe(401);
  });

  it('locks the account after five failed attempts', async () => {
    await createMember({ verified: true });
    const body = {
      email: 'member@example.com',
      password: 'wrong-password',
    };

    for (let i = 0; i < 5; i += 1) {
      await POST(postRequest(url, body));
    }

    const response = await POST(
      postRequest(url, {
        email: 'member@example.com',
        password: 'a-strong-password',
      }),
    );
    expect(response.status).toBe(429);
  });
});
